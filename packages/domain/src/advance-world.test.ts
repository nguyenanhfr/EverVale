import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld } from "./advance-world.js";
import type { SimulationDefinitions, WeatherDefinitions, WorldState } from "./world.types.js";

const zero = {
  moneyCost: 0, varumCost: 0, buildCycles: 0, workers: 0, priority: 0,
  moneyPerWorker: 0, moneyCapAdd: 0, powerProduction: 0, powerCapAdd: 0, powerUse: 0,
  waterProduction: 0, waterCapAdd: 0, waterUse: 0, varumProduction: 0,
  varumCapAdd: 0, techProduction: 0, upkeep: 0, housingAdd: 0,
  educationCoverageAdd: 0, recreationCoverageAdd: 0, safetyAdd: 0, combatSpawn: {}, constructionSlotsAdd: 0,
  footprintCellsX: 3,
  footprintCellsZ: 2,
};

const defs: SimulationDefinitions = {
  referenceCycleSeconds: 600,
  gridCellMeters: 2,
  buildings: {
    town_center: { id: "town_center", techTier: 0, ...zero },
    house_small: { id: "house_small", techTier: 0, ...zero, housingAdd: 4, upkeep: 1 },
    power_plant: { id: "power_plant", techTier: 0, ...zero, workers: 2, priority: 100, powerProduction: 40 },
    water_plant: { id: "water_plant", techTier: 0, ...zero, workers: 2, priority: 95, waterProduction: 35, powerUse: 4 },
    workshop: { id: "workshop", techTier: 0, ...zero, workers: 4, priority: 80, moneyPerWorker: 8, powerUse: 4, waterUse: 1, upkeep: 3 },
  },
  defenders: {},
  enemies: {},
  blockers: {},
  props: {},
};

const building = (id: string, def: string): WorldState["buildings"][number] => ({
  id, definitionId: def, position: {x:0,y:0,z:0}, rotationY:0,
  constructionState:"COMPLETE", constructionRemainingSeconds:0,constructionTotalSeconds:0, workersAssigned:0,
  priority: defs.buildings[def]?.priority ?? 0, condition:100, damageState:"HEALTHY", repairRemainingSeconds:0,
});

test("starter economy advances without negative resources", () => {
  const world: WorldState = {
    worldId:"w", ownerId:"u", seed:1, revision:0, lifecycle:"ACTIVE", speed:1,
    simulationSeconds:0, lastSimulatedAt:new Date(0).toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[
      building("tc","town_center"), building("h1","house_small"), building("h2","house_small"), building("h3","house_small"),
      building("p","power_plant"), building("w","water_plant"), building("shop","workshop"),
    ],
    roads:[{id:"r",type:"DIRT",from:{x:-20,y:0,z:0},to:{x:20,y:0,z:0}}], blockers:[],
  props:[],
  combat:null, events:[],
  };

  const next = advanceWorld(world, defs, 600);
  assert.ok(next.resources.money >= 0);
  assert.ok(next.resources.power >= 0);
  assert.ok(next.resources.water >= 0);
  assert.ok(next.society.assignedWorkers <= next.society.workforce);
});


const weatherDefinitions: WeatherDefinitions = {
  seasonDurationSeconds: 604800,
  normalEpisodeMinSeconds: 3600,
  normalEpisodeMaxSeconds: 3600,
  severeEpisodeMinSeconds: 1800,
  severeEpisodeMaxSeconds: 1800,
  severeCooldownSeconds: 28800,
  seasonWeights: {
    SPRING: { CLEAR: 1 },
    SUMMER: { CLEAR: 1 },
    AUTUMN: { CLEAR: 1 },
    WINTER: { CLEAR: 1 },
  },
  modifiers: {
    CLEAR: {
      citizenPowerMult: 1,
      citizenWaterMult: 1,
      travelCostMult: 1,
      outdoorActivityMult: 1,
      civilianTrafficMult: 1,
    },
    HEATWAVE: {
      citizenPowerMult: 1.05,
      citizenWaterMult: 1.15,
      travelCostMult: 1,
      outdoorActivityMult: 0.7,
      civilianTrafficMult: 0.9,
    },
  },
};

test("authoritative heatwave increases resident Water demand", () => {
  const baseWorld: WorldState = {
    worldId:"weather-world", ownerId:"weather-owner", seed:44, revision:0, lifecycle:"ACTIVE", speed:1,
    simulationSeconds:0, lastSimulatedAt:new Date(0).toISOString(),
    resources:{money:1200,moneyCap:5000,power:50,powerCap:60,water:50,waterCap:60,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:1,safety:0.5,beauty:0},
    buildings:[building("tc-weather","town_center")],
    roads:[], blockers:[], props:[], combat:null, events:[],
  };
  const clearWorld: WorldState = {
    ...baseWorld,
    weather: {
      season:"SUMMER",
      seasonProgress:0.2,
      climateSeed:44,
      current:"CLEAR",
      episodeIndex:0,
      episodeSeed:1,
      episodeRemainingSeconds:7200,
      severeCooldownRemainingSeconds:0,
    },
  };
  const heatwaveWorld: WorldState = {
    ...baseWorld,
    weather: {
      ...clearWorld.weather!,
      current:"HEATWAVE",
      episodeSeed:2,
    },
  };
  const weatherDefs: SimulationDefinitions = {
    ...defs,
    weather: weatherDefinitions,
  };

  const clear = advanceWorld(clearWorld, weatherDefs, 600);
  const heat = advanceWorld(heatwaveWorld, weatherDefs, 600);

  assert.ok(heat.resources.water < clear.resources.water);
  assert.ok(heat.society.happiness <= clear.society.happiness);
});
