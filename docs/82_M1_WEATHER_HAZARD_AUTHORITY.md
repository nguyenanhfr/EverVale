# 82 — M1 Weather Hazard Authority v1

Status: **IMPLEMENTED / CI PENDING**

Date: 2026-09-22

## Goal

Convert selected canonical weather hazard tags into bounded authoritative world consequences without inventing client-only incidents or introducing a second incident authority.

This slice extends `docs/81_M1_WEATHER_AUTHORITY.md`.

## Supported M1 weather hazards

Weather episodes may currently produce hazards backed by existing authoritative primitives:

- `lightning_fire`
- `storm_damage`
- `generator_fault`
- `fallen_tree`
- `road_blockage`

These use canonical data from:

- `data/weather/v0.1/weather.yaml` for hazard tags and per-episode chance
- `data/incidents/v0.1/incidents.yaml` for eligibility, severity and condition-damage range

## Effects

A supported hazard may:

- select one eligible completed building deterministically
- reduce building condition by the canonical incident range
- set `DAMAGED` or `DISABLED`
- reset any stale repair timer
- select an eligible road deterministically
- create a clearable authoritative blocker on that road
- append a bounded player-facing `WorldEvent`

A weather hazard never:

- deletes a building
- reduces condition below the M1 recovery floor of 10
- mutates building definitions
- bypasses the normal repair command
- uses unseeded runtime randomness

## Determinism

The hazard decision uses:

- persisted weather episode seed
- hazard tag
- canonical hazard chance
- deterministic target ordering
- deterministic damage roll

Event IDs are deterministic:

`weather-{episodeSeed}-{hazardTag}`

Replaying the same episode against the same authoritative state therefore does not create a different event identity or double-apply the same incident.

## Offline fairness

Weather hazard count is capped by canonical weather data:

`max_offline_severe_events_per_24h`

The cap is calculated from **real elapsed catch-up time**, not accelerated simulation time.

A world left at 4× speed therefore does not receive four times the allowed offline hazard count.

The normal seven-day WorldService catch-up cap still applies outside this module.

## Timeline

Weather incident events use the existing bounded event history.

`happenedAt` is reconstructed from:

- persisted `lastSimulatedAt`
- episode start in simulation time
- current world speed

Weather transitions and resulting events already count as material read-checkpoint boundaries, so visible consequences are persisted by the existing revision-CAS path.

## Path-block hazards

`fallen_tree` and `road_blockage` are now authoritative.

- `fallen_tree` creates a `fallen_tree` blocker.
- `road_blockage` creates a generic `rubble` blocker.
- road + placement are deterministic from the weather episode seed.
- placement avoids overlap with existing blockers.
- blocker clearing uses the existing `CLEAR_BLOCKER` command and timer.
- routing consumes blocker position/radius through the contract in `docs/83_M1_8_BLOCKED_ROAD_AUTHORITY.md`.

Still deferred:

- `bridge_fault`
- `lift_fault`

M1 has no authoritative bridge/lift runtime objects yet, so those tags remain inert instead of creating fake state.

## Tests

Domain tests cover:

- deterministic and idempotent condition hazards
- per-real-day catch-up cap
- deterministic road blocker generation
- route disconnect while blocker exists
- blocker CLEARING lifecycle
- route reconnect after blocker removal
- no building deletion / condition below recovery floor
- full `advanceWorld` wiring from weather episode transition to condition damage + timeline event

## Path-block routing dependency

The routing dependency is now implemented in `docs/83_M1_8_BLOCKED_ROAD_AUTHORITY.md`:

1. blocker-to-road circle/intersection semantics — complete
2. blocked road intervals excluded from the graph — complete
3. disconnected/re-routed actor behavior — complete
4. blocker clear/reconnect routing tests — complete

Weather creation of `fallen_tree` / `road_blockage` is now implemented as the follow-up slice. `bridge_fault` / `lift_fault` remain deferred until their authoritative runtime objects exist.
