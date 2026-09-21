# 67 — M0/M1 Engineering Status

Status: **M0 FOUNDATION PASS / M1 BROWSER RUNTIME PROOF PASS**

## What is implemented

M0:
- pnpm TypeScript monorepo
- layered domain/application/protocol/adapters/client/server boundaries
- deterministic domain simulation
- PostgreSQL persistence adapter
- JSON local-dev persistence fallback
- DB migration
- engineering CI
- content/worldgen preflight CI
- domain/application tests

M1 graybox:
- dev login
- persistent starter world
- offline catch-up from lastSimulatedAt
- Money / Power / Water / Varum / Tech / Population / Happiness
- automatic Workforce
- School Tech progression to T1
- construction queue
- authoritative road access
- road drawing
- building placement
- Three.js town scene
- autonomous citizen presentation
- work / school / park presentation targets
- day/night lighting
- speed 0x / 1x / 2x / 4x
- surprise test wave
- automatic Town Warden / Guard combat
- Nibbler / Wobble Slime
- CLEAN / COSTLY / BREACH
- combat aftermath damage
- repair command and timed repair
- persisted event history

## Run locally

Requires Node 22.12+.

### Zero-setup local persistence

```bash
npm install --global pnpm@10.15.1
pnpm install
cp .env.example .env
# remove/comment DATABASE_URL to use JSON dev persistence
pnpm dev
```

Client:
- http://localhost:5173

Server:
- http://localhost:2567

### PostgreSQL mode

```bash
docker compose up -d postgres
pnpm dev
```

Keep DATABASE_URL from .env.example.

## Validation

Current main-branch CI:
- EverVale Preflight: PASS
- EverVale Engineering: PASS

Engineering gate runs:
- install
- TypeScript typecheck
- tests
- Vite production build

Preflight runs:
- content cross-reference validation
- 1000-seed worldgen validation
- long-run sim smoke
- spatial-combat sim smoke

## Current limitation

This is a playable engineering graybox, not an art-complete game.

Still intentionally deferred behind M1 playtest:
- final assets/Blender pass
- real Better Auth
- Colyseus realtime room transport
- pg-boss background jobs
- full navmesh/crowd
- T1+ Varum gameplay
- Watchtower/UFO combat
- weather depth
- full incidents
- vehicles/aircraft
- multiplayer

The next gate is not more foundation design. It is to run/play the M1 loop, measure it, and fix runtime issues before M2.


## Browser runtime proof

See:
`docs/68_M1_BROWSER_RUNTIME_PROOF.md`

Playwright verifies the real client/server loop:
login → road/build → reload → offline catch-up → combat → aftermath → repair.

Latest Engineering and Preflight workflows are both PASS.


## Runtime-quality baseline

See:
`docs/69_M1_RUNTIME_QUALITY_AUDIT.md`

Current M1 runtime-quality baseline includes:
- placement ghost feedback
- authoritative terrain blockers
- blocker clearing
- readable citizen schedules
- ambient dog
- world clock
- Three.js renderer telemetry
- browser performance budgets
- Playwright page-error detection

Latest Engineering and Preflight workflows are PASS.


## M1.4 stress / memory baseline

See:
`docs/75_M1_4_STRESS_MEMORY_AUDIT.md`

CI now verifies:
- 40 presented citizens
- 40/40 road routing
- draw-call / triangle budgets
- renderer geometry/texture stability
- bounded post-GC heap growth
- no browser page errors

Target-hardware FPS and a long physical-browser soak remain separate validation gates.


## M1.5 persistence / concurrency hardening

See:
`docs/76_M1_5_PERSISTENCE_CONCURRENCY_HARDENING.md`

Current runtime additionally verifies:
- command retry idempotency
- command-id conflict rejection
- same-owner operation serialization
- first-load race recovery
- JSON receipt persistence
- Postgres event timeline writes
- snapshot retention
- explicit migration runner

Lease activation remains gated on introduction of a second authoritative world-advancement process.


## M1.6 runtime boundary hardening

See:
`docs/77_M1_6_RUNTIME_BOUNDARY_HARDENING.md`

Engineering branch:
`chatgpt/m1-6-runtime-boundary`

Added without touching visual systems:
- runtime parsing for every M1 WorldCommand
- fail-closed unknown-command handling
- bounded JSON request bodies
- deterministic 400 / 401 / 403 / 409 / 413 / 415 API errors
- owner-header sanity checks
- graceful HTTP + PostgreSQL shutdown
- repeatable E2E identities independent of stale JSON state
- protocol/server/application regression tests

M1.6 exit is PASS on PR #3: TypeScript, unit, production build, browser/API E2E, migration first-run + safe rerun, real PostgreSQL integration, and preflight are green.


## M1.7 authoritative read checkpoints

See:
`docs/78_M1_7_AUTHORITATIVE_READ_CHECKPOINTS.md`

Engineering branch:
`chatgpt/m1-7-authoritative-checkpoints`

Runtime-only scope:
- keep ordinary GET polling projection-only
- checkpoint non-paused read progression every 5 real minutes
- checkpoint material simulation boundaries immediately
- persist read-resolved combat aftermath/events exactly once
- protect checkpoint writes with revision CAS
- reload committed winner after checkpoint CAS race
- create no command receipt for read checkpoints

M1.7 exit is PASS on PR #5: preflight, TypeScript, unit, production build, browser/API E2E, migration first-run + safe rerun, and PostgreSQL integration are green.


## M1.8 persisted state integrity & recovery

See:
`docs/79_M1_8_PERSISTED_STATE_INTEGRITY_RECOVERY.md`

Engineering branch:
`chatgpt/m1-8-state-integrity-v2`

Runtime/persistence-only scope:
- schema-version enforcement
- structural WorldState validation
- JSON SHA-256 envelope + same-revision backup recovery
- receipt integrity validation
- PostgreSQL latest-snapshot fail-safe
- read-only snapshot doctor
- explicit revision-forward PostgreSQL recovery
- abandoned-history command/event cleanup

M1.8 v2 code/runtime gates are PASS on PR #10: preflight, TypeScript, unit, production build, M1 runtime browser flow, migration first-run + safe rerun, and PostgreSQL corruption/recovery integration are green. Merge remains blocked by the existing visual stress frame gate on the current visual HEAD; no threshold or graphics code is changed.
