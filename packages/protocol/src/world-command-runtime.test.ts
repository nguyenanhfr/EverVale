import assert from "node:assert/strict";
import test from "node:test";
import { parseWorldCommand } from "./world-command-runtime.js";

const COMMAND_ID = "22222222-2222-4222-8222-222222222222";

function command(type: string, payload: unknown, extra: Record<string, unknown> = {}) {
  return {
    type,
    commandId: COMMAND_ID,
    expectedRevision: 7,
    payload,
    ...extra,
  };
}

test("parses supported world commands and strips unknown envelope fields", () => {
  const parsed = parseWorldCommand(command("PLACE_BUILDING", {
    definitionId: "house_small",
    x: 12.5,
    z: -4,
    rotationY: Math.PI / 2,
    ignored: "not-authoritative",
  }, { ignoredEnvelope: true }));

  assert.deepEqual(parsed, {
    type: "PLACE_BUILDING",
    commandId: COMMAND_ID,
    expectedRevision: 7,
    payload: {
      definitionId: "house_small",
      x: 12.5,
      z: -4,
      rotationY: Math.PI / 2,
    },
  });
});

test("accepts every M1 command shape", () => {
  const samples = [
    command("PLACE_PROP", { definitionId: "bench_wood", x: 1, z: 2 }),
    command("MOVE_PROP", { propId: "prop-1", x: 3, z: 4 }),
    command("ROTATE_PROP", { propId: "prop-1", rotationY: 1.2 }),
    command("DELETE_PROP", { propId: "prop-1" }),
    command("DRAW_ROAD", { fromX: 0, fromZ: 0, toX: 12, toZ: 2 }),
    command("SET_SPEED", { speed: 4 }),
    command("CLEAR_BLOCKER", { blockerId: "blocker-1" }),
    command("REPAIR_BUILDING", { buildingId: "building-1" }),
    command("TRIGGER_TEST_WAVE", {}),
  ];

  for (const sample of samples) {
    assert.doesNotThrow(() => parseWorldCommand(sample));
  }
});

test("rejects malformed command identity and revision", () => {
  assert.throws(
    () => parseWorldCommand(command("SET_SPEED", { speed: 1 }, { commandId: "not-a-uuid" })),
    /INVALID_COMMAND_ID/,
  );
  assert.throws(
    () => parseWorldCommand(command("SET_SPEED", { speed: 1 }, { expectedRevision: -1 })),
    /INVALID_EXPECTED_REVISION/,
  );
  assert.throws(
    () => parseWorldCommand(command("SET_SPEED", { speed: 1 }, { expectedRevision: 1.5 })),
    /INVALID_EXPECTED_REVISION/,
  );
});

test("rejects unknown commands instead of accepting a no-op mutation", () => {
  assert.throws(
    () => parseWorldCommand(command("ADMIN_GIVE_MONEY", {})),
    /INVALID_COMMAND_TYPE/,
  );
});

test("rejects invalid payloads before domain or persistence", () => {
  assert.throws(
    () => parseWorldCommand(command("SET_SPEED", { speed: 3 })),
    /INVALID_COMMAND_PAYLOAD/,
  );
  assert.throws(
    () => parseWorldCommand(command("PLACE_BUILDING", {
      definitionId: "house_small",
      x: Number.NaN,
      z: 4,
    })),
    /INVALID_COMMAND_PAYLOAD/,
  );
  assert.throws(
    () => parseWorldCommand(command("MOVE_PROP", {
      propId: "",
      x: 1,
      z: 2,
    })),
    /INVALID_COMMAND_PAYLOAD/,
  );
  assert.throws(
    () => parseWorldCommand(command("TRIGGER_TEST_WAVE", { hidden: true })),
    /INVALID_COMMAND_PAYLOAD/,
  );
  assert.throws(
    () => parseWorldCommand(null),
    /INVALID_COMMAND/,
  );
});
