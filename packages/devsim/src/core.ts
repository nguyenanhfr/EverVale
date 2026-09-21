import { randomUUID } from "node:crypto";
import { WorldService } from "@evervale/application/world-service";
import type {
  AcceptedCommandContext,
  AcceptedCommandReceipt,
  Clock,
  IdGenerator,
  WorldRepository,
} from "@evervale/application/ports";
import { loadGameData } from "@evervale/balance-data";
import type { SimulationDefinitions, WorldState } from "@evervale/domain/world.types";
import { parseWorldCommand } from "@evervale/protocol/world-command-runtime";
import type { WorldCommand } from "@evervale/protocol/world";

export class MemoryWorldRepository implements WorldRepository {
  world: WorldState | null = null;
  readonly receipts = new Map<string, AcceptedCommandReceipt>();

  async findByOwner(ownerId: string): Promise<WorldState | null> {
    return this.world?.ownerId === ownerId ? this.world : null;
  }

  async findById(worldId: string): Promise<WorldState | null> {
    return this.world?.worldId === worldId ? this.world : null;
  }

  async findAcceptedCommand(commandId: string): Promise<AcceptedCommandReceipt | null> {
    return this.receipts.get(commandId) ?? null;
  }

  async create(world: WorldState): Promise<void> {
    if (this.world) throw new Error("WORLD_OWNER_EXISTS");
    this.world = world;
  }

  async save(
    world: WorldState,
    previousRevision: number,
    acceptedCommand?: AcceptedCommandContext,
  ): Promise<void> {
    if (!this.world || this.world.revision !== previousRevision) {
      throw new Error("REVISION_CONFLICT");
    }
    this.world = world;
    if (acceptedCommand) {
      this.receipts.set(acceptedCommand.commandId, {
        ...acceptedCommand,
        worldId: world.worldId,
        world,
      });
    }
  }

  replaceForFixture(world: WorldState): void {
    this.world = world;
  }
}

export class SimClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}

export class DeterministicIds implements IdGenerator {
  private counter = 0;

  constructor(private readonly seed: number) {}

  next(prefix: string): string {
    this.counter += 1;
    return `${prefix}-sim-${this.seed}-${this.counter}`;
  }
}

export interface MoneyFlow {
  grossIncomePerCycle: number;
  upkeepPerCycle: number;
  netPerCycle: number;
}

export interface SimActionResult {
  accepted: boolean;
  type: WorldCommand["type"];
  atSeconds: number;
  definitionId?: string;
  moneyDelta: number;
  varumDelta: number;
  error?: string;
}

export interface SimSample {
  atSeconds: number;
  revision: number;
  money: number;
  moneyCap: number;
  power: number;
  powerCap: number;
  water: number;
  waterCap: number;
  varum: number;
  varumCap: number;
  techPoints: number;
  techTier: number;
  population: number;
  housing: number;
  happiness: number;
  workforce: number;
  assignedWorkers: number;
  activeConstruction: number;
  completedBuildings: number;
  moneyFlow: MoneyFlow;
  workersByJobCategory: Record<string, number>;
  unmetWorkersByJobCategory: Record<string, number>;
}

export function currentMoneyFlow(
  world: WorldState,
  definitions: SimulationDefinitions,
): MoneyFlow {
  let grossIncomePerCycle = 0;
  let upkeepPerCycle = 0;

  for (const building of world.buildings) {
    const def = definitions.buildings[building.definitionId];
    if (
      !def ||
      building.constructionState !== "COMPLETE" ||
      building.damageState === "DISABLED"
    ) {
      continue;
    }

    grossIncomePerCycle += def.moneyPerWorker * building.workersAssigned;
    upkeepPerCycle += def.upkeep;
  }

  return {
    grossIncomePerCycle,
    upkeepPerCycle,
    netPerCycle: grossIncomePerCycle - upkeepPerCycle,
  };
}

export interface SimHarnessOptions {
  seed?: number;
  buildingOverrides?: Record<string, Partial<SimulationDefinitions["buildings"][string]>>;
}

export class SimHarness {
  readonly definitions: SimulationDefinitions;
  readonly repository = new MemoryWorldRepository();
  readonly clock: SimClock;
  readonly service: WorldService;
  readonly ownerId: string;
  readonly actions: SimActionResult[] = [];

  private readonly placementCandidates: Array<{ x: number; z: number }>;
  private combatFixtureCounter = 0;

  readonly seed: number;

  constructor(options: SimHarnessOptions = {}) {
    const gameData = loadGameData();
    this.seed = options.seed ?? 1;
    this.definitions = gameData.definitions;

    for (const [buildingId, override] of Object.entries(options.buildingOverrides ?? {})) {
      const existing = this.definitions.buildings[buildingId];
      if (!existing) throw new Error(`UNKNOWN_BUILDING_OVERRIDE:${buildingId}`);
      this.definitions.buildings[buildingId] = { ...existing, ...override, id: existing.id };
    }

    this.ownerId = `devsim-owner-${this.seed}`;
    this.clock = new SimClock(new Date("2026-09-21T12:00:00.000Z"));
    this.service = new WorldService({
      repository: this.repository,
      definitions: this.definitions,
      ids: new DeterministicIds(this.seed),
      clock: this.clock,
    });

    this.placementCandidates = this.makePlacementCandidates();
  }

  async initialize(): Promise<WorldState> {
    return this.service.getOrCreate(this.ownerId);
  }

  applyBuildingOverrides(
    overrides: Record<string, Partial<SimulationDefinitions["buildings"][string]>>,
  ): void {
    for (const [buildingId, override] of Object.entries(overrides)) {
      const existing = this.definitions.buildings[buildingId];
      if (!existing) throw new Error(`UNKNOWN_BUILDING_OVERRIDE:${buildingId}`);
      this.definitions.buildings[buildingId] = {
        ...existing,
        ...override,
        id: existing.id,
      };
    }

    if (this.repository.world) {
      const buildings = this.repository.world.buildings.map((instance) => {
        const override = overrides[instance.definitionId];
        if (!override || typeof override.priority !== "number") return instance;
        return { ...instance, priority: override.priority };
      });
      this.repository.replaceForFixture({
        ...this.repository.world,
        buildings,
      });
    }
  }

  async world(): Promise<WorldState> {
    return this.service.getOrCreate(this.ownerId);
  }

  async advance(seconds: number): Promise<WorldState> {
    this.clock.advance(seconds);
    return this.service.getOrCreate(this.ownerId);
  }

  sample(world: WorldState): SimSample {
    const workersByJobCategory: Record<string, number> = {};
    const demandByJobCategory: Record<string, number> = {};

    for (const building of world.buildings) {
      if (
        building.constructionState !== "COMPLETE" ||
        building.damageState === "DISABLED"
      ) {
        continue;
      }
      const definition = this.definitions.buildings[building.definitionId];
      if (!definition || definition.workers <= 0) continue;
      const category = definition.jobCategory ?? "uncategorized";
      workersByJobCategory[category] =
        (workersByJobCategory[category] ?? 0) + building.workersAssigned;
      demandByJobCategory[category] =
        (demandByJobCategory[category] ?? 0) + definition.workers;
    }

    const unmetWorkersByJobCategory = Object.fromEntries(
      Object.entries(demandByJobCategory).map(([category, demand]) => [
        category,
        Math.max(0, demand - (workersByJobCategory[category] ?? 0)),
      ]),
    );

    return {
      atSeconds: world.simulationSeconds,
      revision: world.revision,
      money: world.resources.money,
      moneyCap: world.resources.moneyCap,
      power: world.resources.power,
      powerCap: world.resources.powerCap,
      water: world.resources.water,
      waterCap: world.resources.waterCap,
      varum: world.resources.varum,
      varumCap: world.resources.varumCap,
      techPoints: world.resources.techPoints,
      techTier: world.resources.techTier,
      population: world.society.population,
      housing: world.society.housingCapacity,
      happiness: world.society.happiness,
      workforce: world.society.workforce,
      assignedWorkers: world.society.assignedWorkers,
      activeConstruction: world.buildings.filter((item) => item.constructionState === "BUILDING").length,
      completedBuildings: world.buildings.filter((item) => item.constructionState === "COMPLETE").length,
      moneyFlow: currentMoneyFlow(world, this.definitions),
      workersByJobCategory,
      unmetWorkersByJobCategory,
    };
  }

  async placeBuilding(definitionId: string): Promise<SimActionResult> {
    const before = await this.world();

    for (const point of this.placementCandidates) {
      const raw = {
        type: "PLACE_BUILDING",
        commandId: randomUUID(),
        expectedRevision: before.revision,
        payload: {
          definitionId,
          x: point.x,
          z: point.z,
        },
      };

      const command = parseWorldCommand(raw);
      try {
        const after = await this.service.command(this.ownerId, command);
        const result: SimActionResult = {
          accepted: true,
          type: command.type,
          atSeconds: after.simulationSeconds,
          definitionId,
          moneyDelta: after.resources.money - before.resources.money,
          varumDelta: after.resources.varum - before.resources.varum,
        };
        this.actions.push(result);
        return result;
      } catch (error) {
        const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
        if (
          code === "PLACEMENT_COLLISION" ||
          code === "PLACEMENT_BLOCKED" ||
          code === "NO_ROAD_ACCESS"
        ) {
          continue;
        }

        const result: SimActionResult = {
          accepted: false,
          type: command.type,
          atSeconds: before.simulationSeconds,
          definitionId,
          moneyDelta: 0,
          varumDelta: 0,
          error: code,
        };
        this.actions.push(result);
        return result;
      }
    }

    const result: SimActionResult = {
      accepted: false,
      type: "PLACE_BUILDING",
      atSeconds: before.simulationSeconds,
      definitionId,
      moneyDelta: 0,
      varumDelta: 0,
      error: "NO_VALID_PLACEMENT",
    };
    this.actions.push(result);
    return result;
  }


  amplifyCurrentCombat(extraEnemies: Record<string, number>): void {
    const world = this.repository.world;
    if (!world?.combat || world.combat.status === "RESOLVED") {
      throw new Error("DEVSIM_COMBAT_NOT_ACTIVE");
    }

    const actors = world.combat.actors.map((actor) => ({ ...actor }));
    let positionIndex = 0;

    for (const [definitionId, count] of Object.entries(extraEnemies).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const definition = this.definitions.enemies[definitionId];
      if (!definition) throw new Error(`UNKNOWN_STRESS_ENEMY:${definitionId}`);
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error(`INVALID_STRESS_ENEMY_COUNT:${definitionId}`);
      }

      for (let index = 0; index < count; index += 1) {
        this.combatFixtureCounter += 1;
        actors.push({
          id: `stress-${definitionId}-${this.seed}-${this.combatFixtureCounter}`,
          definitionId,
          side: "ENEMY",
          hp: definition.hp,
          maxHp: definition.hp,
          position: {
            x: -12 + (positionIndex % 7) * 4,
            y: 0,
            z: 18 + Math.floor(positionIndex / 7) * 3,
          },
        });
        positionIndex += 1;
      }
    }

    this.repository.replaceForFixture({
      ...world,
      combat: {
        ...world.combat,
        actors,
      },
    });
  }

  async repairBuilding(buildingId: string): Promise<SimActionResult> {
    const before = await this.world();
    const command = parseWorldCommand({
      type: "REPAIR_BUILDING",
      commandId: randomUUID(),
      expectedRevision: before.revision,
      payload: { buildingId },
    });

    try {
      const after = await this.service.command(this.ownerId, command);
      const result: SimActionResult = {
        accepted: true,
        type: command.type,
        atSeconds: after.simulationSeconds,
        moneyDelta: after.resources.money - before.resources.money,
        varumDelta: after.resources.varum - before.resources.varum,
      };
      this.actions.push(result);
      return result;
    } catch (error) {
      const result: SimActionResult = {
        accepted: false,
        type: command.type,
        atSeconds: before.simulationSeconds,
        moneyDelta: 0,
        varumDelta: 0,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      };
      this.actions.push(result);
      return result;
    }
  }

  async triggerWave(): Promise<SimActionResult> {
    const before = await this.world();
    const command = parseWorldCommand({
      type: "TRIGGER_TEST_WAVE",
      commandId: randomUUID(),
      expectedRevision: before.revision,
      payload: {},
    });

    try {
      const after = await this.service.command(this.ownerId, command);
      const result: SimActionResult = {
        accepted: true,
        type: command.type,
        atSeconds: after.simulationSeconds,
        moneyDelta: after.resources.money - before.resources.money,
        varumDelta: after.resources.varum - before.resources.varum,
      };
      this.actions.push(result);
      return result;
    } catch (error) {
      const result: SimActionResult = {
        accepted: false,
        type: command.type,
        atSeconds: before.simulationSeconds,
        moneyDelta: 0,
        varumDelta: 0,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      };
      this.actions.push(result);
      return result;
    }
  }

  private makePlacementCandidates(): Array<{ x: number; z: number }> {
    const values: Array<{ x: number; z: number }> = [];
    for (let z = -16; z <= 16; z += 2) {
      for (let x = -22; x <= 22; x += 2) {
        const nearHorizontalRoad = Math.abs(z - 2) <= 9;
        const nearVerticalRoad = Math.abs(x) <= 9;
        if (nearHorizontalRoad || nearVerticalRoad) {
          values.push({ x, z });
        }
      }
    }

    values.sort((a, b) => {
      const da = Math.hypot(a.x, a.z);
      const db = Math.hypot(b.x, b.z);
      return da - db || a.z - b.z || a.x - b.x;
    });
    return values;
  }
}
