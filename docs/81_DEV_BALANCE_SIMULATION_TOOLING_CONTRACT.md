# 81 — Dev Balance Simulation Tooling Contract

Status: **REQUIRED BEFORE NEW ECONOMY/PROGRESSION FEATURE CODE**

Date: 2026-09-21

Purpose:

Build a developer simulation layer that answers:

- Is the economy fun enough to create real decisions?
- Can a player recover from bad planning?
- Can passive waiting solve too much?
- Can any strategy soft-lock progression?
- Are Money/Power/Water/Varum/Tech meaningful?
- Do defense and repair create real economic pressure?
- Do docs, data and runtime produce the same result?

This document specifies tooling only.

It does not authorize runtime gameplay changes.

---

# 1. Core rule

The next balance simulator must **not re-implement the game in a second toy model**.

The preferred architecture is:

```
authoritative balance data
        ↓
server balance loader
        ↓
domain/application simulation rules
        ↓
headless DevSim runner
        ↓
scenario policy / Monte Carlo / reports
```

The headless simulator should call the same authoritative transition functions used by the server wherever practical.

Python may orchestrate sweeps/reporting, but Python must not become a second source of gameplay truth.

---

# 2. Why the current long-run harness is insufficient

`tools/simulation/simulate_long_run.py` currently:
- adds buildings directly
- bypasses purchase cost
- bypasses construction time
- bypasses construction slots
- bypasses placement/road checks
- bypasses player action policy
- bypasses real repair queues
- bypasses real wave/combat results
- duplicates gameplay constants

It remains useful for smoke exploration.

It must not be used as final balance proof.

---

# 3. DevSim v2 required commands

Suggested developer CLI shape:

```
pnpm devsim scenario <scenario-id>
pnpm devsim sweep <parameter-set>
pnpm devsim economy-report
pnpm devsim graph
pnpm devsim softlock
pnpm devsim milestones
pnpm devsim replay <seed>
pnpm devsim compare <baseline> <candidate>
pnpm devsim authority-test
```

Names are not canonical implementation requirements.

Capabilities are.

---

# 4. Scenario runner

A scenario consists of:

```
Scenario {
  seed
  horizon
  initialWorld
  playerPolicy
  threatPolicy
  offlineWindows
  expectedGates
}
```

The simulator advances:
- the same world state
- the same resource rules
- the same construction queue
- the same Workforce allocation
- the same Tech gates
- the same threat/damage/repair rules

No scenario may directly mutate finished buildings to fake player progression unless explicitly testing migration/recovery.

---

# 5. Mandatory player policies

## S0 — STARTER_IDLE

Actions:
- none

Proves:
- passive plateau
- storage caps
- no auto-win
- no accidental collapse

## S1 — HEALTHY_PLANNER

Priority:
1. safe Growth
2. School
3. reasonable recreation
4. basic defense
5. utility expansion before shortage

Proves:
- intended onboarding curve
- T1 timing
- readable steady growth

## S2 — ECONOMY_RUSH

Priority:
- maximize Money workplaces
- delay civic/defense investment

Proves:
- worker opportunity cost
- Tech slowdown
- threat consequences
- whether Money snowballs too hard

## S3 — TECH_RUSH

Priority:
- School/Tech investment before Money optimization

Proves:
- opportunity cost
- whether extra School is actually useful
- Tech milestone timing

## S4 — DEFENSE_RUSH

Priority:
- guard/readiness before economic expansion

Proves:
- defense tax
- safe but slower growth

## S5 — BEAUTY_RUSH

Priority:
- Parks/beauty/decor spending

Proves:
- decor is not a free optimal strategy
- Happiness benefit has bounded ROI

## S6 — OVEREXPAND

Priority:
- build Housing/services/workplaces faster than utilities/Workforce support

Proves:
- visible shortage
- Growth brake
- recovery path

## S7 — UTILITY_FAILURE

Inject:
- Power or Water producer disabled

Proves:
- reserves
- operation throttling
- citizen consequence
- recovery

## S8 — COMBAT_LOSS_RECOVERY

Inject:
- costly repel / breach

Proves:
- damage sinks
- repair backlog
- output loss
- recovery time

## S9 — TREASURY_CRISIS

Start:
- very low Money
- high upkeep

Proves:
- funding priority
- critical-service protection
- no unrecoverable zero-Money trap

## S10 — OFFLINE_24H

Proves:
- same strategic plateau
- no multi-tier skip
- no automatic expensive decisions

## S11 — RANDOM_NEW_PLAYER

A bounded stochastic policy that:
- chooses from visible legal actions
- sometimes makes suboptimal choices
- does not know hidden formulas

Run many seeds.

Proves:
- beginner robustness
- accidental traps

---

# 6. Scenario actions must use real commands

A scenario policy may request:

```
BUILD(buildingId, location)
DRAW_ROAD(...)
CLEAR_BLOCKER(...)
SET_PRIORITY(...)
QUEUE_REPAIR(...)
QUEUE_VEHICLE(...)
CONFIRM_TECH_GATE(...)
PLACE_DECOR(...)
```

The policy does **not** provide:
- price
- production
- build duration
- reward
- worker output
- repair formula
- DPS
- wave budget

Those are resolved from authoritative server data.

If a policy attempts an illegal action, DevSim records the server rejection.

---

# 7. Required economic metrics

Every run must record time series for:

## Money

- treasury
- income
- upkeep
- construction spend
- road spend
- decor spend
- repair spend
- military spend
- incident losses
- rewards
- cap waste

## Workforce

- available
- assigned
- unassigned
- unmet worker demand
- staffing ratio by category
- duration at zero staffing

## Utilities

- production
- demand
- reserve
- reserve-cap waste
- shortage duration
- satisfaction
- facility throttle duration

## Growth

- Population
- Housing
- Growth progress
- Happiness
- time Growth blocked
- reason Growth blocked

## Tech

- Tech production
- time to each threshold
- time pending decision gate
- wasted/overflow Tech
- School staffing

## Varum

- production
- storage cap
- spending
- idle capped time

## Defense

- readiness
- staffing
- spend
- damage prevented
- repair burden
- breach count

---

# 8. Faucet / sink report

DevSim must produce a Money ledger.

Example:

```
Money Faucets
-------------
Workshop income        +1880
Restaurant income       +420
Wave rewards             +60

Money Sinks
-----------
Construction            -980
Upkeep                   -610
Roads                    -140
Repairs                  -310
Military                 -250
Decor                     -80
```

Required diagnostics:

- faucet/sink ratio
- net by hour
- largest source
- largest sink
- time at cap
- time below emergency reserve
- spend category share

Equivalent ledgers should exist for:
- Power
- Water
- Varum
- Tech

---

# 9. ROI report

For every buildable, report both naive and constrained ROI.

Example:

```
Workshop
cost: 250
gross full-staff income: 32/cycle
upkeep: 3/cycle
naive net: 29/cycle
naive payback: 8.6 cycles

BUT:
requires 4 Workforce
current spare Workforce: 1

effective current contribution:
8 income - 3 upkeep = +5/cycle

effective current payback:
50 cycles
```

This is essential.

A balance sheet that ignores worker opportunity cost is misleading.

---

# 10. Opportunity-cost analysis

The simulator must answer:

> If I assign the next worker here, what do I lose elsewhere?

For each category:
- Money
- Power
- Water
- Tech
- Varum
- Defense

Report marginal value per worker.

Do not reduce everything to one hidden score in gameplay.

The report is for developers.

---

# 11. Milestone timing

Required milestone report:

- first meaningful purchase
- first Population growth
- first utility pressure
- T1
- T2 gate
- first Varum
- first meaningful defense purchase
- first costly repair
- first treasury crisis
- first second utility plant
- first advanced military unit

Report:
- median
- p10
- p90
- min/max outliers

across seeded runs.

---

# 12. Soft-lock detector

A state is suspicious when:
- no legal strategic action can improve it
- required progression has zero production
- treasury cannot recover
- all income production is disabled with no recovery route
- critical utility is disabled and repair cannot be funded
- Tech progression is starved indefinitely without visible explanation
- Population cannot grow and no available action communicates why

For each detected state, report:

```
SOFTLOCK_CANDIDATE
time: 04:20
reason: SCHOOL_ZERO_STAFF
cause:
  2 Workshops consumed all post-utility Workforce
recovery:
  build Housing
  or lower Economy job priority
visibility:
  current UI does not expose priority control
```

---

# 13. Sensitivity sweeps

Every balance change should be tested with:

- -30%
- -20%
- -10%
- baseline
- +10%
- +20%
- +30%

for key parameters.

Examples:
- starting Money
- Workshop income
- upkeep
- Power production
- Water production
- population consumption
- School Tech
- Housing cost
- repair cost
- threat cadence

Output should identify cliffs.

Example:

```
Water production
35 -> no pressure until Population ~45
24 -> second plant becomes relevant around Population ~30
18 -> frequent early shortage
```

Do not tune by intuition only.

---

# 14. Monte Carlo requirements

Deterministic economy paths:
- exact seed replay

Random systems:
- incidents
- weather
- threat composition
- damage targeting

Recommended:
- 100 runs for quick developer feedback
- 500 runs for balance PR
- 1000 runs for release candidate gates where cost permits

Always report distributions, not only averages.

---

# 15. Differential simulation

Before/after balance comparison must use the same seeds.

Example:

```
candidate: water_plant output 35 -> 24

Healthy Planner:
T1 median       2.7h -> 2.8h
shortage time   0%   -> 3%
second plant    never -> 3.2h

Overexpand:
Happiness min   88 -> 58
recovery median n/a -> 1.1h
```

This allows intentional tuning.

---

# 16. Dev balance graph

Tooling should export a machine-derived dependency graph from data.

At minimum:

```
resource -> producer
resource -> consumer
building -> worker demand
building -> upkeep
building -> unlock
building -> threat rating
damage -> disabled output
repair -> resource sink
```

If a resource has:
- no faucet
- no sink
- only one trivial sink
- no downstream effect

the tool flags it.

Example:

```
DEAD_RESOURCE_RISK: Varum
faucets: 1
meaningful current M1 sinks: 0
```

---

# 17. Balance regression gates

Examples of automated gates:

- no free construction
- no negative Money
- no storage-cap overflow
- no auto-purchased strategic building
- no automatic Tech choice
- no 24h multi-tier skip
- healthy T1 in target band
- overexpand creates at least one meaningful shortage
- starter is recoverable
- weak-defense losses are recoverable
- prepared defense is economically costly but beneficial
- random-new-player soft-lock rate below agreed threshold

Exact bands remain tuning data.

---

# 18. Server-side dev tools

Useful dev-only capabilities:

## World inspector

Read:
- all current resource rates
- staffing
- operational multipliers
- shortages
- funding
- upcoming deterministic boundaries

## Scenario injector

Dev-only server action:
- set approved test fixture
- trigger specific incident
- trigger specific wave
- damage selected building
- simulate offline N hours

Must be:
- server-side
- development/test only
- permission-gated
- impossible to enable silently in production

## Time warp

Server-side test mode:
- advance exact cycles
- deterministic seed

Do not fake resource state in the browser.

---

# 19. Tooling SSOT rule

DevSim must load:
- building values
- global economy values
- Tech thresholds
- repair values
- roads
- combat rewards/costs
- incident values
- threat values

from the same versioned server-authoritative data used by runtime.

Forbidden:

```
POWER_PER_CITIZEN = 0.5
```

inside a separate simulator when that value already exists in balance data.

Preferred:

```
balance.simulation.society.citizen_power_per_cycle
```

---

# 20. Exit gate

No new Economy/Progression feature implementation should be considered design-approved until DevSim can prove:

1. actions pay real costs
2. construction uses real queue/time
3. Workforce contention is simulated
4. funding failure is simulated
5. utilities can become relevant
6. combat/repair feed back into economy
7. Tech gates are real
8. soft-lock detection exists
9. balance sensitivity exists
10. client tampering cannot alter authoritative outcomes

Then numbers may be tuned.

Architecture authority:
`docs/82_SERVER_AUTHORITATIVE_BALANCE_DATA_CONTRACT.md`
