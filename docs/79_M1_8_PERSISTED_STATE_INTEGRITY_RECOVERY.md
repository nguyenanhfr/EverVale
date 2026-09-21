# 79 — M1.8 Persisted State Integrity & Recovery

Status: **IMPLEMENTED ON ENGINEERING BRANCH / CI REQUIRED**

Date: 2026-09-21

Branch:

`chatgpt/m1-8-state-integrity`

Scope: persistence integrity, runtime fail-safe, recovery tooling, and QA only.

This milestone does **not** change rendering, HUD, assets, shaders, lighting, camera, art direction, or visual polish.

## 1. Problem

Before M1.8, persistence adapters trusted deserialized data too early.

JSON development persistence did:

`JSON.parse(raw) as WorldState`

PostgreSQL queried JSONB snapshots and treated them as `WorldState` without structural validation.

That meant syntactically valid but malformed state could enter application/domain simulation and fail later in unrelated code.

Examples:

- negative revision
- invalid speed
- malformed timestamps
- resources above caps
- impossible workforce counts
- duplicate entity IDs
- invalid combat status/outcome combinations
- NaN-like invalid numeric data introduced before serialization
- future schema interpreted by an older server
- accepted-command receipt whose embedded world identity does not match the receipt

M1.8 moves trust to the persistence boundary.

## 2. Canonical persisted schema version

Current runtime schema:

`WORLD_SCHEMA_VERSION = 1`

PostgreSQL already stores `worlds.schema_version`.

M1.8 now enforces it when loading and saving.

A server that encounters another schema version returns:

`WORLD_SCHEMA_UNSUPPORTED`

It does not guess, coerce, or silently interpret future data as v1.

## 3. Runtime world-state validation

Every persisted world now passes structural validation before application/domain code receives it.

Validated invariants include:

- non-empty world / owner / entity IDs
- non-negative safe integer revision
- lifecycle enum
- speed restricted to 0 / 1 / 2 / 4
- finite non-negative simulation time
- valid last-simulated timestamp
- non-negative resource balances and caps
- balances not exceeding caps
- non-negative tech points / integer tech tier
- population / housing / workforce integer constraints
- assigned workers not exceeding workforce
- happiness within 0..100
- safety within 0..1
- finite entity positions and rotations
- valid construction / damage / blocker states
- building condition within 0..100
- unique IDs inside each persisted entity collection
- valid combat side/status/outcome contract
- combat HP not exceeding max HP
- resolved combat requiring a valid outcome
- non-negative event severity and valid event timestamps

Invalid state fails with:

`WORLD_STATE_CORRUPT`

## 4. JSON development envelope

New JSON writes use a versioned envelope:

- format marker
- schema version
- SHA-256 checksum
- validated world payload

Legacy raw M1 JSON remains readable if structurally valid.

The next successful save upgrades it to the new envelope automatically.

This preserves current local development worlds without weakening new integrity guarantees.

## 5. JSON checksum and same-revision backup

JSON development persistence now keeps:

- primary: `<worldId>.json`
- same-revision backup: `<worldId>.json.bak`

Successful create/save writes validated envelope data to primary and backup before an accepted-command receipt is finalized.

If primary later fails structural/schema/checksum validation:

1. backup is validated independently
2. if backup is valid, primary is restored from backup
3. same persisted revision is returned
4. command receipt lineage remains consistent

If both primary and backup are invalid:

`WORLD_STATE_CORRUPT`

No starter world is created over the damaged state.

Checksum mismatch:

`WORLD_STATE_CHECKSUM_MISMATCH`

## 6. Accepted command receipt integrity

Accepted-command receipts are now validated when read.

Receipt and embedded world must agree on:

- world ID
- owner ID
- expected revision lineage
- command type / fingerprint presence
- embedded world structural validity

Corrupt receipt:

`WORLD_COMMAND_RECEIPT_CORRUPT`

A corrupt receipt is never accepted as idempotency proof.

## 7. PostgreSQL latest-snapshot fail-safe

PostgreSQL reads now cross-check:

- worlds.schema_version
- worlds.revision
- latest world_snapshots.revision
- snapshot.worldId
- snapshot.ownerId
- snapshot.revision
- complete WorldState structural invariants

A syntactically valid JSONB object with the wrong shape therefore fails at repository load.

No automatic production rollback occurs from a normal GET/command path.

Integrity failures are exposed by HTTP as **503**, making them distinguishable from malformed client input.

## 8. Snapshot inspector

Operational command:

`pnpm db:doctor -- <worldId>`

The inspector scans retained snapshots newest first and reports:

- latest snapshot status
- latest valid recovery candidate
- VALID / CORRUPT per revision
- integrity error code for corrupt entries

A corrupt latest snapshot causes a non-zero process exit.

The doctor is read-only.

## 9. Explicit PostgreSQL recovery

Recovery is deliberately operator-driven.

Command:

`pnpm db:recover-world -- <worldId> <sourceRevision> --confirm=<worldId>`

Requirements:

- target world exists
- current schema is supported
- source revision exists
- source snapshot passes full v1 validation
- exact world-ID confirmation is supplied

Recovery does **not** decrement revision.

Instead:

1. lock current world row
2. load and validate selected historical snapshot
3. create a new revision at `currentRevision + 1`
4. append `WORLD_RECOVERED`
5. update world metadata
6. delete accepted command receipts whose expected revision belongs to abandoned history
7. delete significant events after the selected source revision
8. persist the recovered snapshot as a new authoritative head
9. retain old snapshots for forensic inspection subject to normal retention
10. commit transactionally

This makes stale clients conflict against the new revision rather than silently continuing the abandoned branch.

## 10. Why production recovery is not automatic

Automatic rollback is intentionally rejected for PostgreSQL.

A previous valid snapshot may predate accepted player commands.

Silently selecting it during a GET could make:

- command receipts disagree with current state
- events describe abandoned history
- clients continue from a stale revision lineage

Therefore production behavior is:

**detect -> fail closed -> inspect -> explicitly recover**

JSON local development has a narrower same-revision backup recovery path because primary and backup are written from the same committed world payload.

## 11. Automated proof

Unit tests cover:

- envelope checksum round trip
- legacy raw JSON compatibility
- checksum tamper rejection
- unsupported schema rejection
- poisoned structural/economic state rejection
- accepted receipt identity validation
- JSON same-revision backup recovery
- failure when primary and backup are both corrupt
- legacy JSON upgrade on save
- corrupt JSON command receipt rejection
- HTTP 503 mapping for integrity failures

Real PostgreSQL integration additionally injects a syntactically valid but malformed latest JSONB snapshot and proves:

- normal load fails with WORLD_STATE_CORRUPT
- inspector marks latest corrupt
- previous revision remains a valid recovery candidate
- explicit recovery creates a higher authoritative revision
- WORLD_RECOVERED is persisted
- accepted command receipt from abandoned history is removed
- ancestor receipt remains valid
- unsupported schema version fails closed
- snapshot retention remains bounded

## Exit condition

M1.8 becomes PASS only when all relevant gates are green:

- canonical/preflight validation
- TypeScript typecheck
- unit tests
- production build
- Playwright browser/API E2E
- PostgreSQL migration first run
- PostgreSQL migration safe rerun
- PostgreSQL corruption/recovery integration
