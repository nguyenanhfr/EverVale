# 58 — Studio Readiness Audit — 2026-09-21

Status: **HISTORICAL PASS — ECONOMY/GAMEPLAY PARTIALLY REOPENED**

> **2026-09-21 RE-AUDIT OVERRIDE — ECONOMY/GAMEPLAY:** the Economy/Society PASS in this historical audit is reopened by `docs/80_GAMEPLAY_SYSTEMS_STUDIO_REAUDIT.md`. The original long-run harness bypasses real purchase/construction progression and cannot serve as canonical economy proof. Product identity remains valid; new economy/progression feature code is held until the DevSim and server-authority gates in docs 81–82 are satisfied.

## Executive verdict

EverVale now has enough coherent design to begin implementation of a real vertical slice.

It does **not** yet have enough fully balanced content to implement the entire planned game in one pass.

Recommended studio decision:

**GREENLIGHT M0/M1 engineering.**
**HOLD full-content production until M1 proves the loop.**

---

# 1. Product / Game Loop — PASS

Core identity is clear:

`Build → Connect → Auto-staff → Observe → Improve → Defend → Recover → Expand`

The player controls systems rather than individuals.

The design has:
- persistent world
- autonomous citizens
- clear four-resource economy
- Tech progression
- procedural expansion
- blockers/terraces
- living-world activity
- combat/threat layer
- campaign/endless framing
- anti-idle limits

No fundamental product-identity gap remains.

## Risk

The project can still become too broad if every documented content idea is implemented before the core loop is fun.

Mitigation:
- vertical slice content freeze
- registry architecture
- phased roadmap

---

# 2. Economy / Society — PASS WITH BALANCE WORK

Strong:
- Money source is explicit
- Power/Water are readable abstractions
- Varum is direct
- Population/Housing/Happiness loop exists
- Workforce allocation is automatic
- Tech has offline decision gates
- storage/Housing prevent infinite idle growth

P0 fix completed during audit:
- canonical House ID aligned to `house_small`
- Market Tier aligned
- Restaurant/Builder's Yard onboarding balance added
- peacetime Workforce now favors Education over idle Defense
- active threat boosts Defense staffing

## Remaining P1

Need integrated long-run simulation including:
- maintenance
- incidents
- weather
- repair
- Tech gates
- threats
- construction queue

Run:
- 2h
- 8h
- 24h
- 48h
- 7-day catch-up

before declaring release balance.

---

# 3. Combat / Threat — PASS FOR EARLY SLICE

Strong:
- automatic deployment philosophy
- doctrine/sector commands
- win/loss outcomes
- structure/vehicle disabled states
- no permanent save loss
- early levels 1–10
- major/minor cadence
- ambient threat activity
- air/ground counter gating
- structure HP/Armor
- production source contracts
- unit movement/range data

P0 fixes completed:
- first wave cannot be unavoidable loss
- Town Wardens provide safety floor
- Watchtower counters light air
- Military Power removed from threat rating
- old enemy IDs reconciled
- unit Tech naming reconciled
- production-source contracts added
- structure durability contract added
- stale combat v0.1/wave data deprecated

## Remaining P1

Special enemy behaviors need numeric contracts:
- shield strength/duration
- Carrier deployment count/cooldown
- Drop Pod payload
- scan/raid objective rate
- Walker shock pulse
- Burrower bypass rule

Spatial Monte Carlo still needs:
- response travel time
- road/gate failure
- sector assignment
- objective progress

Toy HP/DPS simulation is not enough for final combat balance.

---

# 4. Living World — PASS

Strong:
- citizen routines
- automatic work/school
- animals/pets
- traffic
- parks
- activity anchors
- activity director
- simulation LOD
- contextual threat/weather response

The design correctly separates:
- authoritative meaning
- client presentation

This is one of the strongest parts of the project.

## Remaining P1

Need one real runtime proof with:
- 20–40 visible citizens
- school commute
- work commute
- Park use
- pet/animal ambient behavior
- threat evacuation
- reconnect reconstruction

Do not expand archetype count until this performs well.

---

# 5. World / Map / Construction — PASS WITH ONE SSOT

Strong:
- procedural seed
- fairness validator requirements
- blockers
- terraces
- roads
- Hill Lift
- bridges/tunnels
- access classes
- starter guarantees

P0 fix:
- old `data/worldgen/v0.1/generation.yaml` deprecated
- canonical world data is `data/world/v0.1/*`

## Remaining P1

The map generator has constraints, not a proven algorithm yet.

Need a spike generating at least:
- 100 seeds locally during development
- 1000 seeds in CI audit

and measuring:
- starter area
- connectivity
- first Varum cost
- threat corridor
- unreachable sectors

---

# 6. Content — PARTIAL

Three content scopes currently exist:

- **78 planned buildable IDs**
- **49 detailed named/art-directed buildings**
- **49 numerically balanced building definitions in v0.2**

This is not a contradiction if treated as:
- planned catalogue
- detailed catalogue
- implemented/balanced subset

It becomes a problem only if an agent assumes all 78 are implementation-ready.

## Studio rule

Do not balance all 78 before M1.

M1 uses a frozen subset.

After M1 passes, expand building families through shared mechanics and variants.

---

# 7. Architecture — PASS

Layering is strong enough to begin.

Required boundaries are documented:
- Domain
- Application
- Infrastructure
- Client presentation
- React HUD
- Tooling/content

Registry pattern is appropriate for dozens of buildings/actors.

Server authority and offline lease model are coherent.

## Remaining engineering work

No runtime scaffold exists yet.

This is expected.

M0 must establish:
- workspace/package manager
- TypeScript strict configs
- domain/application packages
- client/server apps
- test runner
- content schema validator
- CI
- DB migrations
- logging/error conventions

These are implementation tasks, not missing game design.

---

# 8. Persistence / Multiplayer Readiness — PASS FOR SINGLE-OWNER START

The conceptual contracts support:
- world identity
- revision
- leases
- snapshots
- memberships
- future observers/co-builders

## Remaining P1

Need concrete DB schema and transaction tests for:
- world lease
- snapshot
- event log
- command idempotency
- membership
- catch-up transaction

Future multiplayer does not need to be built now.

---

# 9. UI / UX — PASS FOR IMPLEMENTATION

HUD states exist for:
- normal town
- warnings
- combat
- result
- settings
- accessibility

## Remaining P1

Need actual wireframe/prototype validation for:
- build menu
- inspector
- Workforce priorities
- threat HUD
- mobile layout

Do not wait for perfect UI art before M1.

---

# 10. Art / Asset Pipeline — PASS

Strong:
- Blender MCP
- Blender CLI
- GLB runtime
- validation
- provenance
- LOD/collider rules
- activity-anchor metadata
- visual critic loop

## Remaining P1

Need numerical scene budgets on target hardware:
- draw calls
- triangles
- texture memory
- skinned actors
- shadow casters
- active VFX

Current guidance is architectural, not measured.

---

# 11. Weather / Incidents — PASS AS SYSTEM DESIGN

Four seasons, weather states, local incidents and bounded offline outcomes exist.

## Remaining P1

Need integrated risk tuning.

Goal:
- incidents create stories
- they do not become chores

Healthy towns should auto-resolve most low-severity incidents.

---

# 12. Audio / Narrative / Polish — P2

Enough story exists to support implementation.

Not yet needed for engineering start:
- full soundscape bible
- music progression
- localization matrix
- cinematic treatment
- marketing/monetization
- achievement system

Do not block M0/M1 on these.

---

# Resolved P0 contradictions

During this audit the following were corrected:

1. `house` vs `house_small`
2. Market Tech-tier mismatch
3. Guard staffing could starve Education
4. Defense did not dynamically increase staffing during threat
5. stale combat v0.1 SSOT
6. stale waves v0.1 SSOT
7. duplicate world-generation SSOT
8. missing combat production source contracts
9. missing structure HP/Armor
10. Scout Plane impossible Tier/source mismatch
11. missing Shelter gameplay contract
12. missing Heavy Turret building contract
13. ambient threat layer absent
14. threat rating previously punished military investment
15. early air enemy lacked fair counter

---

# Remaining blockers by severity

## P0 — before full production
None that block starting the vertical slice.

## P1 design/data contracts — CLOSED
The following now exist:
- content/schema validator
- concrete DB migration
- long-run simulation contract + harness
- spatial combat contract + harness
- worldgen fairness validator
- performance budgets
- unit/building production validation
- special enemy numeric behavior contracts

Runtime evidence still belongs to M0/M1 exit testing.

## P2 — before public release
- full content balance
- sound/music bible
- localization
- telemetry/crash reporting
- deployment/operations handbook
- browser/device support matrix
- onboarding/tutorial polish
- accessibility validation
- full campaign tuning

---

# Studio decision

**EverVale is ready to START DEVELOPMENT.**

But the approved start is:

**M0 foundation → M1 vertical slice → audit/playtest → expand.**

It is **not** approved to ask an agent to implement the entire documented game in one uninterrupted pass.
