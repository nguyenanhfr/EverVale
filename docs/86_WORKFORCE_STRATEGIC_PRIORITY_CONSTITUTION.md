# 86 — Workforce & Strategic Priority Constitution

Status: **DESIGN VALIDATED IN DEVSIM — RUNTIME IMPLEMENTATION PENDING**

Date: 2026-09-21

Authority:
- strategic core: `docs/84_CORE_GAMEPLAY_CONSTITUTION_V1.md`
- measured evidence: `docs/85_STRATEGIC_PATH_BASELINE_REPORT_V1.md`
- economy baseline: `docs/04_ECONOMY_RESOURCES.md`

Purpose:

Turn Workforce from a hidden allocator into a visible strategic system controlled by the player without requiring manual citizen micromanagement.

This document does not authorize runtime implementation yet.

---

# 1. Leadership decision

Workforce is the primary early-game strategic scarcity.

The player must control **category priorities**.

The player does **not** assign individual citizens to individual buildings.

The game must therefore support:

```
Player chooses priorities
→ server allocates workers
→ UI explains consequences
```

The current hidden/fixed priority model is insufficient.

---

# 2. Why this is P0

Measured Strategic Path evidence:

- Industrial School zero staff ~4.52h
- Balanced Hybrid School zero staff ~5.85h
- Omni Build School zero staff ~6.68h
- Strong Multipath School zero staff ~10.35h

This proves Workforce creates meaningful tradeoffs.

But if the player cannot intentionally control those tradeoffs, the system feels arbitrary.

Therefore:

> Workforce scarcity is good. Hidden Workforce decisions are bad.

---

# 3. Strategic categories

Initial player-facing categories:

1. **UTILITIES**
2. **INDUSTRY**
3. **EDUCATION**
4. **CIVIC**
5. **DEFENSE**
6. **VARUM / ADVANCED** later

Exact internal building mapping is authoritative data.

Examples:

## UTILITIES
- Power Plant
- Water Plant
- critical future infrastructure

## INDUSTRY
- Workshop
- Market
- Restaurant
- production buildings

## EDUCATION
- School
- Academy/Research later

## CIVIC
- clinic/service buildings later
- selected public services

## DEFENSE
- Guard Post
- Watchtower
- staffed military infrastructure

## VARUM / ADVANCED
- Varum Mine
- specialist advanced systems

Housing does not request jobs and therefore is not a staffing category.

---

# 4. Player-facing priority levels

Recommended semantic levels:

- CRITICAL
- HIGH
- NORMAL
- LOW
- PAUSED

The player never sends a raw priority number.

Client intent:

```
SET_WORKFORCE_PRIORITY {
  category: EDUCATION
  level: HIGH
}
```

Server maps that intent to bounded authoritative weights.

---

# 5. Meaning of levels

## CRITICAL

Use only for systems that must receive workers before non-critical categories.

Player use may be restricted.

Examples:
- utilities during shortage
- emergency Defense during active threat

A player should not freely mark every category CRITICAL.

## HIGH

Primary strategic focus.

The player should normally have limited HIGH slots.

## NORMAL

Default balanced operation.

## LOW

Accept reduced output before stronger priorities lose staffing.

## PAUSED

Player explicitly allows zero staffing.

The UI must clearly show consequences.

---

# 6. Limited focus slots

To prevent the player from setting everything HIGH:

Recommended design direction:

- 1 primary HIGH focus early
- optional second HIGH/support focus later
- CRITICAL reserved for safety/emergency rules

The exact count is balance data.

The principle is canonical:

> Priority itself is a scarce strategic choice.

This mirrors the Charter model.

---

# 7. Critical utility floor

Utilities need safety protection so an inexperienced player cannot accidentally destroy the settlement instantly through priority settings.

Server may enforce minimum staffing floors for:
- Power
- Water

Example concept:

```
Power Plant:
minimum critical staffing = 1 worker while reserve < threshold
```

The floor must be data-driven.

It should not always guarantee full utility production.

It only prevents catastrophic hidden behavior.

---

# 8. Utility emergency override

If Power/Water reserves enter an emergency state, server may temporarily elevate utility staffing.

Possible states:

- SAFE
- LOW
- CRITICAL
- EMPTY

Example:

```
Water reserve CRITICAL
→ UTILITIES receives temporary emergency weight
```

UI must say:

```
Water Emergency
2 workers temporarily reassigned to Water Plant
```

Never silently override player strategy.

---

# 9. Defense emergency override

During active threat:

Defense may receive an emergency boost.

But this must create visible economic cost.

Example:

```
ACTIVE THREAT

Defense emergency staffing:
+3 Guards

Displaced:
-1 Workshop worker
-1 School worker
-1 Restaurant worker
```

After combat:
- workers return according to normal priorities
- optional short recovery/retraining delay may apply later

This creates a meaningful wartime economy.

---

# 10. Emergency override limits

Emergency rules must not erase strategic differences.

An Industrial settlement should not instantly become equivalent to a Fortress settlement when attacked.

Emergency staffing can activate existing Defense capacity.

It cannot create:
- missing Guard Posts
- missing vehicles
- missing Tech
- missing readiness

Therefore preparation still matters.

---

# 11. Allocation order

Target conceptual allocation:

## Step 1 — Required minimum critical staffing

Protect:
- essential utilities
- mandatory emergency roles

## Step 2 — Player category priority

Compare:
- HIGH
- NORMAL
- LOW
- PAUSED

## Step 3 — Building-local priority

Resolve competition within a category.

## Step 4 — accessibility/operation validity

Building must be:
- connected
- complete
- not disabled
- sufficiently supplied where applicable

## Step 5 — deterministic tie-break

Use a stable deterministic rule.

No random worker shuffling every tick.

---

# 12. Deterministic tie-break

When two buildings have equal effective priority, use deterministic criteria.

Candidate order:

1. criticality
2. category priority
3. building priority
4. current partial staffing continuity
5. older building / stable entity ID

The exact order must be locked before runtime implementation.

Goal:

Workers should not oscillate unpredictably.

---

# 13. Partial staffing rule

Buildings may operate proportionally when partially staffed unless their definition says otherwise.

Example:

```
Workshop
workers: 1 / 4
staffing ratio: 25%
Money output: ~25%
```

Some future buildings may require minimum staffing.

That requirement must be data-driven.

---

# 14. Minimum operating staffing

Optional building definition:

```
minimum_workers_to_operate
```

Example use:
- advanced reactor
- aircraft facility
- clinic

If below minimum:

```
status = UNDERSTAFFED_OFFLINE
```

Do not hardcode per building in client.

---

# 15. Worker displacement

Changing priority can move workers.

The player must see what happened.

Example:

```
Education → HIGH

+2 School workers

Displaced:
Workshop A: 4 → 3
Restaurant: 2 → 1

Projected:
Money -14/cycle
Tech +10/cycle
```

This is one of the core strategic feedback moments.

---

# 16. Preview before confirmation

Before changing a strategic priority, server should eventually provide a preview.

Example:

```
Raise DEFENSE to HIGH?

Expected current allocation:
Defense: +3 workers
Industry: -2 workers
Education: -1 worker

Money:
-18 / cycle

Tech:
-5 / cycle

Defense:
+3 Guards active
```

Preview is advisory.

Server remains authoritative at execution time.

---

# 17. Category priority and Charter

Charter and Workforce priority are related but not identical.

## Charter

Longer-term strategic identity.

May affect:
- policy slots
- bonuses
- unlocks
- transition rules

## Workforce priority

Immediate operational decision.

Example:

Industrial Charter player may temporarily set:

```
DEFENSE = HIGH
```

during rising threat.

That does not instantly change Charter.

This distinction enables tactical adaptation without free strategic pivoting.

---

# 18. Default priority profile

New players need a safe default.

The default should be approximately balanced:

- UTILITIES: safety-protected NORMAL
- INDUSTRY: NORMAL
- EDUCATION: NORMAL
- CIVIC: NORMAL
- DEFENSE: NORMAL/LOW depending on threat
- ADVANCED: NORMAL

Current fixed numeric defaults are not canonical.

DevSim must determine a balanced profile that does not starve School for hours.

---

# 19. Primary focus presets

For accessibility, Charter may offer a preset.

Example:

## INDUSTRIAL preset

- Industry HIGH
- Education LOW/NORMAL
- Defense LOW/NORMAL
- Utilities protected

## SCHOLAR preset

- Education HIGH
- Industry NORMAL/LOW

## CIVIC preset

- Civic HIGH
- Industry NORMAL

## FORTRESS preset

- Defense HIGH
- Industry LOW/NORMAL

The player can still customize within allowed bounds.

---

# 20. Presets are not hidden bonuses

A priority preset only changes allocation.

If Charter later has bonuses, those are separate and explicit.

This separation is important for DevSim.

We can first prove the game using allocation-only strategic differences before adding Charter multipliers.

---

# 21. Priority change frequency

The player should not micro-spam priority every second to exploit simulation.

Candidate design:

- priority change allowed freely outside combat but effective at next allocation boundary
- emergency changes during combat may have short lock/cooldown
- Charter pivot has much longer strategic transition

Exact timing is data-driven.

Goal:
avoid turning EverVale into high-frequency worker micro.

---

# 22. Retraining / reassignment delay

Initial MVP may reassign workers immediately if simplicity is needed.

Longer-term candidate:

```
reassignment_delay_seconds
```

This could make pivots more meaningful.

But do not add this complexity unless DevSim proves instant reassignment is exploitable or strategically weightless.

---

# 23. Priority conflict example

Population 16:

`Workforce = 12`

Buildings:
- Power Plant 2
- Water Plant 2
- Workshop A 4
- Workshop B 4
- School 2
- Guard Post 2

Demand:

`16 workers`

Available:

`12`

Four workers must be denied.

## Industry HIGH

Possible result:

- Power 2
- Water 2
- Workshop A 4
- Workshop B 4
- School 0
- Guard 0

Consequence:
- Money high
- Tech zero
- Defense weak

## Education HIGH

Possible result:

- Power 2
- Water 2
- School 2
- Workshops share 6
- Guard 0

Consequence:
- Tech active
- Money lower

## Defense HIGH

Possible result:

- Power 2
- Water 2
- Guard 2
- Industry receives remaining 6
- School 0 or partial

This is the core game.

---

# 24. No free priority rule

Changing priority must not create workers.

It only redistributes scarcity.

If all categories are understaffed, priority cannot solve the shortage.

Player must eventually:
- grow Population
- reduce demand
- pause buildings
- improve efficiency
- add later automation/technology

---

# 25. Efficiency progression

Later Tech may reduce workers required by some buildings.

Example concept:

```
Industrial Automation I

Workshop workers:
4 → 3
```

This creates earned multi-path capacity.

It is a strong candidate mechanism for late diversification.

But it must be balanced as Tech investment, not free global inflation.

---

# 26. Workforce and Civic path

Civic's long-term strategic payoff is larger Workforce.

This relationship should remain:

```
Civic investment
→ Population
→ Workforce
→ ability to support secondary path
```

This is how Civic can become a diversification enabler later.

---

# 27. Workforce and Industry path

Industry consumes workers aggressively.

Industrial advantage should be:

```
high value per worker / strong Money throughput
```

not:

```
infinite workers
```

Industry therefore faces a natural labor ceiling.

---

# 28. Workforce and Scholar path

Scholar's sacrifice is explicit:

Workers in School do not generate immediate Money.

The game should show:

```
2 teachers/research workers
→ +Tech
→ -potential industrial income
```

This is intentional opportunity cost.

---

# 29. Workforce and Fortress path

Defense staffing should have zero or low peacetime economic output.

Its value comes from:
- damage avoided
- readiness
- PvE reward access

This makes the missing PvE reward loop even more important.

---

# 30. Funding priority is separate

Do not merge staffing priority and Money funding priority into one hidden number.

A building can be:

```
fully staffed
but unfunded
```

or:

```
funded
but understaffed
```

Future systems need separate concepts:

- workforce_priority
- funding_priority

This is already identified in the economy audit.

---

# 31. Required authoritative data shape

Conceptual data:

```
workforce_policy:
  levels:
    critical: ...
    high: ...
    normal: ...
    low: ...
    paused: ...

  categories:
    utilities:
      default_level: normal
      emergency_floor: ...
    industry:
      default_level: normal
    education:
      default_level: normal
    civic:
      default_level: normal
    defense:
      default_level: normal

  focus_slots:
    early_high_slots: ...
    later_high_slots: ...

  emergency:
    water_threshold: ...
    power_threshold: ...
    threat_override: ...
```

Exact numbers are not locked here.

---

# 32. Server-authoritative command model

Future command:

```
SET_WORKFORCE_PRIORITY {
  category
  level
}
```

Server validates:
- allowed category
- allowed semantic level
- focus-slot limits
- current world revision
- transition/cooldown rules

Client does not send:
- numeric weight
- worker IDs
- output multipliers

---

# 33. Explainability contract

Every operational building should expose server-derived explanation:

```
Workshop

Workers:
3 / 4

Output:
75%

Why not full?
Education priority is HIGH.
1 worker reassigned to School.

To improve:
- lower Education priority
- increase Population
- pause another workplace
```

The explanation is part of gameplay, not optional polish.

---

# 34. Settlement overview

The player needs a Workforce overview:

```
Workforce 15 / 15

UTILITIES
4 workers
status: protected

INDUSTRY
7 workers
priority: HIGH
unmet demand: 3

EDUCATION
2 workers
priority: NORMAL
unmet demand: 2

DEFENSE
2 workers
priority: LOW
unmet demand: 2
```

This turns hidden simulation into a strategy interface.

---

# 35. DevSim required scenarios

Before implementation, DevSim must compare:

## W0 — BALANCED DEFAULT

Goal:
no category starves for hours under a reasonable starter plan.

## W1 — INDUSTRY HIGH

Expected:
Money improves;
Tech/Defense slows.

## W2 — EDUCATION HIGH

Expected:
Tech improves;
Money slows.

## W3 — DEFENSE HIGH

Expected:
PvE damage improves;
Money/Tech slows.

## W4 — UTILITY EMERGENCY

Inject low reserve.

Expected:
utility workers protected/reassigned;
recovery occurs;
economic output temporarily drops.

## W5 — PAUSED INDUSTRY

Expected:
workers return to other categories;
Money drops visibly.

## W6 — RAPID SWITCH

Attempt repeated priority changes.

Expected:
no resource duplication;
deterministic allocation;
no exploit.

## W7 — OMNI HIGH ATTEMPT

Attempt to mark every category HIGH.

Expected:
server rejects or normalizes according to focus-slot rules.

---

# 36. DevSim metrics

Required:

- workers by category
- unmet worker demand by category
- staffing ratio
- Money/hour
- Tech/hour
- utility satisfaction
- Defense staffing
- time each category remains at zero
- number of worker reassignments
- oscillation count
- emergency override duration
- recovery time after override
- path signature metrics

---

# 37. Acceptance gates

## WG1 — Player agency

Changing a category priority materially changes staffing.

## WG2 — Opportunity cost

Increasing one priority reduces at least one competing output under scarcity.

## WG3 — Utility safety

Reasonable priority choices do not accidentally destroy essential utility without visible warning.

## WG4 — No hidden starvation

Balanced starter policy does not leave School/Defense silently at zero for multi-hour periods without explanation.

## WG5 — Determinism

Same world + same policy + same seed gives same allocation.

## WG6 — No priority inflation

Setting more categories HIGH cannot create more total Workforce.

## WG7 — Emergency visibility

Any server override is observable.

## WG8 — Recovery

After emergency ends, normal policy is restored.

## WG9 — No micro exploit

Rapid switching cannot duplicate output/resource rewards.

## WG10 — Server authority

F12/client numeric edits cannot change allocator weights.

---

# 38. Current evidence applied to this Constitution

The Strategic Path Pack already proves:

- priority can create path identity
- Industrial beats others in Money
- Scholar beats others in Tech
- Fortress reduces combat damage
- Omni Build is penalized

Therefore the core mechanic is worth promoting to player agency.

But current defaults are not acceptable as final design because:

- Balanced Hybrid School zero staff ~5.85h
- Strong Multipath School zero staff ~10.35h

The next balance candidate must address this through explicit policy design, not by simply giving every building more workers.

---

# 39. What not to do

Do not solve Workforce tension by:

- doubling Workforce globally
- removing worker requirements
- making School free workers
- giving hidden bonus workers by client mode
- hardcoding special cases in UI
- allowing every category HIGH

Those changes would erase the strategic core.

---

# 40. Immediate next step

After this Constitution:

1. extend DevSim with explicit category-priority policy model
2. run W0–W7
3. find safe default priority profile
4. determine HIGH-slot count
5. determine utility emergency floor behavior
6. only then implement server command/runtime allocator changes

After Workforce policy is measurable:

**next design item = PvE Reward Contract.**


---

# 41. Validated candidate result

Measured evidence is now merged on `main` in `docs/90_GAMEPLAY_SYSTEM_VALIDATION_V1.md` (DevSim validation merge `effc6635`).

Final candidate semantics validated over 8 simulated hours:

- Balanced: Money **1634.6**, Tech **100.25**, School zero-staff **0h**
- Industry HIGH: Money **2196.7**, Tech **0**
- Education HIGH: Money **1375.3**, Tech **200.5**
- Defense HIGH: Money **784.0**, readiness-sensitive combat condition loss **0** versus Balanced **18**
- Utility emergency: staffing **2 → 4**, recovery **10 min**
- PAUSED Industry: **0 workers**
- Rapid switching: **12/12 deterministic**
- Omni-HIGH: rejected by HIGH-slot validation

Validated allocator direction:

```
CRITICAL / HIGH / NORMAL
→ eligible for minimum category operating floor

LOW
→ no guaranteed floor

PAUSED
→ excluded from allocation

then:
remaining Workforce
→ semantic priority
→ deterministic building-local assignment
```

Balanced default Defense is **LOW**, not NORMAL.

Utilities use a source-level minimum floor while floor-eligible so Power and Water cannot accidentally collapse due only to building ordering.

All W0–W7 candidate gates pass.

These are DevSim-proven semantics, not yet production runtime behavior.
