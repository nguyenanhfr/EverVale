# 84 — Core Gameplay Constitution v1

Status: **LEADERSHIP DESIGN CONSTITUTION — LOCK BEFORE BALANCE v0.3**

Date: 2026-09-21

Authority:
- extends `docs/83_CORE_GAMEPLAY_STRATEGIC_PATHS_AND_DEBT.md`
- constrains future Economy / Progression / Quest / Tutorial / Event design
- does not authorize runtime implementation by itself

---

# 1. Product thesis

EverVale is not a completion-checklist city builder.

The player builds a living settlement and must decide:

> What kind of settlement am I trying to become right now?

The normal player should not efficiently maximize:
- Economy / Industry
- Knowledge / Tech
- Civic / Population
- Defense / Military

at the same time.

A player may eventually become strong across several paths, but only by earning that strength through:
- excellent planning
- long-term surplus
- successful PvE
- rare opportunities
- later external expansion / raid systems

Multi-path strength is an end-state achievement.

It is not the default early/mid-game state.

---

# 2. The core strategic promise

Every major investment should answer two questions:

1. What does this make me better at?
2. What am I delaying or weakening by doing it?

If the second answer is “nothing meaningful”, the investment is not strategically complete.

---

# 3. Universal basics vs specialization

The game must separate:

## Universal survival layer

Every settlement can access enough basics to remain playable and recoverable.

Examples:
- basic Housing
- basic Money source
- basic Power
- basic Water
- basic road access
- basic School
- basic Guard / local defense
- repair
- core civic support

These systems cannot be permanently locked behind specialization.

Reason:

A bad early strategic choice must create difficulty, not an unrecoverable save.

---

## Specialization layer

Advanced efficiency, advanced unlocks, stronger bonuses and path-defining capabilities require commitment.

Examples:
- high-throughput Industry
- accelerated Research
- advanced Population/Civic growth
- layered Military/Defense
- advanced Varum use
- later expedition/raid capability

This is where meaningful exclusivity begins.

---

# 4. Explicit player choice

Strategic direction must be visible and chosen by the player.

Do not infer the player's identity only from hidden building counts.

Target concept:

## Settlement Charter

After the bootstrap/tutorial phase, the player chooses a primary Charter.

Example Charters:

- INDUSTRIAL
- SCHOLAR
- CIVIC
- FORTRESS

The Charter is not a permanent character class.

It is the settlement's current strategic commitment.

The player can later pivot.

---

# 5. Charter rule

At the normal early/mid-game state:

- 1 Primary Charter
- optional limited support policy
- universal basic buildings remain available
- advanced path bonuses/capstones follow the Charter

The player is therefore not prevented from building a School while Industrial.

But the Industrial town should not be equally good at:
- Industry
- Research
- Growth
- Defense

simultaneously.

---

# 6. How specialization is enforced

Do not rely on one artificial lock.

Use several interacting opportunity costs.

## 6.1 Workforce

The strongest early scarcity.

Industry workers cannot simultaneously be:
- researchers
- utility operators
- guards
- Varum workers

This is already partially present in current gameplay.

It must become player-visible and player-controllable.

---

## 6.2 Treasury

Early discretionary Money should support a strategic sequence, not every branch at once.

The player should often face choices such as:

> Workshop now or School now?

> Housing expansion or Guard Post?

> Repair immediately or save for a strategic building?

---

## 6.3 Construction capacity

Even a rich player has finite:
- construction slots
- build time
- physical planning space

Money alone must not remove sequencing decisions.

---

## 6.4 Utility headroom

Industry, Research, Civic expansion and Military should create different Power/Water burdens.

Overexpansion should eventually require reinvestment.

---

## 6.5 Tech / policy choice

Advanced progression should contain actual choices.

Not only:

`Tech Points → automatic Tier`

Target:

`Tech milestone → choose one strategic advantage before taking another`

Some advanced bonuses can be mutually exclusive within a phase.

---

## 6.6 Upkeep / readiness

Advanced systems should remain expensive after construction.

A player who builds everything should feel:
- staffing pressure
- funding pressure
- utility pressure
- readiness pressure

not only purchase cost.

---

# 7. Primary strategic paths

---

## 7.1 INDUSTRIAL — Economy / Production

### Player fantasy

“I will become rich and build faster than everyone else.”

### Strengths

- strongest Money generation
- construction throughput
- production efficiency
- logistics later
- faster economic recovery

### Signature investments

- Workshops
- Market / Café / Restaurant
- production districts
- Farms where economically relevant
- construction/logistics infrastructure

### Scarcity consumed

- Workforce: high
- Power: medium/high
- Water: medium
- land: medium/high
- upkeep: medium

### Natural sacrifices

- School staffing
- Defense staffing
- Civic service investment
- Tech pace

### Strategic weakness

A pure Industrial town should be vulnerable to:

- Tech stagnation
- combat losses
- worker shortages
- utility overexpansion

### Success metric

Not simply “highest Money”.

It should convert Money into faster choices while still requiring protection and planning.

---

## 7.2 SCHOLAR — Knowledge / Tech

### Player fantasy

“I will reach advanced technology before larger/richer settlements.”

### Strengths

- Tech production
- earlier advanced unlocks
- research Events/options
- better access to Varum systems
- later efficiency technology

### Signature investments

- School
- Academy / Research later
- advanced utility research
- specialist infrastructure

### Scarcity consumed

- Workforce: medium/high
- Money: medium/high
- Power: medium
- time: high before payoff

### Natural sacrifices

- immediate Money
- physical expansion
- Defense manpower

### Strategic weakness

A Scholar town can become:

- technologically advanced
- financially fragile
- under-defended

before its Tech advantage pays back.

### Success metric

Earlier strategic capabilities, not raw resource abundance.

---

## 7.3 CIVIC — Population / Happiness / Resilience

### Player fantasy

“I will build the best place to live and turn population into long-term power.”

### Strengths

- Population growth
- Happiness
- Workforce growth over time
- recovery/resilience
- civic Event advantages
- lower social disruption later

### Signature investments

- Housing
- Parks
- services
- recreation
- clinic/shelter later
- community infrastructure

### Scarcity consumed

- Money: medium
- Power: medium/high through Population
- Water: high through Population
- land: high
- upkeep: medium/high

### Natural sacrifices

- immediate industrial output
- Tech specialization
- Military investment

### Strategic weakness

Civic overexpansion creates:

- utility demand
- unemployed/underproductive Population
- service burden
- expensive recovery if infrastructure is damaged

### Success metric

Population and stable Workforce become a long-term multiplier.

---

## 7.4 FORTRESS — Defense / Military

### Player fantasy

“I will survive threats others cannot and profit from dangerous encounters.”

### Strengths

- damage prevention
- defense readiness
- stronger PvE performance
- better salvage/reward access
- protection of high-value infrastructure
- later expedition/raid capability

### Signature investments

- Guard Posts
- Watchtowers
- Radar
- vehicles
- AA
- advanced defense
- readiness infrastructure

### Scarcity consumed

- Workforce: medium/high
- Money: high
- Power: high later
- Varum: high later
- maintenance/readiness: high

### Natural sacrifices

- slower peaceful expansion
- lower immediate Money ROI
- slower Tech or Civic growth

### Strategic weakness

A Fortress town can be:

- safe
- expensive
- slow-growing
- inefficient during long peace

### Success metric

Lower expected losses + access to dangerous opportunities.

Defense must not become free passive power.

---

# 8. Opportunity-cost matrix

This matrix describes intended direction, not final numeric balance.

| Investment | Economy | Tech | Civic | Defense |
|---|---:|---:|---:|---:|
| Workshop expansion | ++ | -- | - | - |
| School / Research | - | ++ | + | - |
| Housing / Civic | 0/+ later | + later | ++ | 0/+ later |
| Guard / Military | -- | - | - | ++ |
| Utility expansion | support | support | support | support |
| Varum infrastructure | - early | ++ | - | ++ |
| Roads / logistics | + | 0 | + | + |
| Repair backlog | -- | - | - | readiness recovery |

The important concept:

**Support systems enable paths but do not replace path choice.**

---

# 9. No-omni-build acceptance rule

A normal player attempting to maximize all four paths simultaneously should experience at least two meaningful pressures within the intended early/mid-game horizon.

Examples:
- Workforce saturation
- treasury pressure
- Power/Water shortage
- construction backlog
- slow Tech
- low Defense readiness
- delayed Population growth

If an omni-build strategy reaches all major milestones nearly as fast as specialized strategies, balance fails.

---

# 10. Specialization must actually win somewhere

Each path must have a measurable advantage.

Examples:

Industrial:
- fastest treasury recovery
- fastest construction throughput

Scholar:
- fastest Tech milestones

Civic:
- fastest sustainable Population/Workforce growth

Fortress:
- best PvE outcome / lowest damage / strongest access to dangerous rewards

If one path is best at every metric, it dominates.

If no path wins any metric, specialization is cosmetic.

---

# 11. Mixed strategy

The game should allow reasonable hybrid towns.

Example:

Industrial + Civic

may trade:
- slower Tech
- moderate Defense

for:
- large Workforce
- good Money

Hybrid play is valid.

But hybrid play should not outperform pure specialization at the pure path's signature objective.

Example:

A hybrid Industry/Civic town may be healthier overall.

It should not beat a committed Industrial town at early Money throughput.

---

# 12. Support policy

After the Primary Charter, the player may later gain a limited support policy.

Example:

Primary:
`INDUSTRIAL`

Support:
`CIVIC INVESTMENT`

This gives partial cross-path benefit without removing specialization identity.

The exact number of support slots is balance/design data.

It must not silently expand until every path is effectively active.

---

# 13. Pivoting

Players must be allowed to change direction.

A save should not be ruined by an early Charter.

But pivoting must have opportunity cost.

Target concept:

## Transition period

When changing Primary Charter:

- old advanced bonuses stop or decay
- new advanced bonuses require transition time
- buildings remain owned
- universal systems continue operating
- no forced deletion
- no permanent punishment

Possible transition costs:
- Money
- time
- temporary efficiency loss
- policy cooldown
- retraining Workforce

Exact values are data-driven and require DevSim.

---

# 14. Pivot rule

Changing strategy should be:

- possible
- understandable
- slower than having chosen the new strategy earlier

Otherwise the original choice has no weight.

But pivot cost must not trap the player.

---

# 15. Strong-player multi-path progression

Later-game players may unlock broader capability.

Requirements should come from demonstrated strength, not passive time.

Possible gates:

- high settlement stage
- sustained treasury surplus
- sufficient Population
- high Tech
- successful high-bracket PvE
- rare external reward
- later expansion/raid acquisition

The game may eventually allow:

- 1 Primary + 1 strong Secondary
- later broader diversification

But there should remain maintenance/opportunity cost.

---

# 16. External acquisition

The project may later allow players to obtain foreign-path advantages through dangerous external activity.

Examples:

- PvE boss salvage
- rare anomaly
- expedition
- trade
- raid/PvP later

This creates the fantasy:

> I normally cannot efficiently develop everything, but I can earn or take something outside my main path.

This is the correct place for rare cross-path power.

---

# 17. External power must still cost something

A stolen/rare advanced system should not become free permanent value.

It may still require:
- Workforce
- Power
- upkeep
- repair
- Varum
- specialist support

Therefore raid/reward can break an unlock limitation without eliminating the economy.

---

# 18. PvE role in the Constitution

PvE is not only punishment.

It has three purposes:

## Test

Did the player prepare correctly?

## Cost

Combat creates:
- damage
- readiness loss
- repair burden

## Opportunity

Success can provide:
- salvage
- Money
- Tech
- Varum fragments
- rare cross-path opportunities

This completes the loop:

```
Strategic investment
→ PvE risk
→ performance
→ reward/loss
→ reinvestment
```

---

# 19. Reward quality

PvE reward should depend on more than “wave completed”.

Possible inputs:
- Threat Bracket
- outcome quality
- damage suffered
- objective protection
- optional challenge
- first-clear / Event status

Do not lock exact formulas yet.

DevSim must prove reward economics first.

---

# 20. Defense must not self-fund automatically

A Fortress path should have better access to PvE rewards.

But the expected value must account for:

```
Reward
- Defense upkeep
- military production
- readiness loss
- repair
- opportunity cost
```

If defense produces risk-free net Money superior to Industry, it becomes the dominant economy.

---

# 21. Quest role

Quest must reinforce the strategic constitution.

Quest should not simply say:

> Build every building once.

Early Quest should force or reveal choices.

Example sequence:

1. Establish Housing and basic operation.
2. Introduce Workforce shortage.
3. Present Economy vs School choice.
4. Let player observe consequence.
5. Introduce first Threat.
6. Reward successful preparation.
7. Offer path-specific follow-up.

Quest becomes a guide into specialization.

---

# 22. Tutorial role

Tutorial must teach one central idea:

> You cannot do everything at once.

The first meaningful Tutorial decision should visibly demonstrate opportunity cost.

Example:

Available Workforce is insufficient for both:
- full Workshop output
- full School output

The player chooses priority.

The UI then shows:
- what improved
- what slowed

This is more important than teaching every button.

---

# 23. Event role

Events should test or reinforce strategy.

Example:

Industrial Event:
- machinery deal
- spend Money for production boost

Scholar Event:
- research anomaly
- commit workers/Power for Tech opportunity

Civic Event:
- refugees arrive
- gain Population but stress Housing/Water

Fortress Event:
- hostile contact
- commit readiness for salvage chance

Choice Events may also compensate for path weakness, but at explicit cost.

---

# 24. Later Raid / PvP role

Raid belongs after the PvE economy is stable.

Its strategic purpose:

- external resource acquisition
- rare cross-path access
- high-risk acceleration

It should not be added merely as combat content.

Raid should answer:

> What can a highly specialized settlement do with its strength?

---

# 25. Raid anti-snowball constitution

Future PvP must not create:

`strong player → steals more → becomes permanently unbeatable → steals more`

Required future counterweights may include:
- attack readiness cost
- unit damage/loss
- diminishing reward against weaker targets
- target protection
- retaliation exposure
- recovery windows
- risk-based matchmaking
- capped stealable value

Exact system deferred.

---

# 26. Player-facing strategic information

The player should always understand:

- current Primary Charter
- current support policy
- Workforce allocation
- major bottleneck
- what a new building will consume
- what will likely lose workers/funding
- why Tech/Growth/Defense is slow
- current utility headroom

Do not expose only generic “Efficiency 53%”.

Expose cause.

---

# 27. Build preview requirement

Before confirming a strategic building, UI should eventually show server-derived preview such as:

```
Build Second Workshop

Cost:
Money 250

Requires:
4 workers
4 Power
1 Water

Current spare Workforce:
1

Expected result now:
~25% staffing

Likely impact:
School may lose workers

Construction:
3 cycles
```

Client displays this.

Server derives it.

---

# 28. Charter is not client authority

The browser may display and request:

`SET_CHARTER(INDUSTRIAL)`

Server owns:
- valid Charter
- transition conditions
- transition cost
- bonuses
- cooldown
- unlock effects

F12 cannot grant Charter bonuses.

---

# 29. Data-driven requirement

Future strategic-path numbers must be server-authoritative data.

Examples:
- Charter modifiers
- transition duration
- unlock gates
- policy slots
- support-policy strength
- bonus caps
- maintenance modifiers
- PvE reward multipliers

No strategic balance number should live only in client code.

---

# 30. DevSim vNext scenarios

DevSim must add constitution-specific scenarios.

## C0 — PURE INDUSTRIAL

Goal:
maximize early Money/construction.

Expected:
- wins Money metric
- slower Tech
- weaker Defense

## C1 — PURE SCHOLAR

Expected:
- wins Tech milestone
- lower Money

## C2 — PURE CIVIC

Expected:
- wins sustainable Population/Workforce
- creates utility burden

## C3 — PURE FORTRESS

Expected:
- wins PvE survival/damage metric
- loses peaceful growth/economy pace

## C4 — BALANCED HYBRID

Expected:
- no catastrophic weakness
- does not beat specialists at their signature metric

## C5 — OMNI BUILD

Attempts all paths.

Expected:
- hits at least two meaningful constraints
- slower signature milestones than specialists

## C6 — PIVOT

Example:
Industrial → Fortress after rising Threat.

Expected:
- survives pivot
- pays measurable transition cost
- becomes stronger at defense after delay

## C7 — STRONG MULTIPATH

Late/high-surplus fixture.

Expected:
- can sustain broader capability
- still incurs maintenance/resource cost

---

# 31. Constitution balance gates

Before Economy v0.3 becomes canonical, DevSim must prove:

### G1 — Industrial identity

Industrial reaches its Money/construction objective materially sooner than Scholar/Fortress.

### G2 — Scholar identity

Scholar reaches Tech milestone materially sooner than Industrial/Fortress.

### G3 — Civic identity

Civic reaches sustainable Population/Workforce milestone sooner than non-Civic paths.

### G4 — Fortress identity

Fortress materially lowers expected PvE damage or raises win quality.

### G5 — Sacrifice

Every pure path must lose or delay at least one other meaningful metric.

### G6 — Omni penalty

Omni Build cannot match all specialists.

### G7 — Hybrid validity

Balanced Hybrid remains playable and recoverable.

### G8 — Pivot viability

A pivot is possible without restart.

### G9 — Pivot cost

Pivot does not instantly equal a player who specialized earlier.

### G10 — No dominant path

No path is best or near-best across all major metrics.

---

# 32. Bootstrap phase

Specialization should not begin on the first click.

The player first learns:
- construction
- resources
- Workforce
- utilities

Then the game presents the strategic choice.

Target experience:

```
Bootstrap
→ first Workforce tension
→ first strategic choice
→ choose Charter
→ first Threat
→ observe consequence
```

This gives the player enough context to make an informed choice.

---

# 33. First-session design target

A first meaningful session should contain:

1. Build something.
2. See finite Workforce.
3. Make one genuine tradeoff.
4. See consequence.
5. Prepare for or observe one Threat.
6. Receive or understand one recovery/reward result.

If the player simply builds every available building, the first-session design fails.

---

# 34. What is NOT locked by this Constitution

Not yet canonical:

- exact costs
- exact Charter bonuses
- exact transition time
- exact number of policy slots
- exact Tech branch tree
- exact PvE reward values
- exact utility production
- exact starting Money
- exact PvP rules

Those require DevSim candidate testing.

---

# 35. What IS locked

Canonical direction:

1. Strategic specialization is core gameplay.
2. Universal basics remain available.
3. Advanced strength requires commitment.
4. One path must sacrifice another.
5. Workforce is an early central scarcity.
6. Money alone cannot remove all choices.
7. Utility and construction capacity must matter.
8. PvE must contain both risk and meaningful reward.
9. Pivot is allowed but costly.
10. Strong players may later diversify.
11. Rare PvE/external acquisition may grant cross-path power.
12. Future raid/PvP may accelerate cross-path acquisition.
13. Quest/Tutorial/Event must reinforce strategic choice.
14. All authoritative balance lives server-side/data-driven.
15. DevSim must prove the Constitution before runtime expansion.

---

# 36. Immediate next deliverable

After this Constitution:

## DevSim Strategic Path Pack

Implement only developer simulation support for:
- four pure paths
- balanced hybrid
- omni-build
- pivot

Then produce:

`Strategic Path Baseline Report v1`

Only after that report should the project propose:

`Economy / Progression Balance v0.3 candidate`
