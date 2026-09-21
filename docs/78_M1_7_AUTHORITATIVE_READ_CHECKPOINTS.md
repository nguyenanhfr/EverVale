# 78 — M1.7 Authoritative Read Checkpoints

Status: **IMPLEMENTED ON ENGINEERING BRANCH / CI REQUIRED**

Date: 2026-09-21

Branch:

`chatgpt/m1-7-authoritative-checkpoints`

Scope: authoritative simulation / persistence / QA only.

This milestone does **not** change rendering, HUD, assets, shaders, lighting, camera, art direction, or visual polish.

## 1. Problem

Before M1.7, `GET /api/world` advanced simulation for presentation but did not persist that advancement.

This was acceptable for short continuous economy projection, but unsafe for discrete simulation boundaries.

Example:

1. persisted world contains an ACTIVE combat
2. browser GET advances enough time to resolve it
3. player sees CLEAN / COSTLY / BREACH and aftermath
4. no command is sent
5. persisted world still contains the pre-resolution combat

A later read could re-run the same transition and generate a different event ID/time.

The player-visible world and authoritative persisted world could therefore temporarily disagree at important boundaries.

## 2. Read projection remains lightweight

M1.7 does **not** turn browser polling into a database write loop.

Normal short reads still:

- load latest persisted world
- project deterministic simulation to current time
- return the projection
- keep the persisted revision unchanged

The existing one-second browser polling path therefore does not write once per second.

## 3. Periodic authoritative checkpoint

An ACTIVE, non-paused world checkpoints read-side progression when elapsed real time since the persisted authority reaches:

**5 real minutes**

This matches the canonical persistence baseline.

A checkpoint:

1. advances simulation from the persisted snapshot
2. increments world revision by exactly 1
3. saves using revision CAS
4. persists significant events
5. writes/prunes snapshots through the existing repository transaction
6. returns the checkpointed revision to the client

Paused worlds do not write periodic time-only checkpoints.

## 4. Immediate material-boundary checkpoint

A read checkpoints immediately when deterministic simulation crosses an important discrete boundary, even before 5 minutes.

Current M1 material boundaries:

- combat ID/status/outcome transition
- a new player-facing event
- building construction state transition
- building damage/repair state transition
- blocker removal/state transition
- tech tier change
- population integer change

This means combat resolution and aftermath are persisted as soon as the player can observe them.

## 5. Combat resolution guarantee

When read-side advancement resolves combat:

- `applyCombatAftermath` is applied once to the checkpoint candidate
- `COMBAT_RESOLVED` is generated once
- checkpoint revision advances once
- event is persisted to `world_events`
- subsequent reads load the resolved checkpoint
- subsequent reads do not generate a second combat-resolution event

This removes projection-only combat outcomes.

## 6. Revision CAS and race recovery

Read checkpoints use the same repository CAS authority as commands.

If another request/process commits the world first:

- the losing checkpoint receives `REVISION_CONFLICT`
- it does not overwrite the winner
- application reloads the committed owner world
- it projects that winner to the current request time
- response returns the winner lineage

No blind retry loop is introduced.

## 7. Command semantics remain unchanged

Mutating commands still:

- require client `expectedRevision`
- advance elapsed simulation before applying the command
- increment revision through the domain mutation
- persist accepted-command receipt transactionally
- retain command ID idempotency

A client that submits a stale revision after an autonomous checkpoint receives the existing `409 REVISION_CONFLICT` and refreshes.

M1.7 does not weaken optimistic concurrency.

## 8. PostgreSQL transaction reuse

No new persistence table is required.

A read checkpoint uses the existing:

`WorldRepository.save(world, previousRevision)`

without an accepted-command context.

PostgreSQL therefore transactionally performs:

1. revision CAS update
2. snapshot insert
3. significant event insert
4. snapshot retention pruning
5. commit

No `world_commands` row is created for a read checkpoint.

## 9. Lease decision

M1.7 does **not** add:

- pg-boss
- a background simulation worker
- a second continuous authoritative advancement loop
- a cosmetic/no-op world lease

Read checkpoints remain request-driven inside the existing API authority and are protected by revision CAS.

The canonical lease rule remains unchanged:

A real exclusive world lease is mandatory before introducing a second process that independently advances world time outside the request/command CAS path.

## 10. Automated proof added

Application tests prove:

- a two-second ordinary read remains projection-only
- a 5-minute read checkpoints and increments revision once
- the next short poll does not save again
- combat resolution through read persists outcome/event
- repeated reads keep the same combat event ID
- read checkpoint CAS conflict reloads the committed winner

PostgreSQL integration additionally proves:

- a non-command save persists a new snapshot
- a non-command save persists significant events
- no extra command receipt is created
- snapshot retention still holds

Browser/API E2E additionally verifies:

- combat resolution becomes visible
- repeated API reads return the same persisted `COMBAT_RESOLVED` event ID
- revision is stable after the material checkpoint until another mutation

## Exit condition

M1.7 is PASS only after all relevant gates are green on this branch:

- canonical/preflight validation
- TypeScript typecheck
- unit tests
- production build
- Playwright browser/API E2E
- PostgreSQL migration first run
- PostgreSQL migration safe rerun
- PostgreSQL persistence integration
