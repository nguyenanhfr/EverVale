import assert from "node:assert/strict";
import test from "node:test";
import { applyWeatherHazards } from "./weather-hazards.js";
import { advanceBlockers, queueBlockerClear } from "./blockers.js";
import { routeAlongRoads } from "./road-routing.js";
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
  blockers: {
    fallen_tree: {
      id: "fallen_tree",
      moneyCost: 40,
      varumCost: 0,
      clearCycles: 1,
      techTier: 0,
      radius: 2.5,
    },
    rubble: {
      id: "rubble",
      moneyCost: 50,
      varumCost: 0,
      clearCycles: 1,
      techTier: 0,
      radius: 2.5,
    },
  },
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

test("weather road blockage creates a clearable authoritative routing obstruction", () => {
  const pathOnlyDefinitions: SimulationDefinitions = {
    ...definitions,
    weather: {
      ...weather,
      maxOfflineWeatherHazardsPer24h: 1,
      modifiers: {
        ...weather.modifiers,
        SEVERE_STORM: {
          citizenPowerMult: 1.08,
          citizenWaterMult: 1,
          travelCostMult: 1.3,
          outdoorActivityMult: 0.05,
          civilianTrafficMult: 0.15,
          hazardTags: ["road_blockage"],
        },
      },
    },
  };
  const base = world();
  base.roads = [{
    id: "main-road",
    type: "DIRT",
    from: { x: -10, y: 0, z: 0 },
    to: { x: 10, y: 0, z: 0 },
  }];
  const episode = {
    season: "WINTER" as const,
    current: "SEVERE_STORM" as const,
    episodeIndex: 8,
    episodeSeed: 8008,
    startedAtSimulationSeconds: 3600,
  };

  const result = applyWeatherHazards(
    base,
    [episode],
    pathOnlyDefinitions,
    3600,
  );

  assert.equal(result.blockers.length, 1);
  assert.equal(result.blockers[0]?.definitionId, "rubble");
  assert.equal(result.events[0]?.type, "WEATHER_ROAD_BLOCKAGE");
  assert.equal(result.blockers[0]?.position.z, 0);
  assert.ok((result.blockers[0]?.position.x ?? 20) > -10);
  assert.ok((result.blockers[0]?.position.x ?? -20) < 10);

  const blockerDefinition =
    pathOnlyDefinitions.blockers[result.blockers[0]!.definitionId]!;
  const routingBlocker = [{
    x: result.blockers[0]!.position.x,
    z: result.blockers[0]!.position.z,
    radius: blockerDefinition.radius,
  }];
  const blockedRoute = routeAlongRoads(
    result.roads,
    { x: -8, z: 2 },
    { x: 8, z: 2 },
    routingBlocker,
  );
  assert.equal(blockedRoute.connected, false);

  const clearing = queueBlockerClear(
    result,
    pathOnlyDefinitions,
    result.blockers[0]!.id,
  );
  assert.equal(clearing.blockers[0]?.state, "CLEARING");
  const stillBlockedRoute = routeAlongRoads(
    clearing.roads,
    { x: -8, z: 2 },
    { x: 8, z: 2 },
    routingBlocker,
  );
  assert.equal(stillBlockedRoute.connected, false);

  const cleared = advanceBlockers(
    clearing,
    pathOnlyDefinitions.referenceCycleSeconds,
  );
  assert.equal(cleared.blockers.length, 0);
  const reconnected = routeAlongRoads(
    cleared.roads,
    { x: -8, z: 2 },
    { x: 8, z: 2 },
  );
  assert.equal(reconnected.connected, true);

  const replay = applyWeatherHazards(
    result,
    [episode],
    pathOnlyDefinitions,
    3600,
  );
  assert.equal(replay.blockers.length, 1);
  assert.equal(
    replay.events.filter((event) => event.type === "WEATHER_ROAD_BLOCKAGE").length,
    1,
  );
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


test("fallen tree weather tag creates fallen_tree blocker on an eligible dirt road", () => {
  const windDefinitions: SimulationDefinitions = {
    ...definitions,
    weather: {
      ...weather,
      maxOfflineWeatherHazardsPer24h: 1,
      modifiers: {
        ...weather.modifiers,
        STRONG_WIND: {
          citizenPowerMult: 1,
          citizenWaterMult: 1,
          travelCostMult: 1.05,
          outdoorActivityMult: 0.55,
          civilianTrafficMult: 0.8,
          hazardTags: ["fallen_tree"],
        },
      },
      hazardChancePerEpisode: {
        ...weather.hazardChancePerEpisode,
        fallen_tree: 1,
      },
    },
    incidents: {
      ...(definitions.incidents ?? {}),
      fallen_tree: {
        id: "fallen_tree",
        severity: "low",
        eligible: ["road_dirt"],
        pathBlock: true,
      },
    },
  };
  const base = world();
  base.roads = [{
    id: "wind-road",
    type: "DIRT",
    from: { x: -12, y: 0, z: 4 },
    to: { x: 12, y: 0, z: 4 },
  }];
  const episode = {
    season: "AUTUMN" as const,
    current: "STRONG_WIND" as const,
    episodeIndex: 10,
    episodeSeed: 101010,
    startedAtSimulationSeconds: 4200,
  };

  const result = applyWeatherHazards(
    base,
    [episode],
    windDefinitions,
    4200,
  );

  assert.equal(result.blockers.length, 1);
  assert.equal(result.blockers[0]?.definitionId, "fallen_tree");
  assert.equal(result.blockers[0]?.position.z, 4);
  assert.equal(result.events[0]?.type, "WEATHER_FALLEN_TREE");
});
