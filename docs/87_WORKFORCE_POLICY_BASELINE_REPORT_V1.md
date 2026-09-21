# 87 — Workforce Policy Baseline Report v1

Status: **PARTIAL PASS — RUNTIME CAPABILITY GAPS CONFIRMED**

Date: 2026-09-21

Measured branch:
`chatgpt/devsim-v2-authoritative`

Measured source revision:
`7f69b695ed1cef9ac92b9681708204c1fef8d2ae`

Authority:
- `docs/86_WORKFORCE_STRATEGIC_PRIORITY_CONSTITUTION.md`
- policy candidate: `data/devsim/v0.1/workforce_policy.yaml`
- runner: `packages/devsim/src/workforce-policy.ts`

Command:

```
pnpm devsim workforce --hours 8 --seed 1
```

This report measures current runtime behavior under data-driven policy overlays.

It does not change live gameplay balance.

---

# 1. Executive result

Workforce policy gates:

| Gate | Result |
|---|---|
| WG0 Balanced Default | **FAIL** |
| WG1 Industry Opportunity Cost | **FAIL** |
| WG2 Education Opportunity Cost | **PASS** |
| WG3 Defense Opportunity Cost | **FAIL** |
| WG4 Utility Emergency | **PASS** |
| WG5 PAUSED Means Zero | **FAIL** |
| WG6 Rapid Switch Deterministic | **PASS** |
| WG7 Omni-HIGH Rejected | **PASS** |

Overall:

**4 PASS / 4 FAIL**

This is not a failed tooling exercise.

It successfully proves where the current allocator/runtime semantics are insufficient for the intended game.

---

# 2. W0 — Balanced Default

Result:

**FAIL**

At 8h:

- Money: **1894.1**
- Tech: **0**
- Population: 20
- School zero staff: **6.68h**
- Utilities: 4 workers
- Industry: 11 workers
- Education: **0**
- Defense: **0**

The candidate uses semantic NORMAL for:
- Utilities
- Industry
- Education
- Civic
- Defense

But the current runtime allocator flattens all buildings into one sorted priority list.

Small building-local priority differences therefore cause:

```
Utilities
→ Industry
→ Education
→ Defense
```

and Industry consumes all remaining Workforce.

### Studio conclusion

A real Balanced policy cannot be implemented reliably by merely converting category levels into per-building numeric priorities.

The allocator needs explicit category-aware semantics.

---

# 3. W1 — Industry HIGH

Result:

**FAIL as opportunity-cost gate**

At 8h:

Balanced:
- Money: 1894.1
- Tech: 0

Industry HIGH:
- Money: **2244.1**
- Tech: 0

Industry HIGH increases Money by about:

**+350**

but cannot reduce Tech below Balanced because Balanced already produces zero Tech.

### Interpretation

Industry specialization works economically.

The gate fails because the baseline is already effectively Industry-biased.

The problem is not that Industry HIGH lacks identity.

The problem is that Balanced has no functioning Education baseline.

---

# 4. W2 — Education HIGH

Result:

**PASS**

At 8h:

- Money: **1375.3**
- Tech: **200.5**
- T1: **9540s ≈ 159 min**
- School zero staff: **0h**
- Industry workers: 9
- Education workers: 2
- Industry unmet demand: 2

Compared with Balanced:

- Money falls from 1894.1 → 1375.3
- Tech rises from 0 → 200.5

This is exactly the desired opportunity-cost shape:

```
Education ↑
→ Tech ↑
→ Industry staffing ↓
→ Money ↓
```

### Conclusion

The core strategic idea is valid.

Player-controlled category priority can create meaningful decisions.

---

# 5. W3 — Defense HIGH

Result:

**FAIL**

At 8h:

Balanced stress case:
- combat condition loss: **35**

Defense HIGH:
- combat condition loss: **35**

But Defense HIGH pays a major economic cost:

- Balanced Money: 1892.5
- Defense HIGH Money: **784.0**

Final Defense staffing:

- Balanced: 0 outside combat
- Defense HIGH: 2

Yet the combat result does not improve.

### Critical gameplay finding

Current combat effectiveness is not meaningfully connected to normal Defense Workforce priority.

The existing combat system can create defenders from defensive structures without enough connection to peacetime staffing/readiness.

Therefore:

> Raising Defense priority can cost the player Money without buying a better combat result.

This must not be implemented as player-facing gameplay until the readiness/combat link is explicit.

### Required design

Defense staffing must affect at least one authoritative combat variable, for example:

- defender availability
- readiness
- deployment speed
- starting HP
- reinforcement rate
- accuracy/DPS efficiency
- repair/rearm availability

Exact mechanic remains to be designed.

---

# 6. W4 — Utility Emergency

Result:

**PASS directionally**

Test:

- Industry-heavy allocation
- inject low Power/Water reserve
- elevate Utilities to CRITICAL
- later restore Industry profile

Measured:

- utility workers before emergency: **2**
- during emergency: **4**
- recovery to emergency threshold: **10 minutes**

This proves priority reassignment can protect utilities.

However final Water later returns to:

**0**

because the test switches back to an Industry-heavy policy and only performs one scripted emergency transition.

### Conclusion

Emergency utility override is viable.

But production runtime needs an actual state-driven rule:

```
reserve below threshold
→ emergency override ON

reserve recovers above release threshold
→ emergency override OFF

reserve falls again
→ override may reactivate
```

A one-shot scripted transition is insufficient.

Use hysteresis to avoid worker oscillation.

---

# 7. W5 — PAUSED Industry

Result:

**FAIL**

Candidate attempted:

```
INDUSTRY = PAUSED
```

Final Industry workers:

**7**

The DevSim candidate translated PAUSED into an extremely low numeric priority.

That does not work.

When higher-priority categories are fully staffed and Workforce remains, the current allocator eventually staffs the “paused” building anyway.

### Conclusion

PAUSED requires a real allocator capability.

It cannot be represented as:

```
priority = very low number
```

Required semantic behavior:

```
if category == PAUSED:
    exclude its worker demand from allocation
```

This should eventually be implemented server-side.

---

# 8. W6 — Rapid Switch

Result:

**PASS**

- requested transitions: 12
- applied transitions: 12
- deterministic replay: **true**

This shows priority transitions can remain deterministic.

A future authoritative implementation should preserve this property.

### Still required

Before production runtime:

- revision/CAS protection
- server command validation
- cooldown/reassignment rules if adopted
- no duplicated economic output at transition boundaries

---

# 9. W7 — Omni-HIGH

Result:

**PASS**

Candidate attempted:

```
Utilities HIGH
Industry HIGH
Education HIGH
Civic HIGH
Defense HIGH
Advanced HIGH
```

Server-side DevSim policy validation rejected it:

```
WORKFORCE_HIGH_SLOT_LIMIT:6>1
```

This supports the Constitution:

> Priority itself is a strategic scarce choice.

Current candidate:

**1 HIGH slot in early game**

This remains a candidate value, not final balance.

---

# 10. Most important architectural conclusion

The current runtime allocator is:

```
all buildings
→ numeric priority
→ sort
→ fill workers top-to-bottom
```

That was sufficient for M1 automation.

It is not sufficient for the intended strategic game.

The intended system is conceptually:

```
authoritative category policy
→ critical floors / emergency overrides
→ category allocation
→ building allocation within category
→ deterministic staffing
```

This is a design-level change.

Do not attempt to solve it only by tuning existing priority numbers.

---

# 11. Required allocator behavior before implementation

A future authoritative allocator must support:

## A. Explicit category policy

- UTILITIES
- INDUSTRY
- EDUCATION
- CIVIC
- DEFENSE
- ADVANCED

## B. Semantic levels

- CRITICAL
- HIGH
- NORMAL
- LOW
- PAUSED

## C. Real PAUSED exclusion

PAUSED demand is not staffed.

## D. Limited HIGH slots

Current candidate:
- early: 1
- later: 2

Exact numbers require later tuning.

## E. Utility emergency

State-driven override with hysteresis.

## F. Combat emergency

Must not erase Fortress specialization.

## G. Category-aware Balanced behavior

NORMAL categories should not accidentally produce six-hour starvation due only to per-building ordering.

## H. Explainability

Server must expose:
- assigned workers
- unmet demand
- displaced categories
- limiting reason

---

# 12. Balanced allocator design gap

WG0 proves a crucial point.

If every category is NORMAL, the game needs an explicit answer to:

> Who gets the last worker?

Possible candidate policies for the next DevSim phase:

### Option A — Weighted fair share

Allocate minimum proportional staffing across NORMAL categories before filling one category completely.

### Option B — Category round-robin

Allocate one worker at a time across equal-priority categories.

### Option C — Minimum operating floors

Give each active NORMAL category a minimum operating floor before remaining workers are distributed by priority.

### Option D — Player must choose immediately

Do not promise a Balanced policy.

Force the first strategic priority choice as soon as scarcity appears.

The Constitution currently favors keeping a safe default, so A/C are the stronger candidates.

This must be simulated before runtime implementation.

---

# 13. Defense readiness design gap

WG3 is now a P0 combat-system dependency.

Required future relationship:

```
Defense Workforce
→ Defense Readiness
→ actual combat capability
```

Without that relationship:

```
Defense priority
→ lower economy
→ same combat result
```

which is invalid gameplay.

This dependency must be solved before:
- player-facing Defense priority
- PvE reward tuning
- Fortress Charter implementation

---

# 14. Utility emergency candidate

The emergency experiment supports:

- reserve-triggered temporary priority override
- visible worker displacement
- automatic restoration

Recommended next candidate uses hysteresis:

Example design only:

```
activate below X%
release above Y%

Y > X
```

The exact X/Y values belong in server-authoritative balance data and require sensitivity simulation.

---

# 15. Priority candidate verdict

The current YAML policy candidate is useful for testing but is **not ready to become runtime balance**.

Keep:
- semantic levels
- category model
- one-HIGH-slot concept
- server validation
- emergency concept

Reject as final:
- mapping semantic categories to flat building priorities as the full allocator solution
- PAUSED as a low numeric priority
- current Balanced profile behavior

---

# 16. Next design tasks

Before runtime allocator implementation:

1. DevSim allocator-candidate comparison:
   - weighted fair share
   - minimum floor + priority
2. choose Balanced semantics
3. define Defense Readiness link to combat
4. run W0–W7 again
5. require WG0/WG1/WG2/WG3/WG4/WG5/WG6/WG7 to pass meaningfully

Only after that should runtime commands/state be designed.

---

# 17. Relationship to PvE Reward Contract

PvE Reward design is still required.

But WG3 shows a prerequisite:

**Defense staffing must first affect combat.**

Otherwise Defense ROI cannot be simulated honestly.

Therefore the corrected order is:

```
Workforce allocator candidate
→ Defense Readiness contract
→ rerun W0–W7
→ PvE Reward contract
→ Defense ROI simulation
```

This replaces the earlier assumption that PvE rewards could be designed immediately after the first Workforce priority pass.

---

# 18. CI status

At measured head:

PASS:
- Preflight
- typecheck
- unit tests
- DevSim smoke
- economy baseline
- strategic path report
- Workforce W0–W7 execution
- Civic long-horizon
- sensitivity sweeps
- build
- PostgreSQL integration

Full Engineering workflow remains blocked by the independent visual stress test:

```
Expected frame delta: > 30
Received: 29
```

No visual code or threshold was modified.
