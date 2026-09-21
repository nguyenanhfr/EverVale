# 85 — Strategic Path Baseline Report v1

Status: **DIRECTIONAL PASS — BALANCE NOT LOCKED**

Date: 2026-09-21

Authority:
- strategic direction: `docs/83_CORE_GAMEPLAY_STRATEGIC_PATHS_AND_DEBT.md`
- Constitution candidate: `docs/84_CORE_GAMEPLAY_CONSTITUTION_V1.md`
- measurement engine: `packages/devsim/src/strategic-paths.ts`

Measured source revision:

`a905ecd518b8d5121dad6196630e0deb7db2e4d6`

CI measurement run:

```
pnpm devsim paths --hours 8 --long-hours 12 --strong-hours 12 --seed 1
```

Important:

This report is **proof of strategic direction**, not final balance proof.

Current path modeling uses:
- real authoritative WorldService/domain simulation
- real building costs
- real construction
- real Workforce allocation
- real combat/aftermath
- build order
- job-priority overlays

It does **not** invent Settlement Charter bonuses that do not exist in runtime.

---

# 1. Executive result

All ten Constitution directional gates passed:

- G1 Industrial identity: PASS
- G2 Scholar identity: PASS
- G3 Civic identity: PASS
- G4 Fortress identity: PASS
- G5 Sacrifice: PASS
- G6 Omni penalty: PASS
- G7 Hybrid validity: PASS
- G8 Pivot viability: PASS
- G9 Pivot cost: PASS
- G10 No dominant path: PASS

This means the existing systems already contain the beginnings of the intended strategic game.

However, several path results are too extreme or incomplete to become canonical balance.

The correct conclusion is:

> **The path model is viable. The current numbers are not yet ready to lock.**

---

# 2. Eight-hour path results

| Path | Money | Population | Tech | T1 | Condition loss | Main issue |
|---|---:|---:|---:|---:|---:|---|
| Industrial | 1597.0 | 19 | 0 | never | 35 | Water collapses; School starves |
| Scholar | 276.2 | 23 | 570.5 | 110 min | 35 | Very low treasury |
| Civic | 1029.3 | 23 | 162.0 | 236 min | 35 | identity emerges more clearly at longer horizon |
| Fortress | 251.4 | 23 | 181.5 | 197 min | **18** | treasury soft-lock candidate |
| Balanced Hybrid | 1826.9 | 20 | 25.25 | never | 35 | School starves ~5.85h |
| Omni Build | 395.7 | 23 | 0 | never | 35 | School starves ~6.68h |
| Pivot Industry→Fortress | 1897.6 | 19 | 0 | never | **18** | pivot works, Tech remains sacrificed |
| Strong Multipath (12h) | 2167.8 | 28 | 0 | never | 0 | School starves ~10.35h |

---

# 3. G1 — Industrial identity

Result:

**PASS**

Money leaderboard among pure paths:

```
Industrial
> Civic
> Scholar
> Fortress
```

At 8h:

- Industrial Money: **1597**
- Civic Money: 1029
- Scholar Money: 276
- Fortress Money: 251

The Industry path has a real economic identity.

But the cost is severe:

- Tech = **0**
- School zero staff ≈ **4.52h**
- Water ends at **0**
- Workforce saturated ≈ **7.18h**
- combat outcome is BREACH in the stress wave

This is strong evidence of real opportunity cost.

It may also be too binary.

### Interpretation

Good:
- Industry clearly wins Money.
- It sacrifices Tech.
- utility pressure finally becomes visible.

Concern:
- Tech fully dies rather than merely slowing.
- Water reaches zero for a long period.
- this may feel like an opaque trap unless player priority/utility consequences are clearly explained.

---

# 4. G2 — Scholar identity

Result:

**PASS**

Tech leaderboard:

```
Scholar
> Fortress
> Civic
> Industrial
```

Scholar at 8h:

- T1: **6600s = 110 minutes**
- Tech: **570.5**
- Population: 23
- Money: **276.2**

This is almost exactly the intended Knowledge fantasy:

> sacrifice immediate treasury to reach Tech much earlier.

Current documented target for intentional T1:

**90–150 minutes**

Scholar reaches T1 at:

**110 minutes**

This is a strong result.

### Concern

Money drops extremely low.

Scholar must remain recoverable and not become a hidden treasury trap.

---

# 5. G3 — Civic identity

Result:

**PASS at 12h**

At 8h:
- Scholar/Civic/Fortress all reach Population 23.

At 12h:
- Civic: **28**
- Scholar: 24
- Fortress: 24
- Industrial: 22

Long-horizon population leaderboard:

```
Civic
> Scholar
> Fortress
> Industrial
```

This shows an important design property:

**Civic is a compounding path.**

Its benefit should not necessarily dominate immediately.

That fits the fantasy:

> invest in people now, obtain more Workforce later.

### Concern

The identity appears more slowly than the other branches.

Tutorial/UX must not promise an immediate payoff that does not exist.

---

# 6. G4 — Fortress identity

Result:

**PASS**

Condition loss under the same stress wave:

- Fortress: **18**
- Industrial: 35
- Scholar: 35
- Civic: 35

Fortress therefore materially reduces combat damage.

That is the first measured proof that Defense investment is strategically different.

However:

- Money at 8h: **251.4**
- critical diagnostic:
  `TREASURY_SOFTLOCK_CANDIDATE`
- first detected around **8400s = 140 minutes**

### Interpretation

The basic Defense tax exists.

But Fortress ROI is incomplete because authoritative PvE rewards do not exist yet.

At present the branch pays:
- Money
- Workforce
- growth opportunity cost

and receives mainly:
- lower damage

The missing PvE reward loop is therefore now a measured blocker rather than a theoretical one.

---

# 7. G5 — Sacrifice

Result:

**PASS**

Each pure path wins exactly one signature metric:

```
Industrial → Money
Scholar    → Tech
Civic      → long-horizon Population
Fortress   → combat damage reduction
```

No pure path wins all categories.

This is the most important result of the first Strategic Path Pack.

It means the Constitution does not require inventing an entirely new game.

The current systems already contain useful competitive pressure.

The next balance pass should refine that pressure, not replace it.

---

# 8. G6 — Omni penalty

Result:

**PASS**

Omni Build is within 5% of the best pure strategy on only:

**1 / 4 signature metrics**

At 8h:

- Money: 395.7
- Population: 23
- Tech: **0**
- no T1
- School zero staff ≈ **6.68h**
- Workforce saturated ≈ **7.18h**

This strongly supports the leadership decision:

> Trying to build everything should not equal specializing.

Current omni behavior already pays real opportunity cost.

### Concern

The penalty currently comes heavily from hidden Workforce priority behavior.

That must become player-visible before it can be considered good gameplay.

---

# 9. G7 — Balanced Hybrid

Result:

**PASS for viability**

At 8h:

- Money: **1826.9**
- Population: 20
- Tech: 25.25
- no T1
- no critical diagnostics

The hybrid is financially healthy.

However:

- School zero staff ≈ **5.85h**
- Workforce saturated ≈ **7.18h**

So current “balanced” runtime defaults are not strategically balanced.

They are economically biased.

### Design implication

Default priority values need review.

Balanced should mean:

> no signature strength, no catastrophic starvation.

It should not mean:

> Economy silently wins the worker allocator.

---

# 10. G8/G9 — Pivot

Result:

**PASS directionally**

Scenario:

```
Industrial
→ hour 4
→ Fortress priority transition
```

Transition successfully applied:

`INDUSTRIAL_TO_FORTRESS`

Final 8h:

- Money: **1897.6**
- Population: 19
- Tech: 0
- condition loss: **18**

The pivot succeeds at turning an Industry-heavy town into a much stronger defensive town.

That demonstrates:

- no restart required
- buildings remain
- job-priority transition can materially change outcome

### Limitation

This is still a priority-policy pivot.

A real future Charter system does not yet exist.

The current G9 is a directional probe, not final pivot-cost proof.

---

# 11. G10 — No dominant pure path

Result:

**PASS**

Maximum signature-metric wins by any pure path:

**1**

This is a healthy first signal.

But it is not enough by itself.

Future candidate balance must also compare:
- total utility pressure
- recovery time
- threat/reward economics
- progression unlock value
- soft-lock probability
- multi-seed variance

---

# 12. Strong Multipath result

At 12h:

- Money: **2167.8**
- Population: 28
- Tech: **0**
- School zero staff ≈ **10.35h**
- Workforce saturated ≈ **11.18h**

This proves something important:

Simply becoming larger/richer does **not** automatically create balanced multi-path capability under current default priorities.

The settlement still sacrifices Knowledge almost entirely.

Therefore the future rule:

> strong players may eventually diversify

will require one or more of:

- explicit player priority control
- better Workforce growth
- path transition/support policies
- efficiency unlocks
- PvE/external rewards
- improved utility/production efficiency

It should not be solved by merely giving more starting Money.

---

# 13. Current strategic leaderboards

## Money

```
Industrial
> Civic
> Scholar
> Fortress
```

## Tech

```
Scholar
> Fortress
> Civic
> Industrial
```

## Population at 12h

```
Civic
> Scholar
> Fortress
> Industrial
```

## Defense / damage reduction

```
Fortress
> Industrial
> Scholar
> Civic
```

This is the desired broad shape.

---

# 14. Most important measured problems

## P0-A — Default Workforce allocation is doing too much game design invisibly

Evidence:
- Balanced Hybrid School zero staff ~5.85h
- Omni School zero staff ~6.68h
- Strong Multipath School zero staff ~10.35h
- Industrial School zero staff ~4.52h

The player currently does not own enough of this decision.

Required next design:
- server-authoritative category priority control
- visible explanation of displaced workers
- bounded semantic settings

---

## P0-B — PvE Defense has no complete positive reward loop

Fortress clearly prevents damage.

But its treasury becomes dangerously weak.

Without meaningful PvE reward:
- Defense is mostly insurance
- high Defense investment can become economically irrational

Required next:
**PvE Reward Contract + DevSim ROI**

---

## P0-C — Industrial specialization can collapse Water

Industrial 8h final Water:

**0 / 120**

Time at Water zero is substantial in the path report.

This is directionally good because Industry must create infrastructure pressure.

But the consequence must be:
- visible
- recoverable
- intentional

and current utility shortage mainly affects Happiness rather than fully throttling operation.

---

## P1-A — Scholar may be too cash-poor

Scholar achieves excellent Tech timing:

**T1 = 110 min**

but Money at 8h:

**276.2**

This could be acceptable if:
- advanced Tech creates real compensating options
- player remains recoverable

Needs candidate testing.

---

## P1-B — Civic identity arrives later

Civic becomes clearly best at Population only by the 12h horizon.

This may be correct for a compounding path.

Needs UX/session design so early Civic investment still produces satisfying visible feedback.

---

## P1-C — Strong Multipath is not yet a functioning late-game concept

Current 12h broad-build path still has:
- zero Tech
- extreme School starvation

A true late-game multi-path test needs a later-stage fixture or earned surplus model.

The current result should not be used to define endgame balance.

---

# 15. Constitution verdict

The strategic Constitution is **viable**.

Measured evidence supports the four-path model:

- Industry has a real Money advantage.
- Scholar has a real Tech advantage.
- Civic has a real long-term Population advantage.
- Fortress has a real damage-reduction advantage.
- Omni Build is penalized.
- Pivoting is technically viable.
- No pure path dominates all signature metrics.

Therefore:

**DO NOT redesign the four-path concept.**

The next task is to tune and expose it.

---

# 16. What is still missing before Economy v0.3 lock

Required before final balance:

1. Player-facing Workforce category priority contract.
2. Funding-failure authoritative model.
3. PvE reward model.
4. Defense ROI simulation including reward + repair avoidance.
5. Utility operational throttling or explicit decision whether Happiness-only pressure is sufficient.
6. Better late-game/strong-multipath fixture.
7. Multi-seed path comparison.
8. Soft-lock/recovery thresholds.
9. Quest/Tutorial integration only after these rules stabilize.

---

# 17. Recommended next design step

Do **not** immediately change all prices.

The next design item should be:

# WORKFORCE & STRATEGIC PRIORITY CONSTITUTION

because the Strategic Path Pack shows that Workforce allocation is currently the strongest mechanism distinguishing paths.

That constitution should lock:

- player-facing priority categories
- critical utility minimums
- emergency Defense override
- how many priorities the player can raise simultaneously
- what happens when priorities tie
- how worker displacement is explained
- whether PAUSED is allowed
- pivot/retraining delay
- server-authoritative policy data

After that:

# PvE Reward Contract

Then DevSim can evaluate a complete Fortress economy.

---

# 18. CI note

The Strategic Path Pack itself passed:
- typecheck
- unit tests
- DevSim smoke
- DevSim baseline
- DevSim path report
- Civic long-horizon report
- build
- PostgreSQL integration

The full Engineering workflow was blocked later by the pre-existing visual stress gate:

```
M1 stress frame delta
Expected: > 30
Received: 29
```

No DevSim or gameplay-path failure caused that browser result.

No graphics/performance threshold was changed.
