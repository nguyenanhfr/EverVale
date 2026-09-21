# 82 — Server-Authoritative Balance & Anti-Tamper Contract

Status: **CANONICAL DIRECTION — REQUIRED BEFORE ECONOMY EXPANSION**

Date: 2026-09-21

Purpose:

Ensure EverVale balance cannot be changed by browser DevTools/F12 and prevent gameplay logic from drifting across:
- server
- client
- simulator
- documentation

This contract applies to:
- Economy
- Workforce
- Power/Water
- Tech
- Varum
- construction
- roads
- repairs
- combat
- rewards
- threat progression

---

# 1. Core authority rule

The browser sends **intent**.

The server resolves **truth**.

Client commands may say:

```
PLACE_BUILDING {
  definitionId: "school"
  x
  z
}
```

They must never be trusted to say:

```
moneyCost: 1
buildSeconds: 0
techTier: 0
income: 9999
powerProduction: 9999
```

Even if the client sends those fields, the server ignores/rejects them.

---

# 2. What F12 may change

A player can always modify their own browser:
- displayed Money
- displayed price
- button enabled state
- local React state
- local JavaScript
- CSS
- local request construction

That is unavoidable and harmless **if the server is authoritative**.

Example:

Browser is modified to display:

`School price = 1`

Player clicks Build.

Server loads canonical School definition:

`price = 300`

Server checks authoritative treasury.

Server deducts 300 or rejects the command.

The F12 edit changes presentation only.

---

# 3. Server balance SSOT

Authoritative numeric gameplay data belongs in versioned server-loaded data.

Current model already uses structures such as:

```
data/balance/v0.2/buildings.yaml
data/balance/v0.1/simulation.yaml
data/balance/v0.1/tech.yaml
data/combat/v0.2/*.yaml
data/world/v0.1/*.yaml
```

The exact future folder layout may evolve.

The rule does not.

### Runtime

Server:
1. loads versioned balance
2. validates schema/cross references
3. keeps immutable definition registry for the running balance version
4. resolves every command against that registry

Client:
- receives only the view/catalog data needed for UX
- never owns authoritative mutation rules

---

# 4. Public catalog versus authoritative balance

It is acceptable for the browser to know:
- title
- visible price
- worker count
- build time
- Tech requirement
- tooltip output

These are not secrets.

Security does **not** come from hiding numbers.

Security comes from the server recomputing outcomes independently.

Recommended separation:

```
AuthoritativeBuildingDefinition
  id
  costs
  requirements
  outputs
  upkeep
  failure rules
  staffing rules
  combat integration
  internal tags

PublicBuildingCatalogEntry
  id
  title
  visible cost
  visible build time
  visible requirements
  player-facing summary
```

Public catalog can be derived from authoritative definitions.

Do not maintain two manually edited price tables.

---

# 5. Commands contain semantic intent only

## Good

```
BUILD {
  definitionId
  position
  rotation
}
```

```
SET_JOB_PRIORITY {
  category
  priorityBand
}
```

```
QUEUE_REPAIR {
  buildingId
}
```

```
QUEUE_VEHICLE {
  unitDefinitionId
  sourceBuildingId
}
```

## Forbidden authoritative input from client

- Money balance
- Money cost
- refund amount
- build duration
- production rate
- Power/Water output
- upkeep
- repair cost
- repair duration
- Tech reward
- Tech threshold
- Varum cost
- unit HP/DPS/Armor
- readiness
- wave budget
- loot reward
- incident probability
- threat bracket
- settlement rating

Server derives these.

---

# 6. Transaction rule

For any economic mutation:

1. authenticate owner/session
2. load authoritative world
3. load authoritative definition
4. validate balance/schema version
5. validate expected world revision
6. validate prerequisites
7. calculate authoritative cost
8. calculate authoritative side effects
9. deduct resources
10. persist mutation atomically
11. return resulting authoritative state

Never:

1. trust client price
2. update client
3. asynchronously “sync later”

---

# 7. Balance versioning

Every persisted world must be associated with an explicit balance version.

Example concept:

```
simulation_version: m1
balance_version: 0.3
schema_version: 1
```

Requirements:
- command execution knows which balance version applies
- snapshot records are reproducible
- DevSim records balance version
- replay records balance version
- migration to a new balance version is explicit

Do not silently reinterpret an old world under incompatible numbers.

---

# 8. Gameplay hardcode policy

## Must be data-driven

Any number likely to be tuned by a designer belongs in authoritative balance data.

Examples:

### Economy
- starting Money
- resource caps
- Money yields
- upkeep
- costs
- storage
- funding thresholds

### Society
- Workforce fraction
- citizen Power demand
- citizen Water demand
- Growth threshold
- Growth rate
- Happiness weights

### Construction
- building costs
- build cycles
- construction slots
- road cost
- road length limits if gameplay-tuned
- road-access distance

### Repair
- repair base cost
- cost per missing condition
- repair duration
- readiness recovery

### Tech
- thresholds
- overflow caps
- decision gates
- School output

### Combat
- warning duration
- wave cadence
- HP/DPS/Armor
- aftermath damage
- rewards
- objective rates
- readiness effects

### Threat
- Settlement Rating coefficients
- brackets
- budgets
- adaptation limits

---

# 9. Current hardcode debt identified by audit

The following authoritative/tunable values currently exist in runtime/tool code and should be migrated to server balance data before expanding the gameplay system.

This is a design/data debt list, not an instruction to patch runtime immediately.

## Starting world

Runtime starter construction duplicates values also present in:

`data/balance/v0.1/simulation.yaml`

Examples:
- starting Money
- caps
- starting Power/Water
- starting Population
- starting Happiness
- initial buildings

Required direction:

one canonical starting-world fixture/data source.

---

## Society/economy

Current runtime contains direct numeric rules equivalent to:
- resident Power demand
- resident Water demand
- minimum resource caps
- T1 threshold behavior
- Happiness coefficients
- Growth coefficients

Some of these already exist in `simulation.yaml`.

Runtime should consume the loaded definition instead of repeating them.

---

## Roads

Current gameplay constants include values such as:
- Money per meter
- maximum segment length
- connection tolerance

If designers may tune them, they belong in balance data.

Geometric epsilon purely required for numerical correctness may remain technical code.

---

## Repair

Current repair economics include code-level formulas for:
- minimum Money cost
- Money per missing condition
- repair duration

These are balance values.

Move to authoritative data.

---

## Combat aftermath

Current aftermath contains code-level:
- COSTLY damage amount
- BREACH damage amount
- target priority sequence

Damage and target policy are game design.

They require versioned data.

---

## Long-run simulator

Current Python simulator duplicates:
- citizen utility demand
- Happiness weights
- Growth values
- incident proxy numbers

This is forbidden for DevSim v2.

---

# 10. What may remain hardcoded

Not every constant needs YAML.

Technical constants may remain code when they are not gameplay tuning.

Examples:
- SHA-256 algorithm identifier
- UUID format
- parser size safety limit
- JSON decoding rules
- database transaction semantics
- deterministic sorting implementation
- floating-point epsilon used only for geometry robustness
- network protocol framing
- persistence checksum format

Rule:

> If changing the number changes strategy, pacing, difficulty, reward or player choice, treat it as balance data.

---

# 11. Derived values

Prefer formulas derived server-side from canonical primitives.

Example:

Do not store both:

```
worker_income = 8
full_staff_income = 32
workers = 4
```

Store:

```
workers = 4
money_per_worker = 8
```

Derive:

`full_staff_income = 32`

This reduces contradictory data.

---

# 12. Funding authority

The current design requires explicit funding failure.

Required authoritative data should separate:

```
job_priority
funding_priority
criticality
minimum_operating_funding
unfunded_output_multiplier
unfunded_readiness_multiplier
```

Do not allow client to decide:
- which building gets funded
- how much upkeep was paid
- which output multiplier applies

Client may request a player policy/priority.

Server resolves actual allocation.

---

# 13. Workforce priority authority

Player-facing priority should be bounded semantic choices.

Example:

```
ESSENTIAL
HIGH
NORMAL
LOW
PAUSED
```

or category-level ordering.

Avoid client sending arbitrary multipliers like:

`priority = 999999`

Server maps semantic setting to allowed authoritative weights.

Emergency rules may override the player's setting according to data.

Example:
- critical utility floor
- active-threat defense boost

The override must be observable in UI.

---

# 14. Balance data validation

CI must validate:

- duplicate IDs
- unknown references
- invalid cost
- negative duration
- impossible Tech prerequisite
- resource with no producer
- resource with no sink
- building requiring nonexistent resource
- production unit without source
- upgrade without base
- threat bracket gap/overlap
- invalid priority
- unreachable progression
- deprecated SSOT accidentally loaded

A schema-valid YAML file is not enough.

Cross-system semantics must also pass.

---

# 15. Tamper test suite

The server should eventually have automated adversarial tests.

## Price tamper

Client sends fake cost.

Expected:
server uses canonical cost.

## Free build tamper

Client removes UI disabled state and sends build with insufficient Money.

Expected:
server rejects.

## Fake Tech

Client requests T5 building at T0.

Expected:
server rejects.

## Fake reward

Client reports battle reward.

Expected:
ignored/rejected; server calculates reward.

## Fake repair

Client sends repairCost=0.

Expected:
server uses canonical repair formula.

## Fake DPS

Client sends altered unit stat.

Expected:
server does not accept unit stat from client.

## Replay old command

Expected:
idempotent result without duplicate spend/reward.

## Revision race

Expected:
CAS conflict/reload; never duplicate purchase.

---

# 16. Dev tools and cheats

Developer utilities are necessary.

They must not weaken production authority.

Allowed server-side dev operations:
- grant Money
- set Tech
- force incident
- damage building
- trigger wave
- advance time
- load fixture
- inspect rates

Requirements:
- development/test environment only
- explicit server permission
- audit log in shared/staging environments where relevant
- impossible to activate by F12
- production startup should fail if unsafe dev-cheat mode is enabled accidentally

---

# 17. Server-generated observability

To make economy understandable, the server may expose derived explanations.

Example:

```
Workshop {
  operational: true
  staffing: 0.50
  funding: 1.00
  powerSatisfaction: 1.00
  waterSatisfaction: 1.00
  effectiveMoneyPerCycle: 16
  limitingReasons: ["WORKFORCE"]
}
```

This is better than making the browser reproduce economic formulas.

The client renders the explanation.

The server owns the calculation.

---

# 18. DevSim authority

`docs/81_DEV_BALANCE_SIMULATION_TOOLING_CONTRACT.md`

requires DevSim to use the same balance loader/rules.

Every simulation report must include:

```
worldSchemaVersion
simulationVersion
balanceVersion
contentRevision
seed
scenarioPolicyVersion
```

A report without provenance is not balance evidence.

---

# 19. Security interpretation

EverVale does not need to hide ordinary game values from users.

Players may inspect:
- price
- DPS
- build time
- Tech threshold

That is normal.

The anti-cheat requirement is:

**Changing those values in the browser must not change authoritative state.**

Therefore:
- server authority > obscurity
- validation > minification
- semantic commands > client-calculated transactions

---

# 20. Exit gate

Before economy/progression expands beyond the current slice:

- authoritative balance SSOT defined
- gameplay hardcode inventory closed or explicitly grandfathered
- server command intent model reviewed
- public catalog derived from server data
- funding policy data exists
- Workforce priority policy data exists
- DevSim uses same authority
- F12/tamper tests pass
- no client-provided balance number affects authoritative mutation

Related:
- `docs/80_GAMEPLAY_SYSTEMS_STUDIO_REAUDIT.md`
- `docs/81_DEV_BALANCE_SIMULATION_TOOLING_CONTRACT.md`
