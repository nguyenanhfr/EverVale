import { createWeatherState } from "@evervale/domain/weather";
import type { SimulationDefinitions, WorldState } from "@evervale/domain/world.types";
import type { IdGenerator } from "./ports.js";

export function createStarterWorld(
  ownerId: string,
  seed: number,
  defs: SimulationDefinitions,
  ids: IdGenerator,
  now: Date,
): WorldState {
  const place = (definitionId: string, x: number, z: number): WorldState["buildings"][number] => {
    const definition = defs.buildings[definitionId];
    if (!definition) throw new Error(`STARTER_DEFINITION_MISSING:${definitionId}`);
    return {
      id: ids.next("building"),
      definitionId,
      position: { x, y: 0, z },
      rotationY: 0,
      constructionState: "COMPLETE",
      constructionRemainingSeconds: 0,
      constructionTotalSeconds: 0,
      workersAssigned: 0,
      priority: definition.priority,
      condition: 100,
      damageState: "HEALTHY",
      repairRemainingSeconds: 0,
    };
  };

  return {
    worldId: ids.next("world"),
    ownerId,
    seed,
    revision: 0,
    lifecycle: "ACTIVE",
    speed: 1,
    simulationSeconds: 0,
    lastSimulatedAt: now.toISOString(),
    resources: {
      money: 1200,
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
    buildings: [
      place("town_center", 0, 0),
      place("house_small", -12, -5),
      place("house_small", -5, -9),
      place("house_small", 4, -9),
      place("power_plant", 13, 7),
      place("water_plant", 13, -2),
      place("workshop", -13, 7),
    ],
    roads: [
      { id: ids.next("road"), type: "DIRT", from: { x: -24, y: 0, z: 2 }, to: { x: 24, y: 0, z: 2 } },
      { id: ids.next("road"), type: "DIRT", from: { x: 0, y: 0, z: -18 }, to: { x: 0, y: 0, z: 18 } },
    ],
    blockers: [
      { id: ids.next("blocker"), definitionId: "fallen_tree", position: { x: 29, y: 0, z: 11 }, state: "BLOCKING", clearRemainingSeconds: 0 },
      { id: ids.next("blocker"), definitionId: "rubble", position: { x: -30, y: 0, z: -12 }, state: "BLOCKING", clearRemainingSeconds: 0 },
    ],
    props: [],
    ...(defs.weather
      ? { weather: createWeatherState(seed, 0, defs.weather) }
      : {}),
    combat: null,
    events: [],
  };
}
