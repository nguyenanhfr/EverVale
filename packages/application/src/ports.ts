import type { WorldState } from "@evervale/domain/world.types";

export interface AcceptedCommandReceipt {
  commandId: string;
  worldId: string;
  ownerId: string;
  expectedRevision: number;
  commandType: string;
  fingerprint: string;
  world: WorldState;
}

export interface AcceptedCommandContext {
  commandId: string;
  ownerId: string;
  expectedRevision: number;
  commandType: string;
  fingerprint: string;
}

export interface WorldRepository {
  findByOwner(ownerId: string): Promise<WorldState | null>;
  findById(worldId: string): Promise<WorldState | null>;
  findAcceptedCommand(commandId: string): Promise<AcceptedCommandReceipt | null>;
  create(world: WorldState): Promise<void>;
  save(
    world: WorldState,
    previousRevision: number,
    acceptedCommand?: AcceptedCommandContext,
  ): Promise<void>;
  close?(): Promise<void>;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface Clock {
  now(): Date;
}
