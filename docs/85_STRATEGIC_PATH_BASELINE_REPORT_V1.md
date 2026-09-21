# 85 — Strategic Path Baseline Report v1

Status: **EVIDENCE REPORT — DESIGN GAPS CONFIRMED / NO BALANCE CHANGE AUTHORIZED**

Date: 2026-09-21

Source:
- DevSim PR #12
- DevSim commit: `cb7f77798f33b1224ce56a889b96e0ef75eeb9df`
- horizon: 8 real hours for core paths
- strong multi-path probe: 12 real hours
- seed: 1
- model: `BUILD_ORDER_AND_JOB_PRIORITY_ONLY`

This report measures the current authoritative runtime rules.

It does **not** simulate Charter bonuses because Charter gameplay does not exist yet.

---

# 1. Summary

The current runtime already creates two recognizable strategic identities:

- **Industrial**
- **Scholar**

The current runtime does **not yet create distinct identities** for:

- **Civic**
- **Fortress**

The main reasons are different.

Civic:
- additional Housing / Parks do not create a sufficiently unique Population advantage within the 8h horizon

Fortress:
- the current M1 test wave is too weak to distinguish additional Guard investment from ordinary starter defense

This means the Constitution is directionally valid, but the current gameplay systems are not yet sufficient to express all four paths.

---

# 2. Core path results

| Path | Money @ 8h | Population | Tech Points | T1 | Condition Loss |
|---|---:|---:|---:|---:|---:|
| Industrial | 1597.0 | 19 | 0 | never | 0 |
| Scholar | 276.2 | 23 | 570.5 | 110 min | 18 |
| Civic | 1029.3 | 23 | 162.0 | 236 min | 0 |
| Fortress | 251.4 | 23 | 181.5 | 197 min | 0 |

Additional observations:

Industrial:
- Workforce saturated ~7.18h
- School zero-staff ~4.52h

Scholar:
- Workforce saturated ~5.93h
- School zero-staff 0h

Civic:
- Workforce saturated ~5.2h
- School zero-staff 0h

Fortress:
- Workforce saturated ~5.05h
- treasury soft-lock candidate detected
- School zero-staff 0h

---

# 3. Constitution directional gates

## G1 — Industrial identity

**PASS**

Money ranking:

`Industrial > Civic > Scholar > Fortress`

Industrial already has a clear economic identity.

---

## G2 — Scholar identity

**PASS**

Tech ranking:

`Scholar > Fortress > Civic > Industrial`

Scholar reaches T1 at approximately:

`6600 seconds = 110 minutes`

Industrial never reaches T1 within 8 hours.

This is a strong and meaningful sacrifice.

---

## G3 — Civic identity

**FAIL**

Population ranking:

`Scholar = Civic = Fortress > Industrial`

The sort order displayed Scholar first, but Scholar/Civic/Fortress all finish at Population 23.

Therefore Civic does not yet own a distinct signature outcome.

Current Housing/Recreation investment is not enough by itself to make Civic measurably superior within the target horizon.

---

## G4 — Fortress identity

**FAIL**

Current M1 test wave result:

- Industrial: 0 condition loss
- Civic: 0
- Fortress: 0
- Scholar: 18

The starter combat package includes two free Town Wardens before Guard Post contribution.

The fixed M1 wave contains only:
- 3 Nibblers
- 1 Wobble Slime

This is a tutorial/smoke wave.

It is not a valid benchmark for Defense specialization.

Fortress cannot prove its value against a threat that Industrial can already repel cleanly.

---

## G5 — Sacrifice

**PASS**

Metric leadership is split between:
- Industrial
- Scholar

No single path currently wins every metric.

---

## G6 — Omni penalty

**DIRECTIONALLY PASS**

Omni Build after 8h:

- Money: ~395.7
- Population: 23
- Tech: 0
- T1: never
- School zero-staff: ~6.68h

The current Workforce system already punishes trying to build everything.

This is valuable evidence.

However the penalty is partially opaque because player job-priority control is not yet implemented.

---

## G7 — Balanced hybrid validity

**PASS FOR SURVIVAL, FAIL FOR QUALITY**

Balanced Hybrid:

- Money: ~1826.9
- Population: 20
- Tech: 25.25
- T1: never
- School zero-staff: ~5.85h

The town survives and remains financially strong.

But it does not produce a satisfying balanced progression.

Default fixed job priority heavily favors Money.

Therefore current "balanced" behavior is actually economy-biased.

---

## G8 — Pivot viability

**PASS AS A DEV PROBE**

The DevSim Industrial → Fortress priority transition applies successfully without deleting buildings or corrupting state.

This proves that Workforce reallocation can support a future pivot mechanic.

It does not yet prove a real Charter transition cost.

---

## G9 — Pivot cost

**NOT YET CANONICAL**

The current probe changes priority only.

No:
- Charter cooldown
- retraining cost
- transition Money cost
- policy transition state

exists yet.

Therefore a real pivot-cost gate cannot be locked.

---

## G10 — No dominant path

**DIRECTIONALLY PASS**

Current signature wins are split.

But this result should not be over-read because Civic and Fortress signatures are not yet properly measurable.

---

# 4. Strong multi-path probe

12h broad-development attempt:

- Money: ~2167.8
- Population: 28
- Tech: 0
- T1: never
- Workforce saturated: ~11.18h
- School zero-staff: ~10.35h

This is a critical result.

The current runtime does **not** naturally produce a powerful multi-path town.

Instead it produces:

> a rich town whose automatic priorities starve Research almost permanently.

This means strong multi-path progression will require:
- intentional player policy
- larger Population/Workforce
- progression unlocks
- or later external advantages

It should not be solved by simply adding more Money.

---

# 5. Main finding — Workforce already creates real strategy

The strongest working strategic system today is:

**finite Workforce**

Example:

Industrial path:
- Workshops consume available workers
- School starves
- Money rises
- Tech stalls

Scholar path:
- School receives workers
- Tech accelerates
- treasury becomes fragile

This is exactly the kind of opportunity cost EverVale needs.

The next game design should build on this rather than inventing many new resources.

---

# 6. Main finding — fixed priority is currently making the choice for the player

The system has strategic consequences.

But player agency is incomplete.

Current example:

`Workshop priority 80 > School priority 70 > Guard Post priority 45`

Therefore a player may build:
- Workshop
- School
- Guard

without consciously choosing Economy,

yet the allocator effectively chooses Economy for them.

That is unacceptable for the final strategic core.

Future gameplay needs server-authoritative player priority/policy control.

---

# 7. Civic gap

Civic needs a measurable signature advantage.

Do not immediately add a numeric bonus.

First evaluate longer-horizon behavior.

Required next probes:

- 8h
- 12h
- 24h

Measure:
- Population
- Workforce
- utility pressure
- treasury burden
- recovery capacity

If Civic naturally wins long-term Population through build order alone, no artificial Charter growth multiplier is required.

If not, a Civic-specific progression mechanic may be needed.

---

# 8. Fortress gap

Fortress cannot be evaluated using the current M1 tutorial wave.

Required:

## DevSim Defense Stress Probe

Rules:

- use the real combat engine
- use canonical unit HP/DPS/Armor
- spawn defenders through normal Town Center / Guard Post logic
- increase enemy **composition/count only** in DevSim
- do not change runtime wave
- do not change canonical combat stats
- compare equal-town paths under identical seeded stress

Measure:
- outcome
- defender HP loss
- building condition loss
- repair burden
- economic recovery
- later PvE reward ROI

This becomes the valid Defense benchmark.

---

# 9. PvE reward still missing

Even after Fortress can prove lower damage, its economic purpose remains incomplete.

Current loop:

`Defense spend → lower damage`

Target:

`Defense spend → lower damage + access to risky PvE reward`

Required later DevSim metric:

`PvE Net Value = Reward - Upkeep - Readiness Loss - Repair - Opportunity Cost`

Defense should have value.

It must not become the best Money generator.

---

# 10. Design decision after baseline v1

Do not tune final Economy v0.3 yet.

First:

1. run Civic long-horizon probe
2. create Defense Stress Probe
3. add player-policy candidate overlays in DevSim
4. re-run all Constitution gates
5. identify the minimum missing mechanics

Only then propose candidate numeric balance.

---

# 11. Current path maturity

| Path | Identity | Current maturity |
|---|---|---|
| Industrial | Money / construction | STRONG |
| Scholar | Tech / early unlock | STRONG |
| Civic | Population / resilience | WEAK / UNPROVEN |
| Fortress | PvE survival / reward access | UNPROVEN |
| Hybrid | broad resilience | PLAYABLE BUT ECONOMY-BIASED |
| Omni | broad development | CORRECTLY PRESSURED, BUT OPAQUE |
| Pivot | strategic reallocation | TECHNICALLY FEASIBLE, DESIGN COST MISSING |

---

# 12. Immediate next work

DevSim only:

- Civic 12h/24h horizon test
- Defense Stress Probe
- player Workforce-policy candidate test
- repeat Constitution report

No gameplay runtime implementation should precede those results.
