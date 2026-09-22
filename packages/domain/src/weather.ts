import type {
  Season,
  WeatherDefinitions,
  WeatherKind,
  WeatherModifierDefinition,
  WeatherState,
} from "./world.types.js";

const SEASONS: readonly Season[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
const SEVERE_WEATHER = new Set<WeatherKind>([
  "THUNDERSTORM",
  "WINDSTORM",
  "HEAVY_SNOW",
  "SEVERE_STORM",
]);

const NEUTRAL_MODIFIER: WeatherModifierDefinition = {
  citizenPowerMult: 1,
  citizenWaterMult: 1,
  travelCostMult: 1,
  outdoorActivityMult: 1,
  civilianTrafficMult: 1,
};

export interface WeatherEpisodeStart {
  season: Season;
  current: WeatherKind;
  episodeIndex: number;
  episodeSeed: number;
  startedAtSimulationSeconds: number;
}

export interface WeatherAdvanceResult {
  weather: WeatherState | undefined;
  startedEpisodes: WeatherEpisodeStart[];
}

function hashText(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function random01(seed: number, episodeIndex: number, salt: string): number {
  return hashText(`${seed}:${episodeIndex}:${salt}`) / 4294967296;
}

function seasonAt(
  simulationSeconds: number,
  durationSeconds: number,
): { season: Season; progress: number } {
  const duration = Math.max(1, durationSeconds);
  const elapsed = Math.max(0, simulationSeconds);
  const seasonNumber = Math.floor(elapsed / duration);
  const season = SEASONS[seasonNumber % SEASONS.length]!;
  const progress = (elapsed % duration) / duration;
  return { season, progress };
}

function isSevere(kind: WeatherKind): boolean {
  return SEVERE_WEATHER.has(kind);
}

function allowedCandidate(
  previous: WeatherKind | undefined,
  candidate: WeatherKind,
  severeCooldownRemainingSeconds: number,
): boolean {
  if (isSevere(candidate) && severeCooldownRemainingSeconds > 0) return false;

  if (
    candidate === "SEVERE_STORM" &&
    (previous === "CLEAR" || previous === "PARTLY_CLOUDY")
  ) {
    return false;
  }

  return true;
}

function chooseWeather(
  definitions: WeatherDefinitions,
  climateSeed: number,
  episodeIndex: number,
  season: Season,
  previous: WeatherKind | undefined,
  severeCooldownRemainingSeconds: number,
): WeatherKind {
  const weights = definitions.seasonWeights[season];
  const candidates = Object.entries(weights)
    .flatMap(([key, weight]) => {
      const kind = key as WeatherKind;
      return typeof weight === "number" &&
        weight > 0 &&
        allowedCandidate(previous, kind, severeCooldownRemainingSeconds)
        ? [{ kind, weight }]
        : [];
    });

  if (candidates.length === 0) return "CLEAR";

  const total = candidates.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random01(climateSeed, episodeIndex, "weather") * total;
  for (const candidate of candidates) {
    cursor -= candidate.weight;
    if (cursor <= 0) return candidate.kind;
  }
  return candidates.at(-1)!.kind;
}

function episodeDurationSeconds(
  definitions: WeatherDefinitions,
  climateSeed: number,
  episodeIndex: number,
  weather: WeatherKind,
): number {
  const severe = isSevere(weather);
  const min = severe
    ? definitions.severeEpisodeMinSeconds
    : definitions.normalEpisodeMinSeconds;
  const max = severe
    ? definitions.severeEpisodeMaxSeconds
    : definitions.normalEpisodeMaxSeconds;
  const low = Math.max(1, Math.min(min, max));
  const high = Math.max(low, Math.max(min, max));
  const t = random01(climateSeed, episodeIndex, "duration");
  return low + (high - low) * t;
}

function nextEpisode(
  definitions: WeatherDefinitions,
  climateSeed: number,
  episodeIndex: number,
  simulationSeconds: number,
  previous: WeatherKind | undefined,
  severeCooldownRemainingSeconds: number,
): WeatherState {
  const { season, progress } = seasonAt(
    simulationSeconds,
    definitions.seasonDurationSeconds,
  );
  const current = chooseWeather(
    definitions,
    climateSeed,
    episodeIndex,
    season,
    previous,
    severeCooldownRemainingSeconds,
  );
  const episodeSeed = hashText(
    `${climateSeed}:${episodeIndex}:${season}:${current}`,
  );

  return {
    season,
    seasonProgress: progress,
    climateSeed,
    current,
    episodeIndex,
    episodeSeed,
    episodeRemainingSeconds: episodeDurationSeconds(
      definitions,
      climateSeed,
      episodeIndex,
      current,
    ),
    severeCooldownRemainingSeconds,
  };
}

export function createWeatherState(
  climateSeed: number,
  simulationSeconds: number,
  definitions: WeatherDefinitions,
): WeatherState {
  return nextEpisode(
    definitions,
    climateSeed,
    0,
    simulationSeconds,
    undefined,
    0,
  );
}

export function advanceWeatherWithEpisodes(
  input: WeatherState | undefined,
  climateSeed: number,
  simulationStartSeconds: number,
  deltaSeconds: number,
  definitions: WeatherDefinitions | undefined,
): WeatherAdvanceResult {
  if (!definitions) {
    return { weather: input, startedEpisodes: [] };
  }
  if (deltaSeconds <= 0) {
    return {
      weather:
        input ?? createWeatherState(climateSeed, simulationStartSeconds, definitions),
      startedEpisodes: [],
    };
  }

  let state =
    input ?? createWeatherState(climateSeed, simulationStartSeconds, definitions);
  let remaining = deltaSeconds;
  let simulated = simulationStartSeconds;
  const startedEpisodes: WeatherEpisodeStart[] = [];

  while (remaining > 0) {
    const episodeRemaining = Math.max(0.001, state.episodeRemainingSeconds);
    const step = Math.min(remaining, episodeRemaining);

    remaining -= step;
    simulated += step;

    state = {
      ...state,
      episodeRemainingSeconds: Math.max(
        0,
        state.episodeRemainingSeconds - step,
      ),
      severeCooldownRemainingSeconds: Math.max(
        0,
        state.severeCooldownRemainingSeconds - step,
      ),
    };

    const season = seasonAt(simulated, definitions.seasonDurationSeconds);
    state = {
      ...state,
      season: season.season,
      seasonProgress: season.progress,
    };

    if (state.episodeRemainingSeconds <= 0.001) {
      const nextCooldown = isSevere(state.current)
        ? Math.max(
            state.severeCooldownRemainingSeconds,
            definitions.severeCooldownSeconds,
          )
        : state.severeCooldownRemainingSeconds;
      state = nextEpisode(
        definitions,
        state.climateSeed,
        state.episodeIndex + 1,
        simulated,
        state.current,
        nextCooldown,
      );
      startedEpisodes.push({
        season: state.season,
        current: state.current,
        episodeIndex: state.episodeIndex,
        episodeSeed: state.episodeSeed,
        startedAtSimulationSeconds: simulated,
      });
    }
  }

  return { weather: state, startedEpisodes };
}

export function advanceWeather(
  input: WeatherState | undefined,
  climateSeed: number,
  simulationStartSeconds: number,
  deltaSeconds: number,
  definitions: WeatherDefinitions | undefined,
): WeatherState | undefined {
  return advanceWeatherWithEpisodes(
    input,
    climateSeed,
    simulationStartSeconds,
    deltaSeconds,
    definitions,
  ).weather;
}

export function weatherModifier(
  weather: WeatherState | undefined,
  definitions: WeatherDefinitions | undefined,
): WeatherModifierDefinition {
  if (!weather || !definitions) return NEUTRAL_MODIFIER;
  return definitions.modifiers[weather.current] ?? NEUTRAL_MODIFIER;
}

export function isSevereWeather(kind: WeatherKind): boolean {
  return isSevere(kind);
}
