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
  "fallen_tree",
  "road_blockage",
]);

const PATH_BLOCKER_DEFINITION: Partial<Record<WeatherHazardTag, string>> = {
  fallen_tree: "fallen_tree",
  road_blockage: "rubble",
};

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


function roadEligibilityKey(type: WorldState["roads"][number]["type"]): string {
  switch (type) {
    case "DIRT":
      return "road_dirt";
  }
}

function distanceXZ(
  a: { x: number; z: number },
  b: { x: number; z: number },
): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function applyPathBlockIncident(
  world: WorldState,
  episode: WeatherEpisodeStart,
  tag: WeatherHazardTag,
  incident: IncidentDefinition,
  definitions: SimulationDefinitions,
): WorldState {
  const eventId = `weather-${episode.episodeSeed}-${tag}`;
  const blockerId = `weather-blocker-${episode.episodeSeed}-${tag}`;
  if (
    world.events.some((event) => event.id === eventId) ||
    world.blockers.some((blocker) => blocker.id === blockerId)
  ) {
    return world;
  }

  const blockerDefinitionId = PATH_BLOCKER_DEFINITION[tag];
  if (!blockerDefinitionId) return world;
  const blockerDefinition = definitions.blockers[blockerDefinitionId];
  if (!blockerDefinition) return world;

  const eligibleRoads = world.roads
    .filter((road) => incident.eligible.includes(roadEligibilityKey(road.type)))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (eligibleRoads.length === 0) return world;

  const startIndex = Math.floor(
    random01(episode.episodeSeed, `${tag}:road`) * eligibleRoads.length,
  );

  for (let offset = 0; offset < eligibleRoads.length; offset += 1) {
    const road = eligibleRoads[(startIndex + offset) % eligibleRoads.length]!;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const t =
        0.2 +
        random01(
          episode.episodeSeed,
          `${tag}:position:${road.id}:${attempt}`,
        ) *
          0.6;
      const position = {
        x: road.from.x + (road.to.x - road.from.x) * t,
        y: 0,
        z: road.from.z + (road.to.z - road.from.z) * t,
      };

      const overlapsExisting = world.blockers.some((blocker) => {
        const existingDefinition = definitions.blockers[blocker.definitionId];
        const existingRadius = existingDefinition?.radius ?? 0;
        return (
          distanceXZ(position, blocker.position) <
          blockerDefinition.radius + existingRadius + 0.25
        );
      });
      if (overlapsExisting) continue;

      return {
        ...world,
        blockers: [
          ...world.blockers,
          {
            id: blockerId,
            definitionId: blockerDefinitionId,
            position,
            state: "BLOCKING" as const,
            clearRemainingSeconds: 0,
          },
        ],
        events: [
          ...world.events.slice(-49),
          {
            id: eventId,
            type: `WEATHER_${tag.toUpperCase()}`,
            happenedAt: happenedAt(world, episode.startedAtSimulationSeconds),
            severity: eventSeverity(incident),
            summary:
              tag === "fallen_tree"
                ? "Strong weather brought a tree down across a road."
                : "Weather debris blocked a road.",
          },
        ],
      };
    }
  }

  return world;
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
      if (!incident) continue;

      const eventId = `weather-${episode.episodeSeed}-${tag}`;
      const alreadyApplied = world.events.some((event) => event.id === eventId);

      if (incident.pathBlock) {
        world = applyPathBlockIncident(
          world,
          episode,
          tag,
          incident,
          definitions,
        );
      } else {
        if (
          incident.conditionDamageMin === undefined ||
          incident.conditionDamageMax === undefined
        ) {
          continue;
        }
        world = applyConditionIncident(world, episode, tag, incident);
      }
      if (
        !alreadyApplied &&
        world.events.some((event) => event.id === eventId)
      ) {
        applied += 1;
      }
    }
  }

  return world;
}
