# 60 — Long-Run Integrated Simulation Contract

Status: **CANONICAL PRE-PRODUCTION GATE**

Purpose: prove that Economy + Workforce + Utilities + Tech + Population + Maintenance + Incidents + Weather + Threats + Repairs + Offline Catch-up do not create deadlocks, infinite passive growth, unavoidable collapse, duplicate simulation, or progression skips.

## Required horizons
- 2h
- 8h
- 24h
- 48h
- 7 days

Run both continuously online at 1x and equivalent offline catch-up. Significant outcomes must be statistically equivalent for identical seed/state.

## Canonical scenarios

### S0 — Starter unattended
No player construction after world creation.
Expected: no negative-resource death spiral in first 2h; Housing remains capped at 12; Treasury grows but caps; no Tech because no School; first threat remains survivable or bounded.

### S1 — Healthy civic town
Adds House + School + Park + Guard Post.
Expected: Population grows; T1 reached in roughly 90–150 min; Power/Water remain positive; Money remains positive; incident burden low.

### S2 — Overexpanded town
Too many civic/industry buildings before utility/workforce.
Expected: partial staffing, reserves drain, Happiness falls, Growth stops, low-priority buildings idle, town remains recoverable.

### S3 — Varum acceleration
Adds Mine at T1.
Expected: Varum reaches storage cap unattended; threat composition/intensity rises modestly; no automatic military purchase; T2+ decision gate blocks multi-tier offline jump.

### S4 — Weak defense
Economy strong, defense neglected.
Expected: costly repel/breach can happen; no world deletion; repair backlog appears.

### S5 — Prepared town
Good utilities, maintenance, defense.
Expected: most low incidents auto-resolve; major waves cost readiness/resources; long absence plateaus on caps/gates.

## Numeric gates
Across 500 seeded runs per scenario:
- Starter 2h unrecoverable collapse <= 0.5%
- Forced Breach before first meaningful defense decision <= 1%
- Healthy town 8h utility satisfaction median >= 0.85
- 48h offline Tech multi-tier skip = 0%
- Auto-purchased military units = 0
- Auto-built strategic structures = 0
- Resource caps respected = 100%
- 7d offline world remains stable plateau or recoverable backlog

## Canonical event ordering
1. world clock
2. weather/season transition
3. construction/clearance
4. connectivity
5. Workforce allocation
6. utility production
7. utility satisfaction
8. Money/Tech/Varum production
9. upkeep/funding
10. maintenance/condition
11. local incidents
12. Happiness
13. Population Growth
14. ambient threat
15. major threat pressure
16. combat/event resolution
17. repairs/recovery
18. event-log emission
19. persistence revision

Do not reorder without an ADR because order changes outcomes.

## Offline aggregation
Stable rates may integrate analytically. Discrete boundaries must be processed chronologically: construction completion, Tech gate, storage cap, utility exhaustion, weather episode, incident start/end, threat event, repair completion.

Reference audit harness: tools/simulation/simulate_long_run.py

## 2026-09-21 re-audit status

This contract remains the required target.

The current `tools/simulation/simulate_long_run.py` is now classified as an **exploratory smoke harness**, not evidence that this contract has been fully satisfied, because it bypasses authoritative purchase/construction progression and duplicates balance constants.

Replacement tooling contract:
- `docs/81_DEV_BALANCE_SIMULATION_TOOLING_CONTRACT.md`
- `docs/82_SERVER_AUTHORITATIVE_BALANCE_DATA_CONTRACT.md`
