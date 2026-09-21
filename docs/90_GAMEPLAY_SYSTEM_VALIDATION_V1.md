# 90 — Gameplay System Validation v1

Status: **PASS FOR DESIGN / TOOLING — NOT YET A RUNTIME IMPLEMENTATION APPROVAL**

Date: 2026-09-22

Measured implementation revision:

`7fb387ba663cefdf289f9c142bbc0d6752a6d904`

Evidence branch:

`chatgpt/devsim-v2-authoritative`

Related authority:

- `docs/84_CORE_GAMEPLAY_CONSTITUTION_V1.md`
- `docs/86_WORKFORCE_STRATEGIC_PRIORITY_CONSTITUTION.md`
- `docs/88_DEFENSE_READINESS_CONSTITUTION_V1.md`
- `docs/89_PVE_REWARD_CONTRACT_V1.md`

This report closes the planned design/tooling sequence:

```
allocator lab
→ Balanced semantics
→ Defense Readiness
→ W0–W7 rerun
→ PvE reward contract
→ Defense/PvE ROI sweep
```

It does **not** authorize blindly copying candidate values into production.

---

# 1. Executive result

## Workforce / Strategic Priority

**WG0–WG7: 8 / 8 PASS**

## Defense Readiness

**DG1–DG4: 4 / 4 PASS**

## PvE Reward / ROI

**PG1–PG9: 9 / 9 PASS**

The original flat building-priority allocator is rejected for player-facing strategic priority.

The validated DevSim candidate is:

```
semantic category policy
→ minimum operating floors
→ priority allocation of remaining Workforce
→ deterministic building assignment
```

with explicit distinction between NORMAL, LOW and PAUSED.

---

# 2. Selected Workforce semantics

Candidate categories:

- UTILITIES
- INDUSTRY
- EDUCATION
- CIVIC
- DEFENSE
- ADVANCED

Candidate levels:

- CRITICAL
- HIGH
- NORMAL
- LOW
- PAUSED

## Minimum-floor eligibility

CRITICAL / HIGH / NORMAL:
- eligible for category minimum operating floor

LOW:
- receives **no guaranteed floor**
- may receive workers only after stronger policy obligations are satisfied

PAUSED:
- excluded from Workforce allocation

This distinction is necessary.

Earlier experiments proved that treating LOW or PAUSED as merely a small numeric priority does not create real sacrifice.

---

# 3. Balanced semantics

Balanced candidate:

- Utilities: NORMAL
- Industry: NORMAL
- Education: NORMAL
- Civic: NORMAL
- Defense: LOW
- Advanced: LOW

Reason:

Balanced must remain viable.

Balanced must **not** receive free full capability in every branch.

In particular:

> Defense is available as infrastructure, but staffing it is a strategic choice under scarcity.

---

# 4. Utility safety floor

Utilities require a special minimum-operating rule.

Candidate:

- each active utility source may receive one minimum worker while its category is floor-eligible

This prevents a generic category floor from staffing Power but leaving Water at zero solely due to building ordering.

Full staffing remains a policy/economy choice.

Emergency utility policy remains capable of increasing staffing further.

---

# 5. 8h W0–W7 result

Measured with:

```
pnpm test
→ candidate W0–W7
→ 8 hours
→ seed 72
```

## W0 — Balanced

- Money: **1634.6**
- Tech: **100.25**
- T1: **14,340 s = 239 min**
- Population: 20
- School zero-staff: **0h**
- Defense workers at final sample: 0

Result:

**PASS**

Balanced has:
- functioning economy
- functioning Tech
- no School starvation
- no free peacetime Defense staffing

---

# 6. W1 — Industry HIGH

- Money: **2196.7**
- Tech: **0**
- T1: not reached
- School zero-staff: **6.68h**

Relative to Balanced:

- Money: **+562.1**
- Tech: **−100.25**

Result:

**PASS**

This is a real strategic sacrifice.

Industry HIGH is no longer a free upgrade over Balanced.

The player gains peaceful income and abandons Knowledge progress while scarcity persists.

---

# 7. W2 — Education HIGH

- Money: **1375.3**
- Tech: **200.5**
- T1: **9,540 s = 159 min**
- School zero-staff: 0h

Relative to Balanced:

- Money: **−259.3**
- Tech: approximately **2×**
- T1 approximately **80 minutes earlier**

Result:

**PASS**

Education HIGH produces the intended:

```
Tech ↑
Money ↓
```

trade-off.

---

# 8. W3 — Defense HIGH

Readiness-sensitive threat fixture:

Balanced:
- condition loss: **18**
- Money: **1634.6**

Defense HIGH:
- condition loss: **0**
- Money: **784.0**

Result:

**PASS**

Defense now produces actual combat value.

It also imposes a large peaceful opportunity cost.

This is intentional at the candidate stage.

The final long-horizon Fortress economy still needs threat-frequency/bracket tuning.

---

# 9. W4 — Utility emergency

Measured:

- utility workers before emergency: **2**
- emergency staffing: **4**
- recovery to threshold: **10 minutes**
- final Power: 120
- final Water: 116.8

Result:

**PASS**

The concept:

```
low reserves
→ temporary CRITICAL utility policy
→ displaced workers
→ reserve recovery
```

is viable.

Production runtime still needs state-driven hysteresis rather than a scripted DevSim transition.

---

# 10. W5 — PAUSED

Industry PAUSED:

- Industry workers: **0**

Result:

**PASS**

This closes the earlier false-PAUSED behavior where low numeric priority still received leftover workers.

Important:

PAUSED can create a treasury soft lock.

That is acceptable as a strategic action only if:
- UI warns the player
- recovery remains possible
- server exposes why Money is collapsing

---

# 11. W6 — Rapid switching

- transitions requested: 12
- transitions applied: 12
- deterministic replay: true

Result:

**PASS**

Production implementation must preserve:
- deterministic reassignment
- command revision safety
- no duplicate output at transition boundaries

---

# 12. W7 — Omni HIGH

Attempt:

```
Utilities HIGH
Industry HIGH
Education HIGH
Civic HIGH
Defense HIGH
Advanced HIGH
```

Rejected:

```
WORKFORCE_HIGH_SLOT_LIMIT:6>1
```

Result:

**PASS**

Priority itself is a scarce strategic resource.

Candidate early-game budget:

**1 HIGH slot**

This value remains tunable.

---

# 13. Defense Readiness validation

Base M1 threat, same combat engine.

## 0 / 2 Guard Post workers

- supported Guards: 0
- deployed Guards: 0
- outcome: **COSTLY**
- condition loss: **18**
- real repair spend: **54**

## 1 / 2 workers

- supported Guards: 1
- deployed Guards: 1
- outcome: **CLEAN**
- condition loss: 0
- repair spend: 0

## 2 / 2 workers

- supported Guards: 2
- deployed Guards: 2
- outcome: **CLEAN**
- condition loss: 0
- repair spend: 0

All DG gates pass.

Critical conclusion:

> `requires_staffed_source: true` must become authoritative combat behavior.

The current production M1 implementation still spawns Guards from completed Guard Posts without enforcing this staffing relationship.

---

# 14. PvE bracket-0 reward candidate

Candidate data:

`data/devsim/v0.1/pve_reward_candidate.yaml`

Base bracket-0 values:

- Money: **120**
- Tech: **2**
- Varum: **0**

Outcome multipliers:

- CLEAN: **1.00**
- COSTLY: **0.35**
- BREACH: **0.10**

Therefore:

## CLEAN

- Money: **120**
- Tech: **2**
- repair: 0
- net Money after repair: **+120**

## COSTLY

- Money: **42**
- Tech: **0.7**
- repair: 54
- net Money after repair: **−12**

## BREACH

- Money: **12**
- Tech: **0.2**
- repair: 105
- net Money after repair: **−93**

Result:

```
CLEAN > COSTLY > BREACH
```

and failure remains economically painful.

---

# 15. Peaceful economy comparison

8h estimated net production:

| Policy | Net Money production |
|---|---:|
| Industry HIGH | **2432.3** |
| Balanced | **1875.5** |
| Defense HIGH | **1031.6** |

Result:

**Industry > Balanced > Defense**

PvE rewards do not erase the peaceful specialization hierarchy.

---

# 16. Defense opportunity cost

Measured 8h opportunity cost:

Defense HIGH vs Balanced:

**843.9 Money**

Defense HIGH vs Industry HIGH:

**1400.7 Money**

Combat value of prepared CLEAN versus unprepared COSTLY on the bracket-0/base threat:

```
+120 - (-12) = +132
```

Equivalent base-threat wins required to cover opportunity cost:

- vs Balanced: approximately **6.39**
- vs Industry: approximately **10.61**

Interpretation:

Bracket-0 onboarding threats alone should **not** make Fortress economically superior.

This is desirable.

Fortress viability must emerge from:
- meaningful threat frequency
- stronger brackets
- greater avoided damage/downtime
- higher-bracket reward
- later defensive infrastructure

not from overpaying trivial early waves.

---

# 17. Anti-farm result

Equivalent encounter reward multipliers:

```
1.00
0.35
0.10
0.00
```

Four equivalent CLEAN rewards total:

**174 Money**

8h Industry net production:

**2432.3 Money**

Farm-reward fraction:

**7.15%**

Result:

**PASS**

Additionally:

`TRIGGER_TEST_WAVE`

has:

```
test_wave_reward_enabled: false
```

The developer/test wave cannot become a reward faucet.

---

# 18. PvE Tech safety

Two hours of a fully staffed School:

**60 Tech**

Bracket-0 CLEAN reward:

**2 Tech**

Ratio:

**3.33%**

Result:

**PASS**

PvE Tech remains a bonus.

It does not replace Scholar/Education specialization.

---

# 19. Varum safety

Bracket 0:

**0 Varum**

Bracket 1 and 2 data remain candidate/provisional.

Only bracket 2 currently introduces a small candidate Varum reward.

No claim is made that higher-bracket Varum balance is validated yet.

Varum infrastructure remains required.

---

# 20. PvE gate result

- PG1 Defense creates combat value — PASS
- PG2 Industry wins peaceful economy — PASS
- PG3 CLEAN > COSTLY > BREACH — PASS
- PG4 BREACH remains negative — PASS
- PG5 COSTLY is not free profit — PASS
- PG6 CLEAN does not outperform Industry engine — PASS
- PG7 PvE Tech remains a bonus — PASS
- PG8 repeated-equivalent anti-farm — PASS
- PG9 test wave has no reward — PASS

**9 / 9 PASS**

---

# 21. What is now proven

The following concepts have passed measured simulation:

1. strategic specialization can create real opportunity cost
2. Balanced can function without becoming omni-build
3. Industry can sacrifice Tech for Money
4. Education can sacrifice Money for Tech
5. Defense staffing can create actual combat value
6. PAUSED requires true exclusion semantics
7. utility emergency reassignment can recover shortages
8. semantic policy switching is deterministic
9. HIGH slots can prevent omni-priority
10. early PvE reward can reward success without making failure profitable
11. repeated-equivalent rewards can be strongly diminished
12. test waves can be separated from production rewards

---

# 22. What is NOT yet proven

Do not interpret this report as final balance for the entire game.

Still unvalidated:

- bracket 1+ real wave compositions versus rewards
- long-horizon Fortress expected value under natural threat cadence
- vehicles / aircraft / advanced defensive production
- readiness recovery over multiple battles
- downtime cost from disabled production
- funding priority
- higher-tier Varum reward
- Quest reward interaction
- Event reward interaction
- PvP/Raid economy
- multiplayer theft/raid loss/recovery
- comeback mechanics

---

# 23. Runtime debt after validation

The candidate design is ready to be translated into an implementation plan, but production currently still lacks:

- authoritative category-priority state
- SET_WORKFORCE_PRIORITY command
- server HIGH-slot validation
- true PAUSED exclusion
- category-floor allocator
- state-driven Utility emergency hysteresis
- staffed-source Guard deployment
- persistent unit readiness
- PvE reward transaction
- anti-farm encounter state
- combat reward event/ledger
- player-facing explainability

No client-provided numeric weight/reward is allowed.

---

# 24. Authority rule

When runtime implementation begins:

Client may send intent such as:

```
EDUCATION = HIGH
INDUSTRY = LOW
```

Client must not send:

```
educationWeight = 9999
rewardMoney = 999999
guardCapacity = 20
```

Server resolves:
- category semantics
- slot validity
- actual worker assignment
- emergency override
- readiness
- combat result
- reward

All final tuning values must remain server-authoritative/versioned.

---

# 25. CI status

Measured code/tool gates passed:

- Preflight
- typecheck
- unit tests
- DevSim smoke
- 8h baseline
- strategic paths
- legacy Workforce report
- candidate 8h W0–W7
- Defense Readiness lab
- PvE reward sweep
- sensitivity reports
- build

Full Engineering workflow remains independently red at the visual stress assertion:

```
Expected frame delta: > 30
Received: 29
```

No graphics code, visual threshold or render budget was modified by this gameplay/tooling work.

---

# 26. Decision

The design/tooling plan is complete.

Recommended next phase is **runtime implementation planning**, not further blind tuning.

Before implementation, split the runtime work into independently reviewable packages:

1. authoritative Workforce Policy state + command contract
2. category-floor allocator
3. Utility emergency controller
4. Defense staffed-source/readiness integration
5. PvE reward transaction + anti-farm ledger
6. explainability/read-model fields

Quest, Tutorial, Event and PvP/Raid remain separate gameplay debts and must not be hidden inside this implementation.
