import type { WorldCommand } from "./world.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_STRING_LENGTH = 256;

type UnknownRecord = Record<string, unknown>;

function invalid(code: string): never {
  throw new Error(code);
}

function record(value: unknown, code = "INVALID_COMMAND_PAYLOAD"): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalid(code);
  }
  return value as UnknownRecord;
}

function stringField(source: UnknownRecord, key: string): string {
  const value = source[key];
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_STRING_LENGTH
  ) {
    return invalid("INVALID_COMMAND_PAYLOAD");
  }
  return value;
}

function finiteNumberField(source: UnknownRecord, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return invalid("INVALID_COMMAND_PAYLOAD");
  }
  return value;
}

function optionalFiniteNumberField(
  source: UnknownRecord,
  key: string,
): number | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return invalid("INVALID_COMMAND_PAYLOAD");
  }
  return value;
}

function withOptionalRotation(
  payload: UnknownRecord,
): { rotationY?: number } {
  const rotationY = optionalFiniteNumberField(payload, "rotationY");
  return rotationY === undefined ? {} : { rotationY };
}

export function parseWorldCommand(input: unknown): WorldCommand {
  const command = record(input, "INVALID_COMMAND");

  const commandId = command.commandId;
  if (typeof commandId !== "string" || !UUID_PATTERN.test(commandId)) {
    return invalid("INVALID_COMMAND_ID");
  }

  const expectedRevision = command.expectedRevision;
  if (
    typeof expectedRevision !== "number" ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    return invalid("INVALID_EXPECTED_REVISION");
  }

  const type = command.type;
  if (typeof type !== "string") return invalid("INVALID_COMMAND_TYPE");

  const payload = record(command.payload);

  switch (type) {
    case "PLACE_BUILDING":
      return {
        type,
        commandId,
        expectedRevision,
        payload: {
          definitionId: stringField(payload, "definitionId"),
          x: finiteNumberField(payload, "x"),
          z: finiteNumberField(payload, "z"),
          ...withOptionalRotation(payload),
        },
      };

    case "PLACE_PROP":
      return {
        type,
        commandId,
        expectedRevision,
        payload: {
          definitionId: stringField(payload, "definitionId"),
          x: finiteNumberField(payload, "x"),
          z: finiteNumberField(payload, "z"),
          ...withOptionalRotation(payload),
        },
      };

    case "MOVE_PROP":
      return {
        type,
        commandId,
        expectedRevision,
        payload: {
          propId: stringField(payload, "propId"),
          x: finiteNumberField(payload, "x"),
          z: finiteNumberField(payload, "z"),
        },
      };

    case "ROTATE_PROP":
      return {
        type,
        commandId,
        expectedRevision,
        payload: {
          propId: stringField(payload, "propId"),
          rotationY: finiteNumberField(payload, "rotationY"),
        },
      };

    case "DELETE_PROP":
      return {
        type,
        commandId,
        expectedRevision,
        payload: {
          propId: stringField(payload, "propId"),
        },
      };

    case "DRAW_ROAD":
      return {
        type,
        commandId,
        expectedRevision,
        payload: {
          fromX: finiteNumberField(payload, "fromX"),
          fromZ: finiteNumberField(payload, "fromZ"),
          toX: finiteNumberField(payload, "toX"),
          toZ: finiteNumberField(payload, "toZ"),
        },
      };

    case "SET_SPEED": {
      const speed = finiteNumberField(payload, "speed");
      if (speed !== 0 && speed !== 1 && speed !== 2 && speed !== 4) {
        return invalid("INVALID_COMMAND_PAYLOAD");
      }
      return {
        type,
        commandId,
        expectedRevision,
        payload: { speed },
      };
    }

    case "CLEAR_BLOCKER":
      return {
        type,
        commandId,
        expectedRevision,
        payload: {
          blockerId: stringField(payload, "blockerId"),
        },
      };

    case "REPAIR_BUILDING":
      return {
        type,
        commandId,
        expectedRevision,
        payload: {
          buildingId: stringField(payload, "buildingId"),
        },
      };

    case "TRIGGER_TEST_WAVE":
      if (Object.keys(payload).length !== 0) {
        return invalid("INVALID_COMMAND_PAYLOAD");
      }
      return {
        type,
        commandId,
        expectedRevision,
        payload: {},
      };

    default:
      return invalid("INVALID_COMMAND_TYPE");
  }
}
