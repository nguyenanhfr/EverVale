# 66 — Pre-Engineering Design Lock

Status: **PARTIALLY REOPENED — ECONOMY/GAMEPLAY ONLY**

> **2026-09-21 PARTIAL REOPEN:** Economy/gameplay-system integration is no longer considered locked. `docs/80_GAMEPLAY_SYSTEMS_STUDIO_REAUDIT.md` found that the prior long-run proof did not exercise real purchase/construction/funding/recovery rules. This document remains historical authority for unaffected architecture decisions, but it must not be used to justify additional Economy/Progression feature implementation until docs 81–82 gates pass.

Date: 2026-09-21

## Decision

EverVale pre-production design/data is now sufficiently locked to begin engineering without agents inventing foundational rules.

This lock does NOT mean final release balance is proven.

It means every previously identified studio gap now has:
- a canonical owner
- machine-readable data where appropriate
- a validation contract
- an audit/CI path
- an implementation phase

## Closed gaps

### Long-run economy/offline
Authority:
- docs/60_LONG_RUN_SIMULATION_CONTRACT.md
- tools/simulation/simulate_long_run.py

Horizons:
2h / 8h / 24h / 48h / 7d.

### Spatial combat
Authority:
- docs/61_SPATIAL_COMBAT_SIMULATION_CONTRACT.md
- tools/simulation/simulate_spatial_combat.py
- data/combat/v0.2/special_behaviors.yaml

Travel time, sectors, objectives and special behaviors are now explicitly defined.

### Procedural-map fairness
Authority:
- docs/62_WORLDGEN_VALIDATION_CONTRACT.md
- tools/validation/validate_worldgen.py
- data/world/v0.1/*

1000-seed validation is the CI target.

### Content/schema consistency
Authority:
- docs/63_CONTENT_SCHEMA_VALIDATION.md
- tools/validation/validate_content.py

Cross-file IDs must fail CI when inconsistent.

### Database/persistence
Authority:
- docs/64_PERSISTENCE_DATABASE_CONTRACT.md
- db/migrations/0001_world_core.sql

World revision, snapshot, event, command idempotency and exclusive simulation lease are concretely specified.

### Performance
Authority:
- docs/65_PERFORMANCE_BUDGETS.md

M1 has explicit FPS, frame-time, draw-call, triangle, memory, network and server-tick targets.

### Building numeric coverage
Authority:
- data/content/v0.2/buildings.yaml
- data/balance/v0.2/buildings.yaml

Cross-reference result at lock:
- 49 detailed building IDs
- 49 numeric building IDs
- missing numeric definitions: 0
- orphan numeric definitions: 0

The larger 78-ID v0.1 catalogue remains a future planning catalogue, not implementation-ready content.

### Combat production coverage
At lock:
- 17 defense unit IDs
- 17 production/support contracts
- missing production contracts: 0

### Enemy behavior
Numeric contracts now exist for:
- Burrower bypass
- Scout/UFO scan
- UFO disable beam
- Drop Pod payload
- Walker shock pulse
- Shield Drone
- Command Saucer
- Siege Beast
- Carrier deployment
- Anomaly Giant
- Mothership Fragment phases

### Weather/incident integration
Weather hazard IDs are reconciled with incident handlers:
- road blockage
- bridge fault
- lightning fire
- storm damage
- lift fault
- generator fault

### Threat ambience
Ambient UFO/monster/radar activity exists separately from real waves and cannot expose an exact attack timer.

## Deprecated SSOT

Runtime must reject:
- data/balance/v0.1/buildings.yaml
- data/balance/v0.1/combat.yaml
- data/balance/v0.1/waves.yaml
- data/worldgen/v0.1/generation.yaml

These remain only for history.

## What is still intentionally unproven

These are ENGINEERING/PLAYTEST evidence gates, not design gaps:

1. Real browser FPS on target hardware
2. Real PostgreSQL lease-race test
3. Real Three.js 20–40 citizen runtime
4. Real nav/path rebuild latency
5. Real 1000-seed production terrain generator
6. Real spatial combat distribution after runtime implementation
7. Player fun/readability from playtest
8. Final balance of M2/M3 content

Agents must not respond to these uncertainties by inventing new foundational systems.

They implement the locked contracts, measure, then tune data.

## Change control

After this lock:

### Allowed without ADR
- bug fixes
- balance-number tuning inside existing model
- art improvements
- performance optimization preserving behavior
- additional variants using existing mechanics

### Requires ADR / canon review
- new core resource
- changing client/server authority
- changing offline-world principle
- individual citizen micromanagement
- switching combat to RTS direct control
- replacing road graph source of truth
- changing Tech progression model
- changing permanent-loss philosophy
- adding another primary renderer/network/database stack

## Final pre-engineering verdict

**DESIGN/DATA: LOCKED**

**M0 ENGINEERING: APPROVED**

**M1 VERTICAL SLICE: APPROVED AFTER M0 GATES**

**FULL CONTENT PRODUCTION: STILL PHASE-GATED**

The next meaningful work is engineering, not more foundational game design.
