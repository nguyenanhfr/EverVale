import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { WorldState } from "@evervale/domain/world.types";
import { JsonWorldRepository } from "./json-world-repository.js";

function world(): WorldState {
  return {
    worldId:"00000000-0000-4000-8000-000000000001",
    ownerId:"owner-json",
    seed:1,
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

test("JSON repository persists accepted command receipt across repository restart", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "evervale-json-repo-"));
  try {
    const first = new JsonWorldRepository(directory);
    const base = world();
    await first.create(base);

    const accepted = {
      ...base,
      revision:1,
      speed:2 as const,
    };

    await first.save(accepted, 0, {
      commandId:"11111111-1111-4111-8111-111111111111",
      ownerId:"owner-json",
      expectedRevision:0,
      commandType:"SET_SPEED",
      fingerprint:"fingerprint-v1",
    });

    const second = new JsonWorldRepository(directory);
    const receipt = await second.findAcceptedCommand(
      "11111111-1111-4111-8111-111111111111",
    );

    assert.ok(receipt);
    assert.equal(receipt.ownerId, "owner-json");
    assert.equal(receipt.expectedRevision, 0);
    assert.equal(receipt.commandType, "SET_SPEED");
    assert.equal(receipt.fingerprint, "fingerprint-v1");
    assert.equal(receipt.world.revision, 1);
    assert.equal(receipt.world.speed, 2);

    const loaded = await second.findById(base.worldId);
    assert.equal(loaded?.revision, 1);
    assert.equal(loaded?.speed, 2);
  } finally {
    await rm(directory, { recursive:true, force:true });
  }
});


test("JSON repository writes versioned envelope and recovers a corrupt primary from same-revision backup", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "evervale-json-integrity-"));
  try {
    const repository = new JsonWorldRepository(directory);
    const base = world();
    await repository.create(base);

    const primary = path.join(directory, `${base.worldId}.json`);
    const backup = path.join(directory, `${base.worldId}.json.bak`);

    const stored = JSON.parse(await readFile(primary, "utf8")) as {
      format: string;
      schemaVersion: number;
      checksum: string;
      world: WorldState;
    };
    assert.equal(stored.format, "evervale-world");
    assert.equal(stored.schemaVersion, 1);
    assert.match(stored.checksum, /^sha256:[0-9a-f]{64}$/);

    const accepted = {
      ...base,
      revision:1,
      speed:2 as const,
    };
    await repository.save(accepted, 0, {
      commandId:"22222222-2222-4222-8222-222222222222",
      ownerId:base.ownerId,
      expectedRevision:0,
      commandType:"SET_SPEED",
      fingerprint:"integrity-save",
    });

    const committedBackup = await readFile(backup, "utf8");
    const tampered = JSON.parse(await readFile(primary, "utf8")) as {
      checksum: string;
      world: WorldState;
    };
    tampered.world.resources.money = 4999;
    await writeFile(primary, JSON.stringify(tampered, null, 2), "utf8");

    const recovered = await repository.findById(base.worldId);
    assert.equal(recovered?.revision, 1);
    assert.equal(recovered?.speed, 2);
    assert.equal(recovered?.resources.money, 1200);
    assert.equal(await readFile(primary, "utf8"), committedBackup);
  } finally {
    await rm(directory, { recursive:true, force:true });
  }
});

test("JSON repository fails closed when primary and backup are both corrupt", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "evervale-json-corrupt-"));
  try {
    const repository = new JsonWorldRepository(directory);
    const base = world();
    await repository.create(base);

    await writeFile(path.join(directory, `${base.worldId}.json`), "{bad", "utf8");
    await writeFile(path.join(directory, `${base.worldId}.json.bak`), "{also-bad", "utf8");

    await assert.rejects(
      () => repository.findById(base.worldId),
      /WORLD_STATE_CORRUPT/,
    );
  } finally {
    await rm(directory, { recursive:true, force:true });
  }
});

test("JSON repository reads legacy raw world and upgrades it on next save", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "evervale-json-legacy-"));
  try {
    const base = world();
    await writeFile(
      path.join(directory, `${base.worldId}.json`),
      JSON.stringify(base, null, 2),
      "utf8",
    );

    const repository = new JsonWorldRepository(directory);
    const loaded = await repository.findById(base.worldId);
    assert.deepEqual(loaded, base);

    await repository.save({ ...base, revision:1, speed:2 }, 0);
    const upgraded = JSON.parse(
      await readFile(path.join(directory, `${base.worldId}.json`), "utf8"),
    ) as { format: string; schemaVersion: number };
    assert.equal(upgraded.format, "evervale-world");
    assert.equal(upgraded.schemaVersion, 1);
  } finally {
    await rm(directory, { recursive:true, force:true });
  }
});

test("JSON repository rejects corrupt accepted command receipt", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "evervale-json-receipt-"));
  try {
    const repository = new JsonWorldRepository(directory);
    const base = world();
    await repository.create(base);
    await repository.save({ ...base, revision:1, speed:2 }, 0, {
      commandId:"33333333-3333-4333-8333-333333333333",
      ownerId:base.ownerId,
      expectedRevision:0,
      commandType:"SET_SPEED",
      fingerprint:"receipt-integrity",
    });

    const receiptPath = path.join(
      directory,
      "commands",
      "33333333-3333-4333-8333-333333333333.json",
    );
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as {
      worldId: string;
    };
    receipt.worldId = "tampered-world";
    await writeFile(receiptPath, JSON.stringify(receipt), "utf8");

    await assert.rejects(
      () => repository.findAcceptedCommand("33333333-3333-4333-8333-333333333333"),
      /WORLD_COMMAND_RECEIPT_CORRUPT/,
    );
  } finally {
    await rm(directory, { recursive:true, force:true });
  }
});
