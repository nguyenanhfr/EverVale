# 03 — Core Gameplay Loop

> **Leadership override — 2026-09-21:** the loop below remains the operational skeleton, but it is not sufficient as the strategic core. EverVale must require meaningful path choice and opportunity cost; ordinary players must not efficiently maximize Economy, Tech, Civic/Growth and Defense simultaneously. Canonical direction and open debt: `docs/83_CORE_GAMEPLAY_STRATEGIC_PATHS_AND_DEBT.md`.

## Primary loop

`Plan → Build → Staff Automatically → Observe → Improve → Defend → Recover → Expand`

The player manages systems, not individual citizens.

## Build

Player places or edits:
- roads
- houses
- Money workplaces
- Power Plant
- Water Plant
- School
- Park
- Farm
- Market/Café
- Varum Mine
- defense
- advanced military facilities

Construction uses:
- Money
- time
- optional Varum for advanced structures

There is no construction-goods resource in v0.1.

## Connect

Road connection is the physical access rule.

A building can exist but be inactive because it is:
- disconnected
- understaffed
- short on Power
- short on Water
- Tech locked
- damaged
- unfunded

MVP does not require player-drawn Power or Water networks.

## Staff Automatically

Buildings request workers.

The job allocator assigns available Workforce using:
- critical utility priority
- player category priority
- building priority
- road accessibility
- commute cost

The player never drags individual citizens into workplaces.

## Operate

Server resolves:
- Money
- Power
- Water
- Varum
- Tech
- Population Growth
- Happiness
- Workforce allocation
- construction
- threat pressure
- combat/events

## Visible Life

The client turns world state into believable autonomous activity:
- adults commute to jobs
- children attend School
- citizens use Parks
- farmers work fields
- dogs/cats appear around homes
- chickens/ducks animate around Farms
- civilian traffic changes by hour
- guards patrol
- town quiets under threat

These behaviors must reflect authoritative state rather than random decoration.

## Observe

The UI explains causes.

Good:

```
Varum Mine — 50% output
1 / 2 workers
Power OK
Water OK
Road OK
```

Bad:

```
Efficiency 50%
```

with no explanation.

## Improve

Player can:
- build more Housing
- improve Happiness
- add income workplaces
- add utility capacity
- change job priorities
- expand School capacity
- build Varum production
- improve roads
- add defense
- upgrade Tech-locked systems

## Defend

Threats arrive without exact countdown.

Preparation matters through:
- staffing
- placement
- radar
- defense coverage
- vehicles
- aircraft
- Varum technology

Combat is autonomous by default.

## Recover

After danger:
- damage remains visible
- repair consumes Money/time
- injured actors recover
- disabled vehicles repair
- routines resume
- After-Action history explains what happened

## Session loop

A short session should normally offer:
- one meaningful build or priority decision
- one visible system consequence
- one living-world observation
- optional decoration/optimization

A long session deepens planning rather than increasing click frequency.
