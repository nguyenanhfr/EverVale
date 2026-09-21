import {
  advanceWorld,
  advanceWorldWithAllocator,
  type WorkforceAllocator,
} from "@evervale/domain/advance-world";
import { queueBlockerClear } from "@evervale/domain/blockers";
import { applyCombatAftermath } from "@evervale/domain/combat-aftermath";
import { triggerM1Wave } from "@evervale/domain/combat";
import { placeBuilding } from "@evervale/domain/construction";
import { queueRepair } from "@evervale/domain/repair";
import { deleteProp, moveProp, placeProp, rotateProp } from "@evervale/domain/props";
import { drawRoad } from "@evervale/domain/roads";
import type { SimulationDefinitions, WorldState } from "@evervale/domain/world.types";
import type { WorldCommand } from "@evervale/protocol/world";
import { createStarterWorld } from "./create-starter-world.js";
import type { Clock, IdGenerator, WorldRepository } from "./ports.js";

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function commandFingerprint(ownerId: string, command: WorldCommand): string {
  return stableJson({
    ownerId,
    expectedRevision: command.expectedRevision,
    type: command.type,
    payload: command.payload,
  });
}

const READ_CHECKPOINT_SECONDS = 5 * 60;

function materialSimulationBoundaryCrossed(before: WorldState, after: WorldState): boolean {
  if (
    before.combat?.id !== after.combat?.id ||
    before.combat?.status !== after.combat?.status ||
    before.combat?.outcome !== after.combat?.outcome
  ) {
    return true;
  }

  if (before.events.at(-1)?.id !== after.events.at(-1)?.id) return true;
  if (before.resources.techTier !== after.resources.techTier) return true;
  if (before.society.population !== after.society.population) return true;

  const beforeBuildings = new Map(before.buildings.map((building) => [building.id, building]));
  for (const building of after.buildings) {
    const previous = beforeBuildings.get(building.id);
    if (
      previous &&
      (
        previous.constructionState !== building.constructionState ||
        previous.damageState !== building.damageState
      )
    ) {
      return true;
    }
  }

  const beforeBlockers = new Map(before.blockers.map((blocker) => [blocker.id, blocker]));
  if (beforeBlockers.size !== after.blockers.length) return true;
  for (const blocker of after.blockers) {
    const previous = beforeBlockers.get(blocker.id);
    if (previous && previous.state !== blocker.state) return true;
  }

  return false;
}

export interface WorldServiceOptions {
  repository: WorldRepository;
  definitions: SimulationDefinitions;
  ids: IdGenerator;
  clock: Clock;
  workforceAllocator?: WorkforceAllocator;
}

export class WorldService {
  private readonly ownerQueues = new Map<string, Promise<unknown>>();

  constructor(private readonly options: WorldServiceOptions) {}

  private async serializeOwner<T>(ownerId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.ownerQueues.get(ownerId) ?? Promise.resolve();
    const run = previous
      .catch(() => undefined)
      .then(operation);
    this.ownerQueues.set(ownerId, run);
    try {
      return await run;
    } finally {
      if (this.ownerQueues.get(ownerId) === run) {
        this.ownerQueues.delete(ownerId);
      }
    }
  }

  async getOrCreate(ownerId: string): Promise<WorldState> {
    return this.serializeOwner(ownerId, () => this.getOrCreateUnlocked(ownerId));
  }

  private async getOrCreateUnlocked(ownerId: string): Promise<WorldState> {
    const loaded = await this.options.repository.findByOwner(ownerId);
    const existing = loaded ? this.normalizeWorld(loaded) : null;
    if (!existing) {
      const now = this.options.clock.now();
      const seed = Math.abs([...ownerId].reduce((a, c) => ((a * 31 + c.charCodeAt(0)) | 0), 17));
      const created = createStarterWorld(
        ownerId,
        seed,
        this.options.definitions,
        this.options.ids,
        now,
      );
      try {
        await this.options.repository.create(created);
        return created;
      } catch (error) {
        if (error instanceof Error && error.message === "WORLD_OWNER_EXISTS") {
          const winner = await this.options.repository.findByOwner(ownerId);
          if (winner) {
            return this.advanceRead(
              this.normalizeWorld(winner),
              this.options.clock.now(),
            );
          }
        }
        throw error;
      }
    }
    return this.advanceRead(existing, this.options.clock.now());
  }

  private async advanceRead(stored: WorldState, now: Date): Promise<WorldState> {
    const then = new Date(stored.lastSimulatedAt);
    const elapsed = Math.max(0, (now.getTime() - then.getTime()) / 1000);
    const advanced = this.advanceState(stored, now);

    const periodicCheckpoint =
      stored.speed > 0 &&
      elapsed >= READ_CHECKPOINT_SECONDS;
    const materialCheckpoint = materialSimulationBoundaryCrossed(stored, advanced);

    if (!periodicCheckpoint && !materialCheckpoint) return advanced;

    const checkpoint = {
      ...advanced,
      revision: stored.revision + 1,
    };

    try {
      await this.options.repository.save(checkpoint, stored.revision);
      return checkpoint;
    } catch (error) {
      if (error instanceof Error && error.message === "REVISION_CONFLICT") {
        const winner = await this.options.repository.findByOwner(stored.ownerId);
        if (winner) {
          return this.advanceState(this.normalizeWorld(winner), now);
        }
      }
      throw error;
    }
  }

  async command(ownerId: string, command: WorldCommand): Promise<WorldState> {
    return this.serializeOwner(ownerId, () => this.commandUnlocked(ownerId, command));
  }

  private async commandUnlocked(ownerId: string, command: WorldCommand): Promise<WorldState> {
    const fingerprint = commandFingerprint(ownerId, command);
    const existingReceipt = await this.options.repository.findAcceptedCommand(command.commandId);
    if (existingReceipt) {
      if (
        existingReceipt.ownerId !== ownerId ||
        existingReceipt.commandType !== command.type ||
        existingReceipt.expectedRevision !== command.expectedRevision ||
        existingReceipt.fingerprint !== fingerprint
      ) {
        throw new Error("COMMAND_ID_CONFLICT");
      }
      return this.normalizeWorld(existingReceipt.world);
    }

    const loaded = await this.options.repository.findByOwner(ownerId);
    let stored = loaded ? this.normalizeWorld(loaded) : null;
    if (!stored) {
      stored = await this.getOrCreateUnlocked(ownerId);
    }

    if (command.expectedRevision !== stored.revision) throw new Error("REVISION_CONFLICT");

    const previousRevision = stored.revision;
    const now = this.options.clock.now();
    let world = this.advanceState(stored, now);

    switch (command.type) {
      case "PLACE_BUILDING":
        world = placeBuilding(world, this.options.definitions, {
          instanceId: this.options.ids.next("building"),
          definitionId: command.payload.definitionId,
          x: command.payload.x,
          z: command.payload.z,
          ...(command.payload.rotationY !== undefined ? { rotationY: command.payload.rotationY } : {}),
        });
        break;
      case "PLACE_PROP":
        world = placeProp(world, this.options.definitions, {
          propId: this.options.ids.next("prop"),
          definitionId: command.payload.definitionId,
          x: command.payload.x,
          z: command.payload.z,
          ...(command.payload.rotationY !== undefined ? { rotationY: command.payload.rotationY } : {}),
        });
        break;
      case "MOVE_PROP":
        world = moveProp(
          world,
          this.options.definitions,
          command.payload.propId,
          command.payload.x,
          command.payload.z,
        );
        break;
      case "ROTATE_PROP":
        world = rotateProp(
          world,
          this.options.definitions,
          command.payload.propId,
          command.payload.rotationY,
        );
        break;
      case "DELETE_PROP":
        world = deleteProp(world, command.payload.propId);
        break;
      case "DRAW_ROAD":
        world = drawRoad(world, {
          roadId: this.options.ids.next("road"),
          ...command.payload,
        });
        break;
      case "SET_SPEED":
        world = { ...world, revision: world.revision + 1, speed: command.payload.speed };
        break;
      case "CLEAR_BLOCKER":
        world = queueBlockerClear(world, this.options.definitions, command.payload.blockerId);
        break;
      case "REPAIR_BUILDING":
        world = queueRepair(world, command.payload.buildingId);
        break;
      case "TRIGGER_TEST_WAVE":
        world = triggerM1Wave(
          world,
          this.options.definitions,
          (prefix) => this.options.ids.next(prefix),
        );
        break;
      default:
        throw new Error("UNKNOWN_COMMAND");
    }

    world = {
      ...world,
      lastSimulatedAt: now.toISOString(),
    };

    try {
      await this.options.repository.save(world, previousRevision, {
        commandId: command.commandId,
        ownerId,
        expectedRevision: command.expectedRevision,
        commandType: command.type,
        fingerprint,
      });
      return world;
    } catch (error) {
      if (error instanceof Error && error.message === "REVISION_CONFLICT") {
        const racedReceipt = await this.options.repository.findAcceptedCommand(command.commandId);
        if (
          racedReceipt &&
          racedReceipt.ownerId === ownerId &&
          racedReceipt.commandType === command.type &&
          racedReceipt.expectedRevision === command.expectedRevision &&
          racedReceipt.fingerprint === fingerprint
        ) {
          return this.normalizeWorld(racedReceipt.world);
        }
      }
      throw error;
    }
  }

  private normalizeWorld(world: WorldState): WorldState {
    return {
      ...world,
      roads: world.roads ?? [],
      blockers: world.blockers ?? [],
      props: world.props ?? [],
      buildings: world.buildings.map((building) => {
        const definition = this.options.definitions.buildings[building.definitionId];
        const inferredTotal = (definition?.buildCycles ?? 0) * this.options.definitions.referenceCycleSeconds;
        return {
          ...building,
          constructionTotalSeconds:
            building.constructionTotalSeconds ??
            (building.constructionState === "BUILDING"
              ? Math.max(building.constructionRemainingSeconds, inferredTotal)
              : 0),
        };
      }),
      society: {
        ...world.society,
        beauty: world.society.beauty ?? 0,
      },
      events: world.events ?? [],
    };
  }

  private advanceState(world: WorldState, now: Date): WorldState {
    const then = new Date(world.lastSimulatedAt);
    const elapsed = Math.max(0, (now.getTime() - then.getTime()) / 1000);
    if (elapsed < 0.25) return world;

    const capped = Math.min(elapsed, 7 * 24 * 60 * 60);
    const previousCombatStatus = world.combat?.status;
    let advanced = this.options.workforceAllocator
      ? advanceWorldWithAllocator(
          world,
          this.options.definitions,
          capped,
          this.options.workforceAllocator,
        )
      : advanceWorld(world, this.options.definitions, capped);

    const newlyResolved =
      previousCombatStatus !== "RESOLVED" &&
      advanced.combat?.status === "RESOLVED" &&
      advanced.combat.outcome;

    if (newlyResolved && advanced.combat?.outcome) {
      const outcome = advanced.combat.outcome;
      advanced = applyCombatAftermath(advanced, outcome);
      advanced = {
        ...advanced,
        events: [
          ...advanced.events.slice(-49),
          {
            id: this.options.ids.next("event"),
            type: "COMBAT_RESOLVED",
            happenedAt: now.toISOString(),
            severity: outcome === "BREACH" ? 2 : outcome === "COSTLY" ? 1 : 0,
            summary:
              outcome === "CLEAN"
                ? "Threat repelled cleanly."
                : outcome === "COSTLY"
                  ? "Threat repelled, but the town suffered damage."
                  : "The defense line was breached; repairs are required.",
          },
        ],
      };
    }

    return {
      ...advanced,
      lastSimulatedAt: now.toISOString(),
    };
  }

}

