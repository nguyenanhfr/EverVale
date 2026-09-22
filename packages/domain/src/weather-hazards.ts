import { clamp } from "@evervale/shared-kernel/clamp";
import type { WeatherEpisodeStart } from "./weather.js";
import type {
  IncidentDefinition,
  SimulationDefinitions,
  WeatherHazardTag,
  WorldState,
} from "./world.types.js";

const SUPPORTED_M1_HAZARDS = new Set<WeatherHazardTag>([
  "lightning_fire",
  "storm_damage",
  "generator_fault",
]);

function hashText(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function random01(seed: number, salt: string): number {
  return hashText(`${seed}:${salt}`) / 4294967296;
}

function eventSeverity(incident: IncidentDefinition): number {
  switch (incident.severity) {
    case "high":
      return 2;
    case "medium":
      return 1;
    default:
      return 0;
  }
}

function happenedAt(
  world: WorldState,
  startedAtSimulationSeconds: number,
): string {
  const start = Date.parse(world.lastSimulatedAt);
  if (!Number.isFinite(start)) return world.lastSimulatedAt;
  const speed = Math.max(1, world.speed);
  const simulationOffset = Math.max(
    0,
    startedAtSimulationSeconds - world.simulationSeconds,
  );
  return new Date(start + (simulationOffset / speed) * 1000).toISOString();
}

function damageFor(
  incident: IncidentDefinition,
  episodeSeed: number,
  tag: WeatherHazardTag,
): number {
  const low = Math.max(0, incident.conditionDamageMin ?? 0);
  const high = Math.max(low, incident.conditionDamageMax ?? low);
  const t = random01(episodeSeed, `${tag}:damage`);
  return Math.round(low + (high - low) * t);
}

function summaryFor(
  tag: WeatherHazardTag,
  definitionId: string,
): string {
  const subject = definitionId.replaceAll("_", " ");
  switch (tag) {
    case "lightning_fire":
      return `Lightning fire damaged ${subject}.`;
    case "generator_fault":
      return `A storm-related generator fault damaged ${subject}.`;
    case "storm_damage":
      return `Storm damage affected ${subject}.`;
    default:
      return `Weather incident affected ${subject}.`;
  }
}

function applyConditionIncident(
  world: WorldState,
  episode: WeatherEpisodeStart,
  tag: WeatherHazardTag,
  incident: IncidentDefinition,
): WorldState {
  const eventId = `weather-${episode.episodeSeed}-${tag}`;
  if (world.events.some((event) => event.id === eventId)) return world;

  const eligible = world.buildings
    .filter(
      (building) =>
        building.constructionState === "COMPLETE" &&
        building.damageState !== "DISABLED" &&
        building.damageState !== "REPAIRING" &&
        building.condition > 10 &&
        incident.eligible.includes(building.definitionId),
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  if (eligible.length === 0) return world;

  const target =
    eligible[
      Math.floor(random01(episode.episodeSeed, `${tag}:target`) * eligible.length)
    ]!;
  const damage = damageFor(incident, episode.episodeSeed, tag);
  if (damage <= 0) return world;

  const nextCondition = clamp(target.condition - damage, 10, 100);
  const nextDamageState = nextCondition <= 15 ? "DISABLED" : "DAMAGED";

  return {
    ...world,
    buildings: world.buildings.map((building) =>
      building.id === target.id
        ? {
            ...building,
            condition: nextCondition,
            damageState: nextDamageState,
            repairRemainingSeconds: 0,
          }
        : building,
    ),
    events: [
      ...world.events.slice(-49),
      {
        id: eventId,
        type: `WEATHER_${tag.toUpperCase()}`,
        happenedAt: happenedAt(world, episode.startedAtSimulationSeconds),
        severity: eventSeverity(incident),
        summary: summaryFor(tag, target.definitionId),
      },
    ],
  };
}

export function applyWeatherHazards(
  input: WorldState,
  episodes: readonly WeatherEpisodeStart[],
  definitions: SimulationDefinitions,
  realDeltaSeconds: number,
): WorldState {
  const weatherDefinitions = definitions.weather;
  const incidents = definitions.incidents;
  if (!weatherDefinitions || !incidents || episodes.length === 0) return input;

  const perDayCap = Math.max(
    0,
    weatherDefinitions.maxOfflineWeatherHazardsPer24h,
  );
  if (perDayCap <= 0) return input;

  const elapsedDays = Math.max(
    1,
    Math.ceil(Math.max(0, realDeltaSeconds) / 86400),
  );
  const incidentCap = perDayCap * elapsedDays;

  let world = input;
  let applied = 0;

  for (const episode of episodes) {
    if (applied >= incidentCap) break;
    const tags =
      weatherDefinitions.modifiers[episode.current]?.hazardTags ?? [];

    for (const tag of tags) {
      if (applied >= incidentCap) break;
      if (!SUPPORTED_M1_HAZARDS.has(tag)) continue;

      const chance = clamp(
        weatherDefinitions.hazardChancePerEpisode[tag] ?? 0,
        0,
        1,
      );
      if (chance <= 0) continue;
      if (random01(episode.episodeSeed, `${tag}:chance`) >= chance) continue;

      const incident = incidents[tag];
      if (!incident || incident.pathBlock) continue;
      if (
        incident.conditionDamageMin === undefined ||
        incident.conditionDamageMax === undefined
      ) {
        continue;
      }

      const beforeEvents = world.events.length;
      world = applyConditionIncident(world, episode, tag, incident);
      if (world.events.length > beforeEvents) applied += 1;
    }
  }

  return world;
}
