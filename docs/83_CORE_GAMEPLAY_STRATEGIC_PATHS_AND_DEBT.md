# 83 — Core Gameplay Strategic Paths & Product Debt Ledger

Status: **LEADERSHIP DECISION — CANONICAL DIRECTION / DESIGN BEFORE MORE GAMEPLAY CODE**

Date: 2026-09-21

Scope:
- core gameplay identity
- strategic path choice
- opportunity cost
- PvE reward loop
- Quest / Tutorial / Event debt
- PvP Raid future direction
- next-step execution order

This document does **not** authorize runtime implementation yet.

---

# 1. Leadership decision

EverVale must not become:

> build every useful building, wait long enough, and eventually own everything.

The intended strategic model is closer to a civilization strategy game:

> the player chooses what kind of settlement to become, invests deeply in that direction, and gives up or delays other directions.

A strong player may eventually cover several branches through:
- exceptional economic strength
- successful PvE rewards
- rare finds
- later trade/raid/PvP systems

But that must be an earned exception.

It must not be the default path.

---

# 2. Core game statement

The simplest description of EverVale should become:

> Build a living settlement, choose what it specializes in, survive threats, and use the advantages of your chosen path to grow stronger.

The player does not manage individual citizens.

The player controls:
- what the town invests in
- what the town is willing to sacrifice
- what receives Workforce
- what receives Money
- what receives Power/Water
- what receives Tech priority
- how prepared the town is for danger
- when to expand
- later, whether to raid or compete with other settlements

---

# 3. Core gameplay loop vNext

Target loop:

```
Choose strategic direction
        ↓
Invest scarce resources
        ↓
Town becomes better at one thing
        ↓
Other systems become weaker/slower
        ↓
Use specialization to earn advantage
        ↓
Respond to PvE threat / opportunity
        ↓
Win rewards or suffer damage
        ↓
Reinvest
        ↓
Deepen path OR pivot
```

Expansion alone is not the purpose.

**Strategic identity is the purpose.**

---

# 4. Strategic path constitution

Exact names may change.

The first design pass should support at least these competing paths.

## A. Economy / Industry

Fantasy:
- richer town
- stronger production
- faster construction
- better treasury recovery

Typical investment:
- Workshops
- Markets
- Farms
- production buildings
- logistics
- construction capacity

Consumes:
- Workforce
- Money
- Power
- Water
- building slots

Sacrifice:
- slower Tech if Schools are understaffed
- weaker Defense
- lower civic investment
- higher threat exposure from faster expansion

Reward:
- faster Money generation
- larger construction budget
- better ability to recover from losses

Failure risk:
- rich but technologically backward
- weak to combat
- Worker starvation in other sectors

---

## B. Knowledge / Tech

Fantasy:
- smaller but smarter settlement
- faster unlocks
- stronger advanced systems earlier

Typical investment:
- School
- Academy
- Research
- specialist infrastructure

Consumes:
- Workforce
- Money
- Power
- time

Sacrifice:
- slower immediate Money growth
- fewer workers available to industry/defense
- slower physical expansion

Reward:
- earlier unlocks
- advanced utility/defense options
- access to Varum systems

Failure risk:
- technologically advanced but cash-poor
- vulnerable before new Tech pays back

---

## C. Civic / Population / Happiness

Fantasy:
- attractive settlement
- strong population growth
- resilient civilian society

Typical investment:
- Housing
- Parks
- services
- recreation
- clinic/shelter later

Consumes:
- Money
- Water
- Power
- land
- upkeep

Sacrifice:
- lower immediate economic output
- less military investment
- higher utility demand

Reward:
- larger Population
- larger future Workforce
- recovery/resilience
- Happiness and growth stability

Failure risk:
- many citizens but insufficient jobs/utilities
- expensive services without enough productive base

---

## D. Defense / Military

Fantasy:
- fortified settlement
- safer against increasingly dangerous threats

Typical investment:
- Guard Posts
- Watchtowers
- Radar
- vehicles
- AA
- advanced defenses

Consumes:
- Workforce
- Money
- Power
- Varum
- maintenance/upkeep

Sacrifice:
- slower economy
- slower Tech/Housing development
- idle military investment during peaceful periods

Reward:
- lower expected combat damage
- access to PvE victory rewards
- better protection of high-value infrastructure

Failure risk:
- safe but economically stagnant
- excessive defense tax

---

## E. Expansion / Exploitation

This should exist later, after the basic settlement loop is proven.

Fantasy:
- acquire territory/resources faster than peaceful development

Possible forms:
- map expansion
- dangerous resource zones
- expeditions
- rare salvage
- later raid/PvP

Consumes:
- military readiness
- logistics
- risk
- repair resources

Reward:
- resources otherwise expensive or slow to obtain

Sacrifice:
- exposure to loss
- readiness pulled away from home defense

This branch is where later PvP can naturally attach.

---

# 5. No omni-build rule

The game must be balanced so that an ordinary settlement cannot efficiently maximize all paths simultaneously.

At least four scarcity layers should enforce this:

## Workforce scarcity

The same citizens cannot simultaneously work:
- Workshop
- School
- Power
- Water
- Varum
- Defense

## Treasury scarcity

The player should not have enough discretionary Money to buy every early strategic option immediately.

## Utility scarcity

Expansion consumes Power/Water.

The player choosing growth/industry should eventually need utility reinvestment.

## Time / construction scarcity

Construction slots and build time create sequencing decisions.

Even if the player has enough Money, they must choose what gets built first.

Later:
- Tech branch choices
- Varum
- military readiness
- territory
may add additional scarcity.

---

# 6. Rule for strong players

A skilled player may eventually become strong across multiple paths.

That is allowed.

But it should happen because the player:
- made efficient decisions
- won difficult PvE encounters
- discovered rare rewards
- successfully expanded
- later stole/captured resources through raid systems
- survived high-risk strategies

Not because the game passively gives enough resources to build everything.

---

# 7. PvE combat currently has a missing reward loop

Current combat has:

```
Threat
→ Defense
→ Combat
→ Damage
→ Repair
```

This is incomplete.

It is mostly a punishment loop.

Required target:

```
Threat
→ Preparation
→ Combat
→ Win / Loss quality
→ Reward + Damage
→ Strategic reinvestment
```

Current documentation already suggests rewards, but the playable/runtime loop does not yet make them meaningful.

Required future reward categories may include:
- Money
- small Tech
- Varum fragment / salvage
- temporary Safety/Happiness
- rare construction/defense materials later
- cosmetic salvage
- special Quest/Event progress

Rule:

**PvE reward must matter, but farming attacks must not replace the normal economy.**

---

# 8. PvE reward design debt

Before implementation, DevSim must answer:

- What does a CLEAN win award?
- What does a COSTLY win award?
- Does BREACH still give partial salvage?
- Should stronger Threat Brackets give better reward?
- How much reward offsets preparation cost?
- How much reward offsets repair cost?
- Can Defense Rush remain economically viable?
- Can repeatedly winning create runaway snowball?

Possible model:

```
Expected PvE value
=
reward
- maintenance cost
- repair cost
- opportunity cost of defensive Workforce
```

Defense should have a strategic payoff without becoming a free Money printer.

---

# 9. Quest system — NOT IMPLEMENTED

Status:

**P0/P1 PRODUCT DEBT — REQUIRED FOR A COMPLETE PLAYER EXPERIENCE**

Current gap:
- no authored Quest chain
- no clear player goals beyond self-directed construction
- no structured introduction to systems
- no narrative/contextual motivation
- no milestone reward pipeline

Quest must not become a mobile-game checklist.

Preferred purpose:

### Early Quest role

Teach the core decision loop:
- establish first strategic branch
- solve first Workforce shortage
- build School OR stronger economy
- prepare for first threat
- recover after first damage

### Mid-game Quest role

Expose:
- Varum
- advanced threat
- specialization
- rare opportunity

### Quest rewards

Can be used to:
- introduce controlled resource injections
- grant rare unlocks
- push the player into different strategic experiments

But Quest must not override economy balance.

---

# 10. Tutorial — NOT IMPLEMENTED

Status:

**P0 ONBOARDING DEBT**

Current game contains multiple hidden concepts:
- Workforce
- priority
- utility reserves
- staffing
- construction slots
- Tech
- threat
- repair

Without Tutorial, players may misread a system bug as a game rule.

Tutorial should be contextual, not a long text wall.

Target:

## Tutorial 1 — Build

Teach:
- place one building
- cost is real
- construction takes time

## Tutorial 2 — Workers

Teach:
- finite Workforce
- why one building can be unstaffed

## Tutorial 3 — Choice

Force a controlled choice:
- Economy OR School
- player cannot efficiently do both immediately

This is the first moment the game's identity becomes clear.

## Tutorial 4 — Threat

Teach:
- warning
- preparation
- defense

## Tutorial 5 — Recovery

Teach:
- damage
- repair
- combat reward

Tutorial should demonstrate the core game instead of explaining every UI control.

---

# 11. Event system — INCOMPLETE

Status:

**P0/P1 GAMEPLAY DEBT**

Current runtime has event records for important world outcomes such as combat resolution.

But there is no complete gameplay Event system that creates strategic situations.

Required Event categories:

## Opportunity

Examples:
- traveling merchant
- abandoned machine
- temporary worker influx
- rare salvage
- scientific anomaly

## Crisis

Examples:
- utility failure
- sickness
- storm
- worker dispute
- damaged road
- Varum instability

## Choice Event

Example:

```
A caravan offers machinery.

A. Buy industrial equipment
   - Money cost
   - Economy bonus

B. Donate supplies
   - Happiness/Safety gain

C. Decline
   - no change
```

Events should force small strategic tradeoffs.

They should use server-authoritative data and seeded outcomes.

---

# 12. Event design rule

Events must not merely be random +/- resource popups.

A good Event should ask:

> Which part of my strategy am I willing to strengthen or sacrifice?

Therefore event outcomes should interact with:
- strategic path
- current shortages
- Tech
- Threat
- Population
- Defense

---

# 13. COMING SOON — Raid / PvP

Status:

**FUTURE PRODUCT DIRECTION — DO NOT IMPLEMENT BEFORE CORE PvE ECONOMY IS PROVEN**

The game should reserve a visible future direction for:

**Raid other settlements / player conflict**

Possible fantasy:

```
I specialized heavily in Military.
I sacrificed Economy/Tech efficiency.
Now I can risk that investment to obtain resources from stronger external targets.
```

This can provide an alternate route to power.

But it must not be available as an early workaround to broken economy balance.

---

# 14. PvP / raid principle

Later raid systems should follow:

**Power requires risk.**

A powerful military settlement may gain resources faster by raiding, but must risk:
- units
- readiness
- repair cost
- retaliation/exposure
- time

Raid must not mean:

> strongest player gets richer forever with no counterweight.

Anti-snowball design will be required before implementation.

---

# 15. Current major gameplay debt ledger

## P0 — Core identity / strategic choice

### GAP-CG-001
No canonical strategic-path system.

Effect:
player can treat all buildings as a checklist.

### GAP-CG-002
No enforced opportunity-cost model proving that one path sacrifices another.

Effect:
risk of omni-build gameplay.

### GAP-CG-003
Workforce priority exists technically but player strategic control is not implemented/proven.

Effect:
game makes important choices invisibly for the player.

### GAP-CG-004
Starting economy currently allows too many early strategic purchases.

Effect:
weak early specialization.

### GAP-CG-005
Power/Water pressure is too weak in current baseline.

Effect:
utility path does not compete strongly enough with other priorities.

---

## P0 — Combat purpose

### GAP-COMBAT-001
PvE combat reward is not implemented as a meaningful economic loop.

### GAP-COMBAT-002
Defense ROI is not proven.

### GAP-COMBAT-003
Combat preparation / reward / repair balance has not been simulated as one loop.

---

## P0 — Player guidance

### GAP-TUTORIAL-001
No Tutorial.

### GAP-QUEST-001
No Quest system.

### GAP-QUEST-002
No early Quest chain teaching strategic specialization.

---

## P0/P1 — Dynamic world

### GAP-EVENT-001
No complete gameplay Event framework.

### GAP-EVENT-002
No strategic choice Events.

### GAP-EVENT-003
Existing world-event records are persistence/history, not a full gameplay Event system.

---

## P1 — Progression identity

### GAP-PROG-001
Tech progression is mostly linear accumulation.

### GAP-PROG-002
No meaningful branch/pivot decision is locked yet.

### GAP-PROG-003
No specialization bonus/cost framework.

---

## P1 — Economy depth

### GAP-ECO-001
Funding-failure behavior is documented but not fully implemented/proven.

### GAP-ECO-002
Money sink/faucet targets are not yet canonical.

### GAP-ECO-003
Varum has limited meaningful current sinks.

### GAP-ECO-004
Repair cost is not yet strong enough to prove Defense ROI.

---

## P2/FUTURE — Multiplayer

### GAP-PVP-001
Raid/PvP is not implemented.

### GAP-PVP-002
No anti-snowball / matchmaking / protection design.

### GAP-PVP-003
No authoritative raid reward/loss contract.

### GAP-PVP-004
No retaliation/protection window model.

Current product label:

**COMING SOON — RAID / PLAYER CONFLICT**

---

# 16. Required order of work

The project should not attempt to implement all missing systems simultaneously.

## Step 1 — LOCK CORE GAMEPLAY

First and highest priority.

Define:
- strategic paths
- what each path is good at
- what each path sacrifices
- which scarce resources enforce that sacrifice
- how player changes priority
- when pivoting is possible
- how strong players eventually diversify

Deliverable:

**Core Gameplay Constitution v1**

No balancing or Quest design should precede this.

---

## Step 2 — DevSim strategic-path model

Extend DevSim to simulate:
- Economy focus
- Tech focus
- Civic focus
- Defense focus
- mixed strategy
- greedy omni-build attempt

Required output:
- opportunity cost
- time to milestones
- resource deficits
- branch advantage
- branch sacrifice
- snowball risk

---

## Step 3 — Economy v0.3 candidate data

Only after Step 1–2.

Tune:
- starting Money
- Workforce priorities
- Power
- Water
- upkeep
- build costs
- construction time
- Tech rate

Goal:
player cannot efficiently maximize every path.

---

## Step 4 — PvE reward contract

Define reward by:
- Threat Bracket
- outcome quality
- damage taken
- optional objectives

Then simulate:
- Defense investment ROI
- repair burden
- farming exploit risk

---

## Step 5 — Tutorial vertical slice

Teach the strategic-choice core.

Do not teach unfinished systems.

---

## Step 6 — Quest foundation

Implement:
- Quest state
- objectives
- server-authoritative reward
- early Quest chain

---

## Step 7 — Event foundation

Implement:
- seeded Event generator
- Event choice
- authoritative consequence
- Event history

---

## Step 8 — Progression branches

Once economy, Quest and Event loops are measurable:
- deeper Tech choices
- specialization
- advanced Varum
- military production

---

## Step 9 — PvP design only

Write design/simulation contracts.

Do not implement networking/raid runtime until PvE core is stable.

---

## Step 10 — COMING SOON presentation

A future-facing UI may advertise:

**COMING SOON — RAID OTHER SETTLEMENTS**

But it must be clearly non-functional.

It must not create fake promises of an implemented multiplayer feature.

---

# 17. Definition of “core gameplay locked”

The core is not locked until a new player can answer:

1. What am I trying to build?
2. What are my main strategic directions?
3. Why can I not maximize all of them immediately?
4. What do I gain by choosing Economy?
5. What do I lose by choosing Economy?
6. What do I gain by choosing Tech?
7. Why should I invest in Defense?
8. What do I receive for winning PvE combat?
9. What happens when I make a bad choice?
10. How can I recover or pivot?

If those answers are unclear, more content should not be added.

---

# 18. Immediate project decision

The **next design task is not another building, enemy, asset, Quest or balance patch**.

The next design task is:

# CORE GAMEPLAY CONSTITUTION v1

It must lock the strategic-path network before the project resumes gameplay feature implementation.

Related authority:
- `docs/03_GAMEPLAY_LOOP.md`
- `docs/04_ECONOMY_RESOURCES.md`
- `docs/80_GAMEPLAY_SYSTEMS_STUDIO_REAUDIT.md`
- `docs/81_DEV_BALANCE_SIMULATION_TOOLING_CONTRACT.md`
- `docs/82_SERVER_AUTHORITATIVE_BALANCE_DATA_CONTRACT.md`
