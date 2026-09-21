# 64 — Persistence & Database Contract

Status: **CANONICAL M0 DATABASE BASELINE**

PostgreSQL is authoritative persistence. Auth-provider tables are owned by the auth adapter; EverVale domain tables do not duplicate password/session implementation.

## Core tables
- worlds
- world_memberships
- world_snapshots
- world_events
- world_commands
- world_leases

## Lease rule
Only a valid world lease may advance simulation. Lease acquisition/renewal is transactional.

## Catch-up transaction
1. acquire lease
2. lock/read world row
3. load latest snapshot
4. verify revision
5. advance from last_simulated_at
6. append significant events
7. write snapshot/revision
8. update last_simulated_at
9. commit
10. renew/transfer lease for ACTIVE room

Failure rolls back. Command/job retry must be idempotent. No partial Money/Varum/Threat gain.

## Snapshot baseline
- clean disconnect
- after major combat
- every 5 real minutes while ACTIVE
- after catch-up

Concrete migration: db/migrations/0001_world_core.sql

## M1.5 runtime status

Implemented runtime hardening:

- accepted-command idempotency
- deterministic command fingerprinting
- per-owner single-process serialization
- Postgres revision CAS race recovery
- one-owned-world-per-user M1 invariant
- JSON receipt persistence
- significant event persistence
- latest-50 snapshot retention
- explicit checksum-verified migration runner

Migration command:

`pnpm db:migrate`

Lease note:

`world_leases` remains the canonical requirement before any second process/background worker independently advances world time. Current M1 has only one authoritative advancement process, so a no-op lease implementation is intentionally not added.

See:
`docs/76_M1_5_PERSISTENCE_CONCURRENCY_HARDENING.md`


## M1.7 authoritative read checkpoint status

Read-side simulation remains projection-only for ordinary short polling.

Authoritative checkpoint rules:

- periodic checkpoint after 5 real minutes of non-paused ACTIVE progression
- immediate checkpoint at material simulation boundaries
- checkpoint increments revision exactly once
- checkpoint uses repository revision CAS
- checkpoint persists snapshots and significant events
- checkpoint does not create a world_commands receipt
- CAS loser reloads the committed winner instead of overwriting it

Material M1 boundaries currently include:

- combat ID/status/outcome transition
- new player-facing event
- construction state transition
- damage/repair state transition
- blocker removal/state transition
- tech tier change
- population integer change

See:
`docs/78_M1_7_AUTHORITATIVE_READ_CHECKPOINTS.md`


## M1.8 persisted state integrity & recovery

Current persisted runtime schema:

`WORLD_SCHEMA_VERSION = 1`

Persistence boundary requirements:

- validate every world before application/domain use
- reject unsupported schema versions
- reject malformed latest snapshots
- validate accepted-command receipt lineage
- JSON dev persistence uses versioned SHA-256 envelope
- JSON dev keeps same-revision backup recovery
- PostgreSQL never auto-rolls back from request paths
- PostgreSQL recovery is explicit, transactional, and revision-forward

Operational commands:

`pnpm db:doctor -- <worldId>`

`pnpm db:recover-world -- <worldId> <sourceRevision> --confirm=<worldId>`

See:
`docs/79_M1_8_PERSISTED_STATE_INTEGRITY_RECOVERY.md`
