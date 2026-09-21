import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type {
  AcceptedCommandContext,
  AcceptedCommandReceipt,
  WorldRepository,
} from "@evervale/application/ports";
import type { WorldState } from "@evervale/domain/world.types";
import {
  WORLD_SCHEMA_VERSION,
  validateAcceptedCommandReceipt,
  validateSchemaVersion,
  validateWorldState,
} from "./world-state-integrity.js";

const SNAPSHOT_RETENTION = 50;

interface SnapshotRow {
  world_id: string;
  owner_id: string;
  world_revision: string | number;
  snapshot_revision: string | number;
  schema_version: string | number;
  snapshot: unknown;
}

export interface SnapshotIntegrityReport {
  revision: number;
  status: "VALID" | "CORRUPT";
  error?: string;
}

function loadedWorld(row: SnapshotRow): WorldState {
  validateSchemaVersion(Number(row.schema_version));
  const world = validateWorldState(row.snapshot);
  const worldRevision = Number(row.world_revision);
  const snapshotRevision = Number(row.snapshot_revision);

  if (
    world.worldId !== row.world_id ||
    world.ownerId !== row.owner_id ||
    world.revision !== snapshotRevision ||
    snapshotRevision !== worldRevision
  ) {
    throw new Error("WORLD_STATE_CORRUPT");
  }
  return world;
}

function snapshotWorld(
  worldId: string,
  ownerId: string,
  revision: number,
  schemaVersion: number,
  snapshot: unknown,
): WorldState {
  validateSchemaVersion(schemaVersion);
  const world = validateWorldState(snapshot);
  if (
    world.worldId !== worldId ||
    world.ownerId !== ownerId ||
    world.revision !== revision
  ) {
    throw new Error("WORLD_STATE_CORRUPT");
  }
  return world;
}

export class PostgresWorldRepository implements WorldRepository {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async findByOwner(ownerId: string): Promise<WorldState | null> {
    const result = await this.pool.query<SnapshotRow>(
      `
      SELECT
        w.id::text AS world_id,
        m.user_id AS owner_id,
        w.revision AS world_revision,
        w.schema_version,
        s.revision AS snapshot_revision,
        s.snapshot
      FROM world_memberships m
      JOIN worlds w ON w.id = m.world_id
      JOIN LATERAL (
        SELECT revision, snapshot
        FROM world_snapshots
        WHERE world_id = w.id
        ORDER BY revision DESC
        LIMIT 1
      ) s ON true
      WHERE m.user_id = $1 AND m.role = 'OWNER'
      LIMIT 1
      `,
      [ownerId],
    );
    const row = result.rows[0];
    return row ? loadedWorld(row) : null;
  }

  async findById(worldId: string): Promise<WorldState | null> {
    const result = await this.pool.query<SnapshotRow>(
      `
      SELECT
        w.id::text AS world_id,
        m.user_id AS owner_id,
        w.revision AS world_revision,
        w.schema_version,
        s.revision AS snapshot_revision,
        s.snapshot
      FROM worlds w
      JOIN world_memberships m
        ON m.world_id = w.id AND m.role = 'OWNER'
      JOIN LATERAL (
        SELECT revision, snapshot
        FROM world_snapshots
        WHERE world_id = w.id
        ORDER BY revision DESC
        LIMIT 1
      ) s ON true
      WHERE w.id = $1
      LIMIT 1
      `,
      [worldId],
    );
    const row = result.rows[0];
    return row ? loadedWorld(row) : null;
  }

  async findAcceptedCommand(commandId: string): Promise<AcceptedCommandReceipt | null> {
    const result = await this.pool.query<{
      command_id: string;
      world_id: string;
      user_id: string;
      expected_revision: string | number | null;
      command_type: string;
      result: { world?: unknown; fingerprint?: unknown };
    }>(
      `SELECT command_id, world_id, user_id, expected_revision, command_type, result
       FROM world_commands
       WHERE command_id = $1 AND status = 'ACCEPTED'
       LIMIT 1`,
      [commandId],
    );
    const row = result.rows[0];
    if (!row || row.result?.world === undefined) return null;

    return validateAcceptedCommandReceipt({
      commandId: row.command_id,
      worldId: row.world_id,
      ownerId: row.user_id,
      expectedRevision: Number(row.expected_revision ?? 0),
      commandType: row.command_type,
      fingerprint: row.result.fingerprint,
      world: row.result.world,
    });
  }

  async create(world: WorldState): Promise<void> {
    const validated = validateWorldState(world);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO worlds
          (id, seed, revision, state, speed, simulation_version, balance_version, schema_version, last_simulated_at)
         VALUES ($1, $2, $3, $4, $5, 'm1', '0.2', $6, $7)`,
        [
          validated.worldId,
          validated.seed,
          validated.revision,
          validated.lifecycle,
          validated.speed,
          WORLD_SCHEMA_VERSION,
          validated.lastSimulatedAt,
        ],
      );
      await client.query(
        `INSERT INTO world_memberships (world_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
        [validated.worldId, validated.ownerId],
      );
      await this.insertSnapshot(client, validated);
      await this.insertEvents(client, validated);
      await this.pruneSnapshots(client, validated.worldId);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      const pgError = error as { code?: string; constraint?: string };
      if (
        pgError.code === "23505" &&
        pgError.constraint === "world_owner_user_unique_idx"
      ) {
        throw new Error("WORLD_OWNER_EXISTS");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async save(
    world: WorldState,
    previousRevision: number,
    acceptedCommand?: AcceptedCommandContext,
  ): Promise<void> {
    const validated = validateWorldState(world);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query(
        `UPDATE worlds
         SET revision = $2, state = $3, speed = $4, last_simulated_at = $5,
             schema_version = $6, updated_at = now()
         WHERE id = $1 AND revision = $7 AND schema_version = $6`,
        [
          validated.worldId,
          validated.revision,
          validated.lifecycle,
          validated.speed,
          validated.lastSimulatedAt,
          WORLD_SCHEMA_VERSION,
          previousRevision,
        ],
      );
      if (updated.rowCount !== 1) {
        const current = await client.query<{ revision: string | number; schema_version: number }>(
          "SELECT revision, schema_version FROM worlds WHERE id = $1",
          [validated.worldId],
        );
        const row = current.rows[0];
        if (row && Number(row.schema_version) !== WORLD_SCHEMA_VERSION) {
          throw new Error("WORLD_SCHEMA_UNSUPPORTED");
        }
        throw new Error("REVISION_CONFLICT");
      }
      await this.insertSnapshot(client, validated);
      await this.insertEvents(client, validated);
      await this.pruneSnapshots(client, validated.worldId);
      if (acceptedCommand) {
        const receipt = validateAcceptedCommandReceipt({
          ...acceptedCommand,
          worldId: validated.worldId,
          world: validated,
        });
        await client.query(
          `INSERT INTO world_commands
            (command_id, world_id, user_id, expected_revision, command_type, status, result)
           VALUES ($1::uuid, $2, $3, $4, $5, 'ACCEPTED', $6::jsonb)`,
          [
            receipt.commandId,
            receipt.worldId,
            receipt.ownerId,
            receipt.expectedRevision,
            receipt.commandType,
            JSON.stringify({ world: receipt.world, fingerprint: receipt.fingerprint }),
          ],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async inspectSnapshots(worldId: string): Promise<SnapshotIntegrityReport[]> {
    const meta = await this.pool.query<{
      owner_id: string;
      schema_version: string | number;
    }>(
      `
      SELECT m.user_id AS owner_id, w.schema_version
      FROM worlds w
      JOIN world_memberships m ON m.world_id = w.id AND m.role = 'OWNER'
      WHERE w.id = $1
      LIMIT 1
      `,
      [worldId],
    );
    const metadata = meta.rows[0];
    if (!metadata) throw new Error("WORLD_NOT_FOUND");
    validateSchemaVersion(Number(metadata.schema_version));

    const snapshots = await this.pool.query<{
      revision: string | number;
      snapshot: unknown;
    }>(
      `SELECT revision, snapshot
       FROM world_snapshots
       WHERE world_id = $1
       ORDER BY revision DESC
       LIMIT $2`,
      [worldId, SNAPSHOT_RETENTION],
    );

    return snapshots.rows.map((row) => {
      const revision = Number(row.revision);
      try {
        snapshotWorld(
          worldId,
          metadata.owner_id,
          revision,
          WORLD_SCHEMA_VERSION,
          row.snapshot,
        );
        return { revision, status: "VALID" as const };
      } catch (error) {
        return {
          revision,
          status: "CORRUPT" as const,
          error: error instanceof Error ? error.message : "WORLD_STATE_CORRUPT",
        };
      }
    });
  }

  async recoverFromSnapshot(worldId: string, sourceRevision: number): Promise<WorldState> {
    if (!Number.isSafeInteger(sourceRevision) || sourceRevision < 0) {
      throw new Error("INVALID_RECOVERY_REVISION");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const meta = await client.query<{
        revision: string | number;
        schema_version: string | number;
        owner_id: string;
      }>(
        `
        SELECT w.revision, w.schema_version, m.user_id AS owner_id
        FROM worlds w
        JOIN world_memberships m ON m.world_id = w.id AND m.role = 'OWNER'
        WHERE w.id = $1
        FOR UPDATE OF w
        `,
        [worldId],
      );
      const metadata = meta.rows[0];
      if (!metadata) throw new Error("WORLD_NOT_FOUND");
      validateSchemaVersion(Number(metadata.schema_version));

      const currentRevision = Number(metadata.revision);
      if (sourceRevision > currentRevision) throw new Error("INVALID_RECOVERY_REVISION");

      const sourceResult = await client.query<{ snapshot: unknown }>(
        `SELECT snapshot
         FROM world_snapshots
         WHERE world_id = $1 AND revision = $2
         LIMIT 1`,
        [worldId, sourceRevision],
      );
      const sourceSnapshot = sourceResult.rows[0]?.snapshot;
      if (sourceSnapshot === undefined) throw new Error("RECOVERY_SNAPSHOT_NOT_FOUND");

      const source = snapshotWorld(
        worldId,
        metadata.owner_id,
        sourceRevision,
        WORLD_SCHEMA_VERSION,
        sourceSnapshot,
      );

      const happenedAt = new Date().toISOString();
      const recovered: WorldState = validateWorldState({
        ...source,
        revision: currentRevision + 1,
        events: [
          ...source.events.slice(-49),
          {
            id: randomUUID(),
            type: "WORLD_RECOVERED",
            happenedAt,
            severity: 2,
            summary: `World recovered from snapshot revision ${sourceRevision} after integrity failure.`,
          },
        ],
      });

      await client.query(
        `UPDATE worlds
         SET revision = $2, state = $3, speed = $4, last_simulated_at = $5,
             schema_version = $6, updated_at = now()
         WHERE id = $1`,
        [
          worldId,
          recovered.revision,
          recovered.lifecycle,
          recovered.speed,
          recovered.lastSimulatedAt,
          WORLD_SCHEMA_VERSION,
        ],
      );

      await client.query(
        `DELETE FROM world_commands
         WHERE world_id = $1 AND expected_revision >= $2`,
        [worldId, sourceRevision],
      );
      await client.query(
        `DELETE FROM world_events
         WHERE world_id = $1 AND revision > $2`,
        [worldId, sourceRevision],
      );

      await this.insertSnapshot(client, recovered);
      await this.insertEvents(client, recovered);
      await this.pruneSnapshots(client, worldId);
      await client.query("COMMIT");
      return recovered;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertEvents(client: PoolClient, world: WorldState): Promise<void> {
    for (const event of world.events) {
      await client.query(
        `INSERT INTO world_events
          (id, world_id, revision, event_type, happened_at, severity, entity_ids, data, player_summary)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, '[]'::jsonb, '{}'::jsonb, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          event.id,
          world.worldId,
          world.revision,
          event.type,
          event.happenedAt,
          event.severity,
          event.summary,
        ],
      );
    }
  }

  private async pruneSnapshots(client: PoolClient, worldId: string): Promise<void> {
    await client.query(
      `DELETE FROM world_snapshots
       WHERE id IN (
         SELECT id
         FROM world_snapshots
         WHERE world_id = $1
         ORDER BY revision DESC
         OFFSET $2
       )`,
      [worldId, SNAPSHOT_RETENTION],
    );
  }

  private async insertSnapshot(client: PoolClient, world: WorldState): Promise<void> {
    const validated = validateWorldState(world);
    await client.query(
      `INSERT INTO world_snapshots (world_id, revision, snapshot)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (world_id, revision)
       DO UPDATE SET snapshot = EXCLUDED.snapshot`,
      [validated.worldId, validated.revision, JSON.stringify(validated)],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
