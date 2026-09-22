import assert from "node:assert/strict";
import test from "node:test";
import { applyWeatherHazards } from "./weather-hazards.js";
import type {
  SimulationDefinitions,
  WeatherDefinitions,
  WorldState,
} from "./world.types.js";

const weather: WeatherDefinitions = {
  seasonDurationSeconds: 604800,
  normalEpisodeMinSeconds: 1200,
  normalEpisodeMaxSeconds: 1200,
  severeEpisodeMinSeconds: 900,
  severeEpisodeMaxSeconds: 900,
  severeCooldownSeconds: 28800,
  maxOfflineWeatherHazardsPer24h: 2,
  seasonWeights: {
    SPRING: { CLEAR: 1 },
    SUMMER: { THUNDERSTORM: 1 },
    AUTUMN: { RAIN: 1 },
    WINTER: { SNOW: 1 },
  },
  modifiers: {
    THUNDERSTORM: {
      citizenPowerMult: 1.03,
      citizenWaterMult: 1,
      travelCostMult: 1.1,
      outdoorActivityMult: 0.15,
      civilianTrafficMult: 0.55,
      hazardTags: ["lightning_fire"],
    },
    SEVERE_STORM: {
      citizenPowerMult: 1.08,
      citizenWaterMult: 1,
      travelCostMult: 1.3,
      outdoorActivityMult: 0.05,
      civilianTrafficMult: 0.15,
      hazardTags: ["road_blockage", "storm_damage"],
    },
  },
  hazardChancePerEpisode: {
    lightning_fire: 1,
    road_blockage: 1,
    storm_damage: 1,
  },
};

const zeroBuilding = {
  techTier: 0,
  moneyCost: 0,
  varumCost: 0,
  buildCycles: 0,
  workers: 0,
  priority: 0,
  moneyPerWorker: 0,
  moneyCapAdd: 0,
  powerProduction: 0,
  powerCapAdd: 0,
  powerUse: 0,
  waterProduction: 0,
  waterCapAdd: 0,
  waterUse: 0,
  varumProduction: 0,
  varumCapAdd: 0,
  techProduction: 0,
  upkeep: 0,
  housingAdd: 0,
  educationCoverageAdd: 0,
  recreationCoverageAdd: 0,
  safetyAdd: 0,
  combatSpawn: {},
  constructionSlotsAdd: 0,
  footprintCellsX: 3,
  footprintCellsZ: 2,
};

const definitions: SimulationDefinitions = {
  referenceCycleSeconds: 600,
  gridCellMeters: 2,
  buildings: {
    workshop: { id: "workshop", ...zeroBuilding },
    house_small: { id: "house_small", ...zeroBuilding },
  },
  defenders: {},
  enemies: {},
  blockers: {},
  props: {},
  weather,
  incidents: {
    lightning_fire: {
      id: "lightning_fire",
      severity: "medium",
      eligible: ["workshop"],
      pathBlock: false,
      conditionDamageMin: 10,
      conditionDamageMax: 28,
    },
    storm_damage: {
      id: "storm_damage",
      severity: "medium",
      eligible: ["house_small"],
      pathBlock: false,
      conditionDamageMin: 5,
      conditionDamageMax: 20,
    },
    road_blockage: {
      id: "road_blockage",
      severity: "low",
      eligible: ["road_dirt"],
      pathBlock: true,
    },
  },
};

function building(
  id: string,
  definitionId: "workshop" | "house_small",
  condition = 100,
): WorldState["buildings"][number] {
  return {
    id,
    definitionId,
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    constructionState: "COMPLETE",
    constructionRemainingSeconds: 0,
    constructionTotalSeconds: 0,
    workersAssigned: 0,
    priority: 0,
    condition,
    damageState: "HEALTHY",
    repairRemainingSeconds: 0,
  };
}

function world(): WorldState {
  return {
    worldId: "weather-hazards",
    ownerId: "owner",
    seed: 5,
    revision: 0,
    lifecycle: "ACTIVE",
    speed: 1,
    simulationSeconds: 0,
    lastSimulatedAt: "2026-09-22T10:00:00.000Z",
    resources: {
      money: 1000,
      moneyCap: 5000,
      power: 60,
      powerCap: 120,
      water: 60,
      waterCap: 120,
      varum: 0,
      varumCap: 0,
      techPoints: 0,
      techTier: 0,
    },
    society: {
      population: 12,
      housingCapacity: 12,
      happiness: 80,
      growthProgress: 0,
      workforce: 9,
      assignedWorkers: 0,
      educationCoverage: 0,
      recreationCoverage: 0,
      safety: 0.5,
      beauty: 0,
    },
    buildings: [building("workshop-1", "workshop"), building("house-1", "house_small")],
    roads: [],
    blockers: [],
    props: [],
    combat: null,
    events: [],
  };
}

test("weather condition hazard is deterministic and idempotent for one episode", () => {
  const episode = {
    season: "SUMMER" as const,
    current: "THUNDERSTORM" as const,
    episodeIndex: 4,
    episodeSeed: 123456,
    startedAtSimulationSeconds: 1800,
  };

  const first = applyWeatherHazards(world(), [episode], definitions, 1800);
  const replay = applyWeatherHazards(world(), [episode], definitions, 1800);
  const duplicate = applyWeatherHazards(first, [episode], definitions, 1800);

  assert.deepEqual(replay, first);
  assert.equal(first.events.length, 1);
  assert.equal(duplicate.events.length, 1);
  assert.equal(
    duplicate.buildings.find((item) => item.id === "workshop-1")?.condition,
    first.buildings.find((item) => item.id === "workshop-1")?.condition,
  );
  assert.equal(first.events[0]?.type, "WEATHER_LIGHTNING_FIRE");
});

test("weather hazard catch-up obeys the per-day cap", () => {
  const cappedDefinitions: SimulationDefinitions = {
    ...definitions,
    weather: {
      ...weather,
      maxOfflineWeatherHazardsPer24h: 1,
    },
  };
  const episodes = [1, 2, 3].map((episodeIndex) => ({
    season: "SUMMER" as const,
    current: "THUNDERSTORM" as const,
    episodeIndex,
    episodeSeed: 1000 + episodeIndex,
    startedAtSimulationSeconds: episodeIndex * 1800,
  }));

  const result = applyWeatherHazards(world(), episodes, cappedDefinitions, 7200);

  assert.equal(result.events.length, 1);
});

test("path-block tags do not create fake blockers before routing consumes blocker authority", () => {
  const episode = {
    season: "WINTER" as const,
    current: "SEVERE_STORM" as const,
    episodeIndex: 8,
    episodeSeed: 8008,
    startedAtSimulationSeconds: 3600,
  };

  const result = applyWeatherHazards(world(), [episode], definitions, 3600);

  assert.equal(result.blockers.length, 0);
  assert.ok(result.events.every((event) => event.type !== "WEATHER_ROAD_BLOCKAGE"));
});

test("weather damage never deletes a building or drops condition below recovery floor", () => {
  const hardHit: SimulationDefinitions = {
    ...definitions,
    incidents: {
      ...(definitions.incidents ?? {}),
      lightning_fire: {
        id: "lightning_fire",
        severity: "medium",
        eligible: ["workshop"],
        pathBlock: false,
        conditionDamageMin: 100,
        conditionDamageMax: 100,
      },
    },
  };
  const base = world();
  base.buildings = [building("workshop-1", "workshop", 20)];
  const episode = {
    season: "SUMMER" as const,
    current: "THUNDERSTORM" as const,
    episodeIndex: 9,
    episodeSeed: 9009,
    startedAtSimulationSeconds: 1800,
  };

  const result = applyWeatherHazards(base, [episode], hardHit, 1800);

  assert.equal(result.buildings.length, 1);
  assert.equal(result.buildings[0]?.condition, 10);
  assert.equal(result.buildings[0]?.damageState, "DISABLED");
});
