import assert from "node:assert/strict";
import test from "node:test";
import type { SimulationDefinitions, WeatherDefinitions, WorldState } from "@evervale/domain/world.types";
import { WorldService } from "./world-service.js";
import type {
  AcceptedCommandContext,
  AcceptedCommandReceipt,
  Clock,
  IdGenerator,
  WorldRepository,
} from "./ports.js";

class Repo implements WorldRepository {
  saveCalls = 0;
  readonly receipts = new Map<string, AcceptedCommandReceipt>();
  constructor(public world: WorldState) {}
  async findByOwner(): Promise<WorldState | null> { return this.world; }
  async findById(): Promise<WorldState | null> { return this.world; }
  async findAcceptedCommand(commandId: string): Promise<AcceptedCommandReceipt | null> {
    return this.receipts.get(commandId) ?? null;
  }
  async create(world: WorldState): Promise<void> { this.world = world; }
  async save(
    world: WorldState,
    previousRevision: number,
    acceptedCommand?: AcceptedCommandContext,
  ): Promise<void> {
    assert.equal(this.world.revision, previousRevision);
    this.saveCalls += 1;
    this.world = world;
    if (acceptedCommand) {
      this.receipts.set(acceptedCommand.commandId, {
        ...acceptedCommand,
        worldId: world.worldId,
        world,
      });
    }
  }
}

class FakeClock implements Clock {
  constructor(public value: Date) {}
  now(): Date { return this.value; }
}

class Ids implements IdGenerator {
  private n = 0;
  next(prefix: string): string { this.n += 1; return `${prefix}-${this.n}`; }
}

const zero = {
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

const defs: SimulationDefinitions = {
  referenceCycleSeconds: 600,
  gridCellMeters: 2,
  buildings: {
    town_center: { id:"town_center", techTier:0, ...zero, moneyCapAdd:5000, constructionSlotsAdd:1 },
    house_small: { id:"house_small", techTier:0, ...zero, housingAdd:4 },
    power_plant: { id:"power_plant", techTier:0, ...zero, workers:2, priority:100, powerProduction:40, powerCapAdd:120 },
    water_plant: { id:"water_plant", techTier:0, ...zero, workers:2, priority:95, waterProduction:35, waterCapAdd:120, powerUse:4 },
    workshop: { id:"workshop", techTier:0, ...zero, workers:4, priority:80, moneyPerWorker:8, powerUse:4, waterUse:1, upkeep:3 },
  },
  defenders: {},
  enemies: {},
  blockers: {},
  props: {},
};

const weatherDefinitions: WeatherDefinitions = {
  seasonDurationSeconds: 604800,
  normalEpisodeMinSeconds: 1,
  normalEpisodeMaxSeconds: 1,
  severeEpisodeMinSeconds: 1,
  severeEpisodeMaxSeconds: 1,
  severeCooldownSeconds: 28800,
  seasonWeights: {
    SPRING: { CLEAR: 1, LIGHT_RAIN: 1 },
    SUMMER: { CLEAR: 1 },
    AUTUMN: { RAIN: 1 },
    WINTER: { SNOW: 1 },
  },
  modifiers: {},
};

const defsWithWeather: SimulationDefinitions = {
  ...defs,
  weather: weatherDefinitions,
};

const building = (id: string, definitionId: string): WorldState["buildings"][number] => ({
  id,
  definitionId,
  position:{x:0,y:0,z:0},
  rotationY:0,
  constructionState:"COMPLETE",
  constructionRemainingSeconds:0,constructionTotalSeconds:0,
  workersAssigned:0,
  priority:defs.buildings[definitionId]?.priority ?? 0,
  condition:100,
  damageState:"HEALTHY",
  repairRemainingSeconds:0,
});

test("command applies after elapsed time without self-inflicted revision conflict", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world",
    ownerId:"owner",
    seed:1,
    revision:7,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[
      building("tc","town_center"),
      building("h1","house_small"),
      building("h2","house_small"),
      building("h3","house_small"),
      building("p","power_plant"),
      building("w","water_plant"),
      building("shop","workshop"),
    ],
    roads:[{id:"r",type:"DIRT",from:{x:-20,y:0,z:0},to:{x:20,y:0,z:0}}],
    blockers:[],
  props:[],
  combat:null, events:[],
  };
  const repo = new Repo(world);
  const clock = new FakeClock(new Date(base.getTime() + 1500));
  const service = new WorldService({ repository:repo, definitions:defs, ids:new Ids(), clock });

  const next = await service.command("owner", {
    type:"SET_SPEED",
    commandId:"cmd",
    expectedRevision:7,
    payload:{speed:2},
  });

  assert.equal(next.speed, 2);
  assert.equal(next.revision, 8);
  assert.ok(next.simulationSeconds > 0);
});


test("read projection advances visible simulation without mutating persisted revision", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-read",
    ownerId:"owner-read",
    seed:2,
    revision:3,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[
      building("tc","town_center"),
      building("h1","house_small"),
      building("h2","house_small"),
      building("h3","house_small"),
      building("p","power_plant"),
      building("w","water_plant"),
      building("shop","workshop"),
    ],
    roads:[{id:"r",type:"DIRT",from:{x:-20,y:0,z:0},to:{x:20,y:0,z:0}}],
    blockers:[], props:[], combat:null, events:[],
  };
  const repo = new Repo(world);
  const clock = new FakeClock(new Date(base.getTime() + 2000));
  const service = new WorldService({ repository:repo, definitions:defs, ids:new Ids(), clock });

  const projected = await service.getOrCreate("owner-read");

  assert.equal(projected.revision, 3);
  assert.ok(projected.simulationSeconds >= 2);
  assert.equal(repo.world.revision, 3);
  assert.equal(repo.world.simulationSeconds, 0);
  assert.equal(repo.saveCalls, 0);
});


test("accepted command retry returns original result without applying twice", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-idempotent",
    ownerId:"owner-idempotent",
    seed:3,
    revision:4,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[
      building("tc","town_center"),
      building("h1","house_small"),
      building("h2","house_small"),
      building("h3","house_small"),
      building("p","power_plant"),
      building("w","water_plant"),
      building("shop","workshop"),
    ],
    roads:[{id:"r",type:"DIRT",from:{x:-20,y:0,z:0},to:{x:20,y:0,z:0}}],
    blockers:[], props:[], combat:null, events:[],
  };

  const repo = new Repo(world);
  const service = new WorldService({
    repository: repo,
    definitions: defs,
    ids: new Ids(),
    clock: new FakeClock(base),
  });

  const command = {
    type:"SET_SPEED" as const,
    commandId:"same-command",
    expectedRevision:4,
    payload:{speed:2 as const},
  };

  const first = await service.command("owner-idempotent", command);
  const second = await service.command("owner-idempotent", command);

  assert.equal(first.revision, 5);
  assert.equal(first.speed, 2);
  assert.deepEqual(second, first);
  assert.equal(repo.saveCalls, 1);
  assert.equal(repo.world.revision, 5);
});

test("reusing a command id with different payload is rejected", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-conflict",
    ownerId:"owner-conflict",
    seed:4,
    revision:2,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[building("tc","town_center")],
    roads:[], blockers:[], props:[], combat:null, events:[],
  };

  const repo = new Repo(world);
  const service = new WorldService({
    repository: repo,
    definitions: defs,
    ids: new Ids(),
    clock: new FakeClock(base),
  });

  await service.command("owner-conflict", {
    type:"SET_SPEED",
    commandId:"reused-id",
    expectedRevision:2,
    payload:{speed:2},
  });

  await assert.rejects(
    () => service.command("owner-conflict", {
      type:"SET_SPEED",
      commandId:"reused-id",
      expectedRevision:2,
      payload:{speed:4},
    }),
    /COMMAND_ID_CONFLICT/,
  );
  assert.equal(repo.saveCalls, 1);
});

test("revision race returns matching receipt instead of applying command twice", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-race",
    ownerId:"owner-race",
    seed:5,
    revision:9,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[building("tc","town_center")],
    roads:[], blockers:[], props:[], combat:null, events:[],
  };

  class RaceRepo extends Repo {
    override async save(
      next: WorldState,
      previousRevision: number,
      acceptedCommand?: AcceptedCommandContext,
    ): Promise<void> {
      assert.equal(previousRevision, 9);
      assert.ok(acceptedCommand);
      this.world = next;
      this.receipts.set(acceptedCommand.commandId, {
        ...acceptedCommand,
        worldId: next.worldId,
        world: next,
      });
      throw new Error("REVISION_CONFLICT");
    }
  }

  const repo = new RaceRepo(world);
  const service = new WorldService({
    repository: repo,
    definitions: defs,
    ids: new Ids(),
    clock: new FakeClock(base),
  });

  const result = await service.command("owner-race", {
    type:"SET_SPEED",
    commandId:"race-command",
    expectedRevision:9,
    payload:{speed:2},
  });

  assert.equal(result.revision, 10);
  assert.equal(result.speed, 2);
  assert.equal(repo.receipts.size, 1);
});


test("concurrent distinct commands for one owner serialize and only one stale revision can commit", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-concurrent",
    ownerId:"owner-concurrent",
    seed:6,
    revision:12,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[building("tc","town_center")],
    roads:[], blockers:[], props:[], combat:null, events:[],
  };

  const repo = new Repo(world);
  const service = new WorldService({
    repository: repo,
    definitions: defs,
    ids: new Ids(),
    clock: new FakeClock(base),
  });

  const results = await Promise.allSettled([
    service.command("owner-concurrent", {
      type:"SET_SPEED",
      commandId:"concurrent-a",
      expectedRevision:12,
      payload:{speed:2},
    }),
    service.command("owner-concurrent", {
      type:"SET_SPEED",
      commandId:"concurrent-b",
      expectedRevision:12,
      payload:{speed:4},
    }),
  ]);

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(String((rejected[0] as PromiseRejectedResult).reason), /REVISION_CONFLICT/);
  assert.equal(repo.saveCalls, 1);
  assert.equal(repo.world.revision, 13);
  assert.ok(repo.world.speed === 2 || repo.world.speed === 4);
});

test("concurrent first-load requests create only one world for an owner", async () => {
  class EmptyRepo implements WorldRepository {
    world: WorldState | null = null;
    createCalls = 0;
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
      this.createCalls += 1;
      if (this.world) throw new Error("WORLD_ALREADY_EXISTS");
      this.world = world;
    }
    async save(
      world: WorldState,
      previousRevision: number,
      acceptedCommand?: AcceptedCommandContext,
    ): Promise<void> {
      assert.equal(this.world?.revision, previousRevision);
      this.world = world;
      if (acceptedCommand) {
        this.receipts.set(acceptedCommand.commandId, {
          ...acceptedCommand,
          worldId: world.worldId,
          world,
        });
      }
    }
  }

  const repo = new EmptyRepo();
  const service = new WorldService({
    repository: repo,
    definitions: defs,
    ids: new Ids(),
    clock: new FakeClock(new Date("2026-09-21T12:00:00.000Z")),
  });

  const [a, b] = await Promise.all([
    service.getOrCreate("owner-first-load"),
    service.getOrCreate("owner-first-load"),
  ]);

  assert.equal(repo.createCalls, 1);
  assert.equal(a.worldId, b.worldId);
  assert.equal(a.ownerId, "owner-first-load");
  assert.equal(b.ownerId, "owner-first-load");
});


test("first-load create race recovers by loading the world committed by another process", async () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  class OwnerRaceRepo implements WorldRepository {
    winner: WorldState | null = null;
    createCalls = 0;

    async findByOwner(ownerId: string): Promise<WorldState | null> {
      return this.winner?.ownerId === ownerId ? this.winner : null;
    }
    async findById(worldId: string): Promise<WorldState | null> {
      return this.winner?.worldId === worldId ? this.winner : null;
    }
    async findAcceptedCommand(): Promise<AcceptedCommandReceipt | null> {
      return null;
    }
    async create(candidate: WorldState): Promise<void> {
      this.createCalls += 1;
      this.winner = {
        ...candidate,
        worldId:"winner-world-id",
        revision:3,
      };
      throw new Error("WORLD_OWNER_EXISTS");
    }
    async save(): Promise<void> {
      throw new Error("UNEXPECTED_SAVE");
    }
  }

  const repo = new OwnerRaceRepo();
  const service = new WorldService({
    repository:repo,
    definitions:defs,
    ids:new Ids(),
    clock:new FakeClock(now),
  });

  const result = await service.getOrCreate("owner-cross-process-race");

  assert.equal(repo.createCalls, 1);
  assert.equal(result.worldId, "winner-world-id");
  assert.equal(result.ownerId, "owner-cross-process-race");
  assert.equal(result.revision, 3);
});


test("application rejects an unknown runtime command without persisting", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-unknown-command",
    ownerId:"owner-unknown-command",
    seed:7,
    revision:1,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[building("tc","town_center")],
    roads:[], blockers:[], props:[], combat:null, events:[],
  };

  const repo = new Repo(world);
  const service = new WorldService({
    repository: repo,
    definitions: defs,
    ids: new Ids(),
    clock: new FakeClock(base),
  });

  await assert.rejects(
    () => service.command("owner-unknown-command", {
      type:"ADMIN_GIVE_MONEY",
      commandId:"runtime-bypass",
      expectedRevision:1,
      payload:{ amount:999999 },
    } as never),
    /UNKNOWN_COMMAND/,
  );

  assert.equal(repo.saveCalls, 0);
  assert.equal(repo.world.revision, 1);
  assert.equal(repo.world.resources.money, 1200);
});


test("read projection checkpoints periodically without writing on every poll", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-periodic-checkpoint",
    ownerId:"owner-periodic-checkpoint",
    seed:8,
    revision:3,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[building("tc","town_center")],
    roads:[], blockers:[], props:[], combat:null, events:[],
  };

  const repo = new Repo(world);
  const clock = new FakeClock(new Date(base.getTime() + 301_000));
  const service = new WorldService({
    repository:repo,
    definitions:defs,
    ids:new Ids(),
    clock,
  });

  const checkpointed = await service.getOrCreate("owner-periodic-checkpoint");

  assert.equal(checkpointed.revision, 4);
  assert.equal(repo.world.revision, 4);
  assert.ok(repo.world.simulationSeconds >= 301);
  assert.equal(repo.saveCalls, 1);

  clock.value = new Date(clock.value.getTime() + 1000);
  const projected = await service.getOrCreate("owner-periodic-checkpoint");

  assert.equal(projected.revision, 4);
  assert.ok(projected.simulationSeconds > repo.world.simulationSeconds);
  assert.equal(repo.saveCalls, 1);
});

test("combat resolution seen through a read is checkpointed with aftermath event exactly once", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const combatDefs: SimulationDefinitions = {
    ...defs,
    defenders: {
      town_warden: {
        id:"town_warden",
        side:"DEFENDER",
        hp:100,
        dps:100,
        armor:0,
        target:"ground",
        class:"warden",
      },
    },
    enemies: {
      nibbler: {
        id:"nibbler",
        side:"ENEMY",
        hp:1,
        dps:0,
        armor:0,
        target:"ground",
        class:"melee",
      },
    },
  };
  const world: WorldState = {
    worldId:"world-combat-checkpoint",
    ownerId:"owner-combat-checkpoint",
    seed:9,
    revision:11,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[building("tc","town_center")],
    roads:[], blockers:[], props:[],
    combat:{
      id:"combat-live",
      status:"ACTIVE",
      warningRemainingSeconds:0,
      elapsedSeconds:0,
      actors:[
        {
          id:"warden-live",
          definitionId:"town_warden",
          side:"DEFENDER",
          hp:100,
          maxHp:100,
          position:{x:0,y:0,z:0},
        },
        {
          id:"enemy-live",
          definitionId:"nibbler",
          side:"ENEMY",
          hp:1,
          maxHp:1,
          position:{x:0,y:0,z:1},
        },
      ],
    },
    events:[],
  };

  const repo = new Repo(world);
  const clock = new FakeClock(new Date(base.getTime() + 1000));
  const service = new WorldService({
    repository:repo,
    definitions:combatDefs,
    ids:new Ids(),
    clock,
  });

  const resolved = await service.getOrCreate("owner-combat-checkpoint");

  assert.equal(resolved.revision, 12);
  assert.equal(resolved.combat?.status, "RESOLVED");
  assert.equal(resolved.combat?.outcome, "CLEAN");
  assert.equal(resolved.events.length, 1);
  assert.equal(resolved.events[0]?.type, "COMBAT_RESOLVED");
  assert.equal(repo.world.revision, 12);
  assert.equal(repo.world.events.length, 1);
  assert.equal(repo.saveCalls, 1);

  clock.value = new Date(clock.value.getTime() + 1000);
  const reread = await service.getOrCreate("owner-combat-checkpoint");

  assert.equal(reread.events.length, 1);
  assert.equal(reread.events[0]?.id, resolved.events[0]?.id);
  assert.equal(repo.saveCalls, 1);
});

test("read checkpoint CAS race reloads the committed winner instead of overwriting it", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-read-race",
    ownerId:"owner-read-race",
    seed:10,
    revision:6,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[building("tc","town_center")],
    roads:[], blockers:[], props:[], combat:null, events:[],
  };

  class CheckpointRaceRepo extends Repo {
    override async save(
      next: WorldState,
      previousRevision: number,
      acceptedCommand?: AcceptedCommandContext,
    ): Promise<void> {
      assert.equal(acceptedCommand, undefined);
      assert.equal(previousRevision, 6);
      this.saveCalls += 1;
      this.world = {
        ...next,
        revision:7,
        speed:2,
      };
      throw new Error("REVISION_CONFLICT");
    }
  }

  const repo = new CheckpointRaceRepo(world);
  const clock = new FakeClock(new Date(base.getTime() + 301_000));
  const service = new WorldService({
    repository:repo,
    definitions:defs,
    ids:new Ids(),
    clock,
  });

  const result = await service.getOrCreate("owner-read-race");

  assert.equal(repo.saveCalls, 1);
  assert.equal(result.revision, 7);
  assert.equal(result.speed, 2);
});


test("legacy world without weather is normalized and weather transition checkpoints", async () => {
  const base = new Date("2026-09-21T12:00:00.000Z");
  const world: WorldState = {
    worldId:"world-weather-migration",
    ownerId:"owner-weather-migration",
    seed:77,
    revision:2,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:base.toISOString(),
    resources:{money:1200,moneyCap:5000,power:60,powerCap:120,water:60,waterCap:120,varum:0,varumCap:0,techPoints:0,techTier:0},
    society:{population:12,housingCapacity:12,happiness:80,growthProgress:0,workforce:9,assignedWorkers:0,educationCoverage:0,recreationCoverage:0,safety:0.5,beauty:0},
    buildings:[building("tc-weather","town_center")],
    roads:[], blockers:[], props:[], combat:null, events:[],
  };
  const repo = new Repo(world);
  const clock = new FakeClock(new Date(base.getTime() + 2500));
  const service = new WorldService({
    repository:repo,
    definitions:defsWithWeather,
    ids:new Ids(),
    clock,
  });

  const result = await service.getOrCreate("owner-weather-migration");

  assert.ok(result.weather);
  assert.ok((result.weather?.episodeIndex ?? 0) >= 2);
  assert.equal(result.revision, 3);
  assert.equal(repo.saveCalls, 1);
  assert.ok(repo.world.weather);
  assert.equal(repo.world.weather?.episodeIndex, result.weather?.episodeIndex);
});
