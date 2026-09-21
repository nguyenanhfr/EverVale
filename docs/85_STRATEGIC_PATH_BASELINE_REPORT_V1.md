# 85 — Strategic Path Baseline Report v1

Status: **MEASUREMENT RUN PENDING**

Date: 2026-09-21

Authority:
- strategic direction: `docs/83_CORE_GAMEPLAY_STRATEGIC_PATHS_AND_DEBT.md`
- Constitution candidate: `docs/84_CORE_GAMEPLAY_CONSTITUTION_V1.md`
- measurement engine: `packages/devsim/src/strategic-paths.ts`

Purpose:

Measure whether the current authoritative runtime/balance already produces distinct strategic identities for:

- INDUSTRIAL
- SCHOLAR
- CIVIC
- FORTRESS
- BALANCED HYBRID
- OMNI BUILD
- PIVOT
- STRONG MULTIPATH

This report does not change gameplay balance.

## Required measurements

Run:

```
pnpm devsim paths --hours 8 --long-hours 12 --strong-hours 12 --seed 1
```

Directional gates:

- G1 Industrial identity
- G2 Scholar identity
- G3 Civic identity
- G4 Fortress identity
- G5 Sacrifice
- G6 Omni penalty
- G7 Hybrid validity
- G8 Pivot viability
- G9 Pivot cost
- G10 No dominant path

## Important limitation

Current DevSim path model intentionally uses only:
- real build order
- authoritative WorldService/domain simulation
- authoritative balance data
- job-priority overlays

It does **not** invent Settlement Charter bonuses that do not exist in runtime.

Therefore failures indicate where current systems do not yet naturally support the Constitution.

Results will be recorded after CI execution.
