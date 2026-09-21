import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import type { WorldState } from "@evervale/domain/world.types";
import { PostgresWorldRepository } from "./postgres-world-repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

function makeWorld(ownerId: string, worldId: string): WorldState {
  return {
    worldId,
    ownerId,
    seed:42,
    revision:0,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:0,
    lastSimulatedAt:"2026-09-21T12:00:00.000Z",
    resources:{
      money:1200,moneyCap:5000,power:60,powerCap:120,
      water:60,waterCap:120,varum:0,varumCap:0,
      techPoints:0,techTier:0,
    },
    society:{
      population:12,housingCapacity:12,happiness:80,growthProgress:0,
      workforce:9,assignedWorkers:0,educationCoverage:0,
      recreationCoverage:0,safety:0.5,beauty:0,
    },
    buildings:[],
    roads:[],
    blockers:[],
    props:[],
    combat:null,
    events:[],
  };
}

test("Postgres repository enforces M1 persistence invariants", async () => {
  const ownerId = `ci-owner-${randomUUID()}`;
  const worldId = randomUUID();
  const repository = new PostgresWorldRepository(databaseUrl);
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    let current = makeWorld(ownerId, worldId);
    await repository.create(current);

    const loaded = await repository.findByOwner(ownerId);
    assert.equal(loaded?.worldId, worldId);
    assert.equal(loaded?.revision, 0);

    const eventId = randomUUID();
    const commandId = randomUUID();
    current = {
      ...current,
      revision:1,
      speed:2,
      events:[{
        id:eventId,
        type:"CI_EVENT",
        happenedAt:"2026-09-21T12:00:01.000Z",
        severity:1,
        summary:"Postgres integration event.",
      }],
    };

    await repository.save(current, 0, {
      commandId,
      ownerId,
      expectedRevision:0,
      commandType:"SET_SPEED",
      fingerprint:"ci-fingerprint",
    });

    const receipt = await repository.findAcceptedCommand(commandId);
    assert.ok(receipt);
    assert.equal(receipt.world.revision, 1);
    assert.equal(receipt.fingerprint, "ci-fingerprint");

    await assert.rejects(
      () => repository.save({ ...current, revision:2 }, 0),
      /REVISION_CONFLICT/,
    );

    const duplicateOwnerWorld = makeWorld(ownerId, randomUUID());
    await assert.rejects(
      () => repository.create(duplicateOwnerWorld),
      /WORLD_OWNER_EXISTS/,
    );

    const checkpointEventId = randomUUID();
    current = {
      ...current,
      revision:2,
      lastSimulatedAt:"2026-09-21T12:00:02.000Z",
      events:[
        ...current.events,
        {
          id:checkpointEventId,
          type:"READ_CHECKPOINT_EVENT",
          happenedAt:"2026-09-21T12:00:02.000Z",
          severity:0,
          summary:"Read-side authoritative checkpoint event.",
        },
      ],
    };
    await repository.save(current, 1);

    const eventCount = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM world_events WHERE world_id = $1",
      [worldId],
    );
    assert.equal(Number(eventCount.rows[0]?.count ?? 0), 2);

    const commandCount = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM world_commands WHERE world_id = $1",
      [worldId],
    );
    assert.equal(Number(commandCount.rows[0]?.count ?? 0), 1);

    // Force enough revisions to exercise transactional snapshot retention.
    // The final revision also carries an accepted command that must be invalidated
    // if an operator later recovers to revision 56.
    const lateCommandId = randomUUID();
    for (let revision = 3; revision <= 57; revision += 1) {
      const next = {
        ...current,
        revision,
        lastSimulatedAt:new Date(
          Date.parse("2026-09-21T12:00:00.000Z") + revision * 1000,
        ).toISOString(),
      };
      await repository.save(
        next,
        revision - 1,
        revision === 57
          ? {
              commandId:lateCommandId,
              ownerId,
              expectedRevision:56,
              commandType:"SET_SPEED",
              fingerprint:"late-command-fingerprint",
            }
          : undefined,
      );
      current = next;
    }

    const snapshotCount = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM world_snapshots WHERE world_id = $1",
      [worldId],
    );
    assert.equal(Number(snapshotCount.rows[0]?.count ?? 0), 50);

    const latest = await repository.findById(worldId);
    assert.equal(latest?.revision, 57);

    // Poison the latest JSONB snapshot with syntactically valid but structurally
    // invalid data. The repository must fail closed instead of casting it.
    await pool.query(
      "UPDATE world_snapshots SET snapshot = $3::jsonb WHERE world_id = $1 AND revision = $2",
      [worldId, 57, JSON.stringify({ worldId, revision:57, poisoned:true })],
    );

    await assert.rejects(
      () => repository.findById(worldId),
      /WORLD_STATE_CORRUPT/,
    );

    const integrity = await repository.inspectSnapshots(worldId);
    assert.equal(integrity[0]?.revision, 57);
    assert.equal(integrity[0]?.status, "CORRUPT");
    assert.equal(integrity[1]?.revision, 56);
    assert.equal(integrity[1]?.status, "VALID");

    const recovered = await repository.recoverFromSnapshot(worldId, 56);
    assert.equal(recovered.revision, 58);
    assert.equal(recovered.events.at(-1)?.type, "WORLD_RECOVERED");

    const afterRecovery = await repository.findById(worldId);
    assert.equal(afterRecovery?.revision, 58);
    assert.equal(afterRecovery?.events.at(-1)?.type, "WORLD_RECOVERED");

    // Receipt from the abandoned branch is removed; ancestor receipts survive.
    assert.equal(await repository.findAcceptedCommand(lateCommandId), null);
    assert.ok(await repository.findAcceptedCommand(commandId));

    const commandCountAfterRecovery = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM world_commands WHERE world_id = $1",
      [worldId],
    );
    assert.equal(Number(commandCountAfterRecovery.rows[0]?.count ?? 0), 1);

    const recoveryEventCount = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM world_events WHERE world_id = $1 AND event_type = 'WORLD_RECOVERED'",
      [worldId],
    );
    assert.equal(Number(recoveryEventCount.rows[0]?.count ?? 0), 1);

    // Unsupported future schema versions must never be interpreted as v1.
    await pool.query(
      "UPDATE worlds SET schema_version = 99 WHERE id = $1",
      [worldId],
    );
    await assert.rejects(
      () => repository.findById(worldId),
      /WORLD_SCHEMA_UNSUPPORTED/,
    );
    await pool.query(
      "UPDATE worlds SET schema_version = 1 WHERE id = $1",
      [worldId],
    );

    const finalSnapshotCount = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM world_snapshots WHERE world_id = $1",
      [worldId],
    );
    assert.equal(Number(finalSnapshotCount.rows[0]?.count ?? 0), 50);
  } finally {
    await pool.query("DELETE FROM worlds WHERE id = $1", [worldId]);
    await pool.end();
    await repository.close();
  }
});
