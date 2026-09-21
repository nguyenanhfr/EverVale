import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AcceptedCommandContext,
  AcceptedCommandReceipt,
  WorldRepository,
} from "@evervale/application/ports";
import type { WorldState } from "@evervale/domain/world.types";
import {
  decodeWorldDocument,
  encodeWorldEnvelope,
  validateAcceptedCommandReceipt,
  validateWorldState,
} from "./world-state-integrity.js";

function isIntegrityFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message === "WORLD_STATE_CORRUPT" ||
    error.message === "WORLD_STATE_CHECKSUM_MISMATCH" ||
    error.message === "WORLD_SCHEMA_UNSUPPORTED"
  );
}

export class JsonWorldRepository implements WorldRepository {
  constructor(private readonly directory: string) {}

  private file(worldId: string): string {
    return path.join(this.directory, `${worldId}.json`);
  }

  private backupFile(worldId: string): string {
    return path.join(this.directory, `${worldId}.json.bak`);
  }

  private commandsDirectory(): string {
    return path.join(this.directory, "commands");
  }

  private commandFile(commandId: string): string {
    return path.join(this.commandsDirectory(), `${encodeURIComponent(commandId)}.json`);
  }

  private async ensure(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await mkdir(this.commandsDirectory(), { recursive: true });
  }

  private async atomicWrite(file: string, content: string): Promise<void> {
    const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temp, content, "utf8");
    await rename(temp, file);
  }

  private async readWorldFile(
    primary: string,
    backup: string,
  ): Promise<WorldState> {
    let raw: string;
    try {
      raw = await readFile(primary, "utf8");
    } catch (error) {
      throw error;
    }

    try {
      return decodeWorldDocument(raw).world;
    } catch (error) {
      if (!isIntegrityFailure(error)) throw error;

      let backupRaw: string;
      try {
        backupRaw = await readFile(backup, "utf8");
      } catch {
        throw error;
      }

      try {
        const recovered = decodeWorldDocument(backupRaw).world;
        await this.atomicWrite(primary, backupRaw);
        return recovered;
      } catch {
        throw error;
      }
    }
  }

  async findByOwner(ownerId: string): Promise<WorldState | null> {
    await this.ensure();
    for (const file of await readdir(this.directory)) {
      if (!file.endsWith(".json")) continue;
      const worldId = file.slice(0, -".json".length);
      const world = await this.readWorldFile(
        path.join(this.directory, file),
        this.backupFile(worldId),
      );
      if (world.ownerId === ownerId) return world;
    }
    return null;
  }

  async findById(worldId: string): Promise<WorldState | null> {
    try {
      return await this.readWorldFile(this.file(worldId), this.backupFile(worldId));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return null;
      throw error;
    }
  }

  async findAcceptedCommand(commandId: string): Promise<AcceptedCommandReceipt | null> {
    try {
      const parsed = JSON.parse(
        await readFile(this.commandFile(commandId), "utf8"),
      ) as unknown;
      return validateAcceptedCommandReceipt(parsed);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return null;
      if (error instanceof SyntaxError) throw new Error("WORLD_COMMAND_RECEIPT_CORRUPT");
      throw error;
    }
  }

  async create(world: WorldState): Promise<void> {
    await this.ensure();
    const validated = validateWorldState(world);
    if (await this.findById(validated.worldId)) throw new Error("WORLD_ALREADY_EXISTS");
    if (await this.findByOwner(validated.ownerId)) throw new Error("WORLD_OWNER_EXISTS");

    const encoded = encodeWorldEnvelope(validated);
    await this.atomicWrite(this.file(validated.worldId), encoded);
    await this.atomicWrite(this.backupFile(validated.worldId), encoded);
  }

  async save(
    world: WorldState,
    previousRevision: number,
    acceptedCommand?: AcceptedCommandContext,
  ): Promise<void> {
    await this.ensure();
    const validated = validateWorldState(world);
    const current = await this.findById(validated.worldId);
    if (!current) throw new Error("WORLD_NOT_FOUND");
    if (current.revision !== previousRevision) throw new Error("REVISION_CONFLICT");

    const encoded = encodeWorldEnvelope(validated);
    await this.atomicWrite(this.file(validated.worldId), encoded);
    await this.atomicWrite(this.backupFile(validated.worldId), encoded);

    if (acceptedCommand) {
      const receipt = validateAcceptedCommandReceipt({
        ...acceptedCommand,
        worldId: validated.worldId,
        world: validated,
      });
      await this.atomicWrite(
        this.commandFile(acceptedCommand.commandId),
        JSON.stringify(receipt, null, 2),
      );
    }
  }
}
