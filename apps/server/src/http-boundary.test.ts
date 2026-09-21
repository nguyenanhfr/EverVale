import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import type { IncomingMessage } from "node:http";
import {
  DEFAULT_MAX_BODY_BYTES,
  configuredMaxBodyBytes,
  readJsonBody,
  requestOwner,
  statusForError,
} from "./http-boundary.js";

function request(
  body: string,
  headers: Record<string, string> = { "content-type": "application/json" },
): IncomingMessage {
  const stream = Readable.from([Buffer.from(body)]) as unknown as IncomingMessage;
  Object.defineProperty(stream, "headers", {
    value: headers,
    configurable: true,
  });
  return stream;
}

test("parses JSON media types and rejects malformed JSON deterministically", async () => {
  const parsed = await readJsonBody<{ ok: boolean }>(
    request('{"ok":true}', { "content-type": "application/json; charset=utf-8" }),
  );
  assert.deepEqual(parsed, { ok: true });

  const vendorJson = await readJsonBody<{ ok: boolean }>(
    request('{"ok":true}', { "content-type": "application/vnd.evervale+json" }),
  );
  assert.equal(vendorJson.ok, true);

  await assert.rejects(
    () => readJsonBody(request("{broken")),
    /INVALID_JSON/,
  );
  await assert.rejects(
    () => readJsonBody(request("", { "content-type": "application/json" })),
    /INVALID_JSON/,
  );
});

test("rejects unsupported media types and oversized request bodies", async () => {
  await assert.rejects(
    () => readJsonBody(request("{}", { "content-type": "text/plain" })),
    /UNSUPPORTED_MEDIA_TYPE/,
  );

  await assert.rejects(
    () => readJsonBody(request('{"large":"payload"}'), 8),
    /REQUEST_TOO_LARGE/,
  );

  await assert.rejects(
    () => readJsonBody(request("{}", {
      "content-type": "application/json",
      "content-length": "70000",
    }), DEFAULT_MAX_BODY_BYTES),
    /REQUEST_TOO_LARGE/,
  );
});

test("validates configured body limit", () => {
  assert.equal(configuredMaxBodyBytes(undefined), DEFAULT_MAX_BODY_BYTES);
  assert.equal(configuredMaxBodyBytes("1024"), 1024);
  assert.throws(() => configuredMaxBodyBytes("0"), /INVALID_MAX_BODY_BYTES/);
  assert.throws(() => configuredMaxBodyBytes("abc"), /INVALID_MAX_BODY_BYTES/);
});

test("normalizes owner header and rejects missing or pathological values", () => {
  assert.equal(
    requestOwner(request("", { "x-evervale-owner": " dev:builder " })),
    "dev:builder",
  );
  assert.throws(
    () => requestOwner(request("", {})),
    /UNAUTHORIZED/,
  );
  assert.throws(
    () => requestOwner(request("", { "x-evervale-owner": `dev:${"a".repeat(300)}` })),
    /INVALID_OWNER/,
  );
  assert.throws(
    () => requestOwner(request("", { "x-evervale-owner": "dev:bad\u0000owner" })),
    /INVALID_OWNER/,
  );
});

test("maps public API errors to stable HTTP statuses", () => {
  assert.equal(statusForError("UNAUTHORIZED"), 401);
  assert.equal(statusForError("DEV_AUTH_DISABLED"), 403);
  assert.equal(statusForError("REVISION_CONFLICT"), 409);
  assert.equal(statusForError("COMMAND_ID_CONFLICT"), 409);
  assert.equal(statusForError("INVALID_COMMAND_PAYLOAD"), 400);
  assert.equal(statusForError("INVALID_JSON"), 400);
  assert.equal(statusForError("REQUEST_TOO_LARGE"), 413);
  assert.equal(statusForError("UNSUPPORTED_MEDIA_TYPE"), 415);
  assert.equal(statusForError("SOMETHING_UNEXPECTED"), 500);
});
