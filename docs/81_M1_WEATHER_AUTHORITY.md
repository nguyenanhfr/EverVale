# 81 — M1 Weather Authority v1

Status: **IMPLEMENTED / CI PENDING**

Date: 2026-09-22

## Goal

Move weather from presentation canon/data into authoritative world simulation before adding rain/snow visuals.

The client must never invent persistent weather.

## Authoritative state

`WorldState.weather` carries:

- season
- season progress
- climate seed
- current weather kind
- deterministic episode index/seed
- episode remaining time
- severe-weather cooldown

The field remains optional at the serialized TypeScript boundary only so old snapshots and pre-weather tests can still load. Production game data always provides weather definitions, and WorldService normalizes old worlds into an authoritative weather state.

## Data ownership

Balance source:

`data/weather/v0.1/weather.yaml`

`packages/balance-data` maps canonical YAML into `SimulationDefinitions.weather`.

The domain does not hard-code season weights or gameplay multipliers.

## Determinism

`packages/domain/src/weather.ts` uses only:

- climate seed
- episode index
- season
- previous weather
- persisted cooldown/state

No unseeded runtime randomness is used.

Offline catch-up can process multiple episode boundaries and produces the same result whether time is advanced in one chunk or equivalent smaller chunks.

## M1 gameplay effects enabled

Weather now affects authoritative simulation through canonical modifiers:

- citizen Power demand
- citizen Water demand
- effective outdoor recreation contribution to Happiness

Examples already present in canonical data:

- Heatwave raises Water demand
- Cold Snap and snow raise Power demand
- Rain/storm states reduce outdoor activity

Travel/traffic multipliers are loaded into the authoritative definition contract but are not yet applied to movement timing in this slice.

## Persistence

Weather/season/episode transitions are material simulation boundaries.

A read that crosses a weather episode or season transition checkpoints the world using the existing revision CAS path.

Legacy snapshots without `weather` are deterministically initialized from world seed + current simulation time when loaded.

## Tests

Domain tests cover:

- deterministic replay across chunked catch-up
- four-season order
- severe cooldown
- safe neutral modifier fallback
- Heatwave increasing authoritative Water demand

Application tests cover:

- legacy save migration
- weather episode transition persistence through read checkpoints

## Explicit deferrals

Not in v1:

- client precipitation/fog/wetness rendering
- citizen visual umbrella/raincoat behavior
- travel-speed application
- bridge/lift fault effects until authoritative bridge/lift runtime objects exist
- forecast UI
- Weather Station

Condition-damage and road-blocking weather hazards are implemented in `docs/82_M1_WEATHER_HAZARD_AUTHORITY.md` and consume the blocker-aware routing contract in `docs/83_M1_8_BLOCKED_ROAD_AUTHORITY.md`.

Remaining weather features must consume this authoritative state rather than create a second weather authority.
