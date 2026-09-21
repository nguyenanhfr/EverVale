# 77 — M1.6 Runtime Boundary & Process Hardening

Status: **PASS — PR #3 FULL CI GREEN**

Date: 2026-09-21

Branch:

`chatgpt/m1-6-runtime-boundary`

Scope: authoritative protocol / HTTP / server lifecycle / QA only.

This milestone does **not** change rendering, HUD, assets, shaders, lighting, art direction, balance, or visual polish.

## 1. Why this milestone exists

M1.5 made accepted commands idempotent and persistence concurrency-safe.

The remaining network-boundary gap was that TypeScript types were compile-time only. A raw HTTP caller could still send values that do not satisfy `WorldCommand`.

Before M1.6, examples included:

- an unknown command type reaching the application switch
- `SET_SPEED` carrying a value outside `0 | 1 | 2 | 4`
- malformed or missing payload fields reaching domain code
- malformed JSON falling through as an internal error
- arbitrarily large JSON bodies being read without a request limit

These are runtime contract failures, not visual issues.

## 2. Runtime WorldCommand parser

New protocol boundary:

`packages/protocol/src/world-command-runtime.ts`

All M1 command types are parsed from `unknown` before they enter `WorldService`:

- PLACE_BUILDING
- PLACE_PROP
- MOVE_PROP
- ROTATE_PROP
- DELETE_PROP
- DRAW_ROAD
- SET_SPEED
- CLEAR_BLOCKER
- REPAIR_BUILDING
- TRIGGER_TEST_WAVE

Validation includes:

- UUID commandId
- non-negative safe-integer expectedRevision
- known command type
- object payload
- required non-empty string identifiers
- finite numeric coordinates/rotation
- speed restricted to 0 / 1 / 2 / 4
- empty payload for TRIGGER_TEST_WAVE

Unknown envelope/payload fields are not forwarded into the authoritative command object.

## 3. Application fail-closed rule

`WorldService` now has an explicit default rejection:

`UNKNOWN_COMMAND`

The HTTP parser should make this unreachable during normal API use.

It exists as defense in depth for:

- future adapters
- tests
- internal callers
- accidental unsafe casts
- protocol drift

An unknown runtime command must not create a receipt, mutate resources, or save a new revision.

## 4. HTTP JSON boundary

New server helper:

`apps/server/src/http-boundary.ts`

Rules:

- JSON POST endpoints require `application/json` or a `+json` media type
- malformed/empty JSON -> `400 INVALID_JSON`
- oversized body -> `413 REQUEST_TOO_LARGE`
- unsupported media type -> `415 UNSUPPORTED_MEDIA_TYPE`
- missing owner -> `401 UNAUTHORIZED`
- pathological owner header -> `400 INVALID_OWNER`

Default body limit:

`65536 bytes`

Optional override:

`EVERVALE_MAX_BODY_BYTES`

Invalid configured limits fail server startup rather than silently disabling the protection.

## 5. Dev login boundary

Dev login now treats the request as untrusted runtime input.

Rules:

- body must be a JSON object
- handle must be a string when supplied
- existing normalization remains in place
- disabled dev auth now maps to `403` rather than an internal `500`

This remains development auth only. Better Auth is still outside M1.

## 6. Graceful server shutdown

`WorldRepository` now exposes an optional lifecycle close hook.

On SIGINT / SIGTERM the server:

1. stops accepting new HTTP connections
2. waits for the Node HTTP server to close
3. closes the persistence adapter when supported
4. therefore closes the PostgreSQL pool cleanly

JSON development persistence requires no close operation.

No background simulation worker or second authoritative process is introduced by this milestone.

## 7. JSON development path override

Optional:

`EVERVALE_JSON_DIR`

This allows isolated development/test persistence without changing production Postgres behavior.

The default JSON development location remains unchanged.

## 8. Repeatable E2E worlds

Browser/API E2E no longer relies on fixed world owners or a fixed idempotency command UUID.

Runtime, stress, and idempotency specs generate unique test identities per run.

This prevents stale local JSON state from making a second E2E execution fail for reasons unrelated to the current code.

## 9. Automated proof added

Protocol tests cover:

- supported command shapes
- command ID/revision validation
- unknown command rejection
- invalid speed
- invalid numeric payload
- invalid/empty IDs
- test-wave payload strictness

Server tests cover:

- JSON and vendor +json
- malformed/empty JSON
- media-type rejection
- request-size rejection
- body-limit configuration
- owner validation
- public error-to-status mapping

Application test covers:

- unknown runtime command rejected
- no persistence occurs
- no money/revision mutation occurs

Real HTTP E2E additionally covers:

- idempotent accepted retry
- command ID conflict
- invalid UUID
- invalid speed
- unknown command type
- malformed JSON
- unsupported media type

## 10. Lease boundary remains unchanged

M1.6 does **not** add:

- pg-boss
- a background world advancement process
- a second authoritative realtime process
- a cosmetic world lease

The M1.5 lease decision remains canonical.

A real exclusive world lease is mandatory before any second process independently advances world time.

## Exit result

PR #3 code-gate head:

`08d42dfe6f07dc6a5ef4976ad3324bd66d5ba35d`

Validated on GitHub Actions:

- TypeScript typecheck: PASS
- unit tests: PASS
- production build: PASS
- Playwright browser/API E2E: PASS
- PostgreSQL migration first run: PASS
- PostgreSQL migration safe rerun: PASS
- PostgreSQL persistence integration: PASS
- canonical content / 1000-seed / long-run / spatial-combat preflight: PASS

**M1.6 RUNTIME BOUNDARY & PROCESS HARDENING: PASS**
