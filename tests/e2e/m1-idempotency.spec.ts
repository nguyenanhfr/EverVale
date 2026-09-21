import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const SERVER = "http://127.0.0.1:2567";
const OWNER = `dev:e2e-idempotency-${randomUUID().slice(0, 8)}`;
const COMMAND_ID = randomUUID();

async function world(request: any) {
  const response = await request.get(`${SERVER}/api/world`, {
    headers: { "x-evervale-owner": OWNER },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function send(request: any, data: Record<string, unknown>) {
  return request.post(`${SERVER}/api/world/command`, {
    headers: {
      "content-type": "application/json",
      "x-evervale-owner": OWNER,
    },
    data,
  });
}

test("accepted command is idempotent through real HTTP and JSON persistence", async ({ request }) => {
  const before = await world(request);
  const expectedRevision = before.world.revision;

  const command = {
    type: "SET_SPEED",
    commandId: COMMAND_ID,
    expectedRevision,
    payload: { speed: 2 },
  };

  const first = await send(request, command);
  expect(first.status()).toBe(200);
  const firstBody = await first.json();
  expect(firstBody.accepted).toBe(true);
  expect(firstBody.world.revision).toBe(expectedRevision + 1);
  expect(firstBody.world.speed).toBe(2);

  const retry = await send(request, command);
  expect(retry.status()).toBe(200);
  const retryBody = await retry.json();
  expect(retryBody.world.revision).toBe(firstBody.world.revision);
  expect(retryBody.world.speed).toBe(2);

  const persisted = await world(request);
  expect(persisted.world.revision).toBe(firstBody.world.revision);
  expect(persisted.world.speed).toBe(2);

  const reused = await send(request, {
    ...command,
    payload: { speed: 4 },
  });
  expect(reused.status()).toBe(409);
  expect((await reused.json()).error).toBe("COMMAND_ID_CONFLICT");

  const invalidId = await send(request, {
    type: "SET_SPEED",
    commandId: "not-a-uuid",
    expectedRevision: persisted.world.revision,
    payload: { speed: 1 },
  });
  expect(invalidId.status()).toBe(400);
  expect((await invalidId.json()).error).toBe("INVALID_COMMAND_ID");

  const invalidSpeed = await send(request, {
    type: "SET_SPEED",
    commandId: randomUUID(),
    expectedRevision: persisted.world.revision,
    payload: { speed: 3 },
  });
  expect(invalidSpeed.status()).toBe(400);
  expect((await invalidSpeed.json()).error).toBe("INVALID_COMMAND_PAYLOAD");

  const unknownType = await send(request, {
    type: "ADMIN_GIVE_MONEY",
    commandId: randomUUID(),
    expectedRevision: persisted.world.revision,
    payload: {},
  });
  expect(unknownType.status()).toBe(400);
  expect((await unknownType.json()).error).toBe("INVALID_COMMAND_TYPE");

  const malformedJson = await request.post(`${SERVER}/api/world/command`, {
    headers: {
      "content-type": "application/json",
      "x-evervale-owner": OWNER,
    },
    data: "{",
  });
  expect(malformedJson.status()).toBe(400);
  expect((await malformedJson.json()).error).toBe("INVALID_JSON");

  const wrongMediaType = await request.post(`${SERVER}/api/world/command`, {
    headers: {
      "content-type": "text/plain",
      "x-evervale-owner": OWNER,
    },
    data: "{}",
  });
  expect(wrongMediaType.status()).toBe(415);
  expect((await wrongMediaType.json()).error).toBe("UNSUPPORTED_MEDIA_TYPE");
});
