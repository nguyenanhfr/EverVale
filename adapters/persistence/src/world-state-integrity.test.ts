import assert from "node:assert/strict";
import test from "node:test";
import type { WorldState } from "@evervale/domain/world.types";
import {
  decodeWorldDocument,
  encodeWorldEnvelope,
  validateAcceptedCommandReceipt,
  validateWorldState,
  WORLD_SCHEMA_VERSION,
} from "./world-state-integrity.js";

function world(): WorldState {
  return {
    worldId:"00000000-0000-4000-8000-000000000111",
    ownerId:"owner-integrity",
    seed:11,
    revision:4,
    lifecycle:"ACTIVE",
    speed:1,
    simulationSeconds:120,
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

test("world envelope round-trips with schema version and checksum", () => {
  const encoded = encodeWorldEnvelope(world());
  const parsed = JSON.parse(encoded) as Record<string, unknown>;

  assert.equal(parsed.format, "evervale-world");
  assert.equal(parsed.schemaVersion, WORLD_SCHEMA_VERSION);
  assert.match(String(parsed.checksum), /^sha256:[0-9a-f]{64}$/);

  const decoded = decodeWorldDocument(encoded);
  assert.equal(decoded.legacy, false);
  assert.deepEqual(decoded.world, world());
});

test("legacy raw world documents remain readable when structurally valid", () => {
  const decoded = decodeWorldDocument(JSON.stringify(world()));
  assert.equal(decoded.legacy, true);
  assert.deepEqual(decoded.world, world());
});

test("checksum tampering is rejected before state reaches simulation", () => {
  const parsed = JSON.parse(encodeWorldEnvelope(world())) as {
    checksum: string;
    world: WorldState;
  };
  parsed.world.resources.money = 4999;

  assert.throws(
    () => decodeWorldDocument(JSON.stringify(parsed)),
    /WORLD_STATE_CHECKSUM_MISMATCH/,
  );
});

test("unsupported schema version fails closed", () => {
  const parsed = JSON.parse(encodeWorldEnvelope(world())) as {
    schemaVersion: number;
  };
  parsed.schemaVersion = 99;

  assert.throws(
    () => decodeWorldDocument(JSON.stringify(parsed)),
    /WORLD_SCHEMA_UNSUPPORTED/,
  );
});

test("structural and economic invariants reject poisoned snapshots", () => {
  assert.throws(
    () => validateWorldState({
      ...world(),
      revision:-1,
    }),
    /WORLD_STATE_CORRUPT/,
  );

  assert.throws(
    () => validateWorldState({
      ...world(),
      resources:{
        ...world().resources,
        money:6000,
        moneyCap:5000,
      },
    }),
    /WORLD_STATE_CORRUPT/,
  );

  assert.throws(
    () => validateWorldState({
      ...world(),
      society:{
        ...world().society,
        assignedWorkers:10,
        workforce:9,
      },
    }),
    /WORLD_STATE_CORRUPT/,
  );

  assert.throws(
    () => validateWorldState({
      ...world(),
      lastSimulatedAt:"not-a-date",
    }),
    /WORLD_STATE_CORRUPT/,
  );
});

test("accepted command receipt must agree with embedded world identity", () => {
  const valid = validateAcceptedCommandReceipt({
    commandId:"11111111-1111-4111-8111-111111111111",
    worldId:world().worldId,
    ownerId:world().ownerId,
    expectedRevision:3,
    commandType:"SET_SPEED",
    fingerprint:"fingerprint",
    world:world(),
  });
  assert.equal(valid.world.revision, 4);

  assert.throws(
    () => validateAcceptedCommandReceipt({
      commandId:"11111111-1111-4111-8111-111111111111",
      worldId:"different-world",
      ownerId:world().ownerId,
      expectedRevision:3,
      commandType:"SET_SPEED",
      fingerprint:"fingerprint",
      world:world(),
    }),
    /WORLD_COMMAND_RECEIPT_CORRUPT/,
  );
});
