# 89 — PvE Reward Contract v1

Status: **LEADERSHIP DESIGN LOCK CANDIDATE**

Date: 2026-09-21

Authority:
- Core Gameplay Constitution: `docs/84_CORE_GAMEPLAY_CONSTITUTION_V1.md`
- Workforce / priority: `docs/86_WORKFORCE_STRATEGIC_PRIORITY_CONSTITUTION.md`
- Defense Readiness: `docs/88_DEFENSE_READINESS_CONSTITUTION_V1.md`
- Combat control: `docs/53_COMBAT_COMMAND_DEPLOYMENT_WIN_LOSS.md`

Purpose:

Complete the PvE loop so Defense is not only a punishment-reduction system.

Current incomplete loop:

```
Threat
→ Combat
→ Damage
→ Repair
```

Target loop:

```
Threat
→ Preparation
→ Combat
→ Outcome quality
→ Reward + Damage
→ Reinvestment
```

This document does not lock final numeric reward values.

---

# 1. Leadership rule

PvE must create **external value** that cannot be obtained by simply waiting.

However:

**PvE must not replace the domestic economy.**

Winning attacks should:
- make Defense investment feel worthwhile
- accelerate recovery
- occasionally unlock rare opportunities

but should not make intentional wave farming the optimal Money strategy.

---

# 2. Outcome classes

Existing outcomes remain:

- CLEAN
- COSTLY
- BREACH

Reward quality follows:

```
CLEAN > COSTLY > BREACH
```

But BREACH may still grant limited salvage.

Reason:
a player recovering from failure should not be pushed into an unrecoverable spiral.

---

# 3. Reward categories

Initial candidate categories:

## Money salvage

Purpose:
- offset part of repair/preparation burden

Must not exceed expected normal economic production enough to make combat farming dominant.

## Tech insight

Small, bounded.

Purpose:
- advanced enemies teach the settlement something

Rule:
must never replace School/Knowledge investment.

## Varum salvage

Only where enemy/threat context justifies it.

Purpose:
- create an external route to small amounts of advanced resource

Rule:
must not make Varum infrastructure pointless.

## Temporary Safety/Happiness

Optional later.

Purpose:
- communicate successful defense socially

Not part of initial M1 reward proof unless needed.

## Rare salvage token

Future-only:
- Quest
- special upgrades
- cosmetics

Not required for first reward implementation.

---

# 4. Reward authority

Client never reports:
- kill count reward
- Money reward
- Tech reward
- Varum reward
- outcome multiplier

Server derives reward from:
- authoritative Threat Bracket
- authoritative combat outcome
- optional objectives
- anti-farm state

---

# 5. Base reward model

Candidate structure:

```
reward
=
bracket_base
× outcome_multiplier
× objective_multiplier
× anti_farm_multiplier
```

Repair cost is **not** directly added to reward.

Otherwise intentional damage can become profitable.

---

# 6. Outcome multipliers

Design direction:

## CLEAN

Full bracket reward.

Signals:
preparation paid off.

## COSTLY

Reduced reward.

Still positive because threat was repelled.

## BREACH

Very small salvage only.

No full victory reward.

Purpose:
support recovery, not celebrate failure.

---

# 7. Defense ROI

Defense must be evaluated across a horizon, not a single wave.

```
Defense strategic value
=
repair avoided
+ production downtime avoided
+ PvE rewards enabled
- Defense upkeep
- Defense Workforce opportunity cost
- military production cost
- utility/Varum cost
```

A Fortress does not need to beat Industry in pure Money.

It needs to become economically rational under meaningful threat.

---

# 8. Anti-farm rule

A player must not profit by repeatedly triggering weak attacks.

Required protections may include:
- natural server-controlled wave cadence
- reward cooldown by threat source/bracket
- diminishing salvage for repeated equivalent encounters
- no reward from developer/test waves
- reward only for authoritative progression waves

The test command:

`TRIGGER_TEST_WAVE`

must never become a production reward faucet.

---

# 9. Threat scaling

Higher Settlement Rating / Threat Bracket may increase reward.

But reward growth must remain below uncontrolled combat-power snowball.

Conceptually:

```
higher bracket
→ higher preparation cost
→ higher risk
→ higher reward
```

Not:

```
strong town
→ trivial fight
→ exponential free reward
```

---

# 10. Opportunity cost target

A Defense-focused player should experience:

```
lower peaceful production
+
lower expected combat loss
+
access to PvE value
```

An Industry-focused player should experience:

```
higher peaceful production
+
higher expected combat loss
+
lower PvE efficiency
```

Both must remain viable.

---

# 11. Reward should not erase damage

A CLEAN win may be net-positive.

A COSTLY win should often be close to:
- break-even
- modestly positive
- or mildly negative

depending on threat and preparation.

A BREACH should remain a loss.

If every outcome is profitable, combat has no risk.

---

# 12. Candidate early-game target shape

For the first meaningful bracket:

## CLEAN

Reward should cover:
- a meaningful fraction of basic Defense opportunity cost
- possibly more than zero repair because damage is low

## COSTLY

Reward should cover:
- part of repair
- not all strategic loss

## BREACH

Reward should cover:
- limited salvage only
- clearly below repair burden

Exact values must come from DevSim.

---

# 13. Tech reward rule

Tech reward must be small relative to School output over time.

Acceptance target:

A player cannot reach T1 faster through repeated normal PvE than an intentional Scholar path.

PvE Tech is:
- bonus
- catch-up
- flavor

not the primary Tech engine.

---

# 14. Varum reward rule

Early Varum salvage should be:
- rare
- bracket-gated
- small

It may help a Defense player access one advanced purchase sooner.

It must not replace:
- Varum Mine
- advanced production
- expansion/resource control

---

# 15. PvE reward ledger

DevSim must report:

```
PvE reward income
Repair cost
Defense upkeep
Defense Workforce opportunity cost
Net PvE contribution
Damage avoided vs weak-defense baseline
```

Without that ledger, reward numbers are not approved.

---

# 16. Required DevSim scenarios

## PR0 — NO DEFENSE

Low staffing/readiness.

Measure:
- outcome
- damage
- repair
- reward

## PR1 — BALANCED DEFENSE

Moderate staffing.

Measure:
- same wave
- same seed

## PR2 — FORTRESS DEFENSE

High staffing/readiness.

Measure:
- same wave
- same seed
- peaceful Money opportunity cost

## PR3 — REPEATED CLEAN WINS

Test farming risk.

## PR4 — REPEATED COSTLY WINS

Test whether reward accidentally cancels all damage.

## PR5 — BREACH RECOVERY

Ensure limited salvage helps recovery without making Breach desirable.

---

# 17. PvE reward acceptance gates

## PG1 — Defense creates value

Fortress total expected value must improve versus the same threat without Defense when repair avoided + reward are counted.

## PG2 — Industry still wins peaceful economy

Fortress reward must not make Fortress exceed Industry's peaceful Money lead in ordinary low-threat play.

## PG3 — CLEAN > COSTLY > BREACH

Net reward hierarchy remains clear.

## PG4 — BREACH negative

Breach remains net-negative after salvage.

## PG5 — No farm exploit

Repeated identical low-tier wins do not become the dominant economic strategy.

## PG6 — Scholar remains Tech leader

PvE Tech bonus does not beat intentional Knowledge specialization.

## PG7 — Varum infrastructure remains meaningful

PvE Varum does not replace domestic Varum production.

## PG8 — Server authority

Client cannot alter outcome/reward values.

---

# 18. Initial implementation boundary

First reward implementation should be deliberately small:

- Money salvage
- optional small Tech
- optional bracket-gated Varum

Do not add:
- loot rarity trees
- equipment drops
- random crates
- gacha-like reward layers
- five new currencies

until the core economic loop is proven.

---

# 19. Relationship to Quest/Event systems

Quest may provide one-time bonus rewards for special defenses.

Event may modify a particular wave's objectives/reward.

But base PvE rewards remain server-authoritative and independent.

---

# 20. Correct implementation order

1. Workforce allocator candidate passes strategic gates
2. Defense Readiness staffing affects combat
3. Measure repair/damage opportunity cost
4. DevSim reward sweep
5. Lock reward bands
6. Implement server reward transaction
7. Add player-facing combat reward summary
8. Add Quest/Event bonuses later

---

# 21. Definition of done

PvE Reward Contract is ready for runtime only when DevSim can answer:

- Why should I invest in Defense?
- How much peaceful growth do I sacrifice?
- How much damage do I avoid?
- What do I earn for a CLEAN win?
- Is COSTLY still painful?
- Is BREACH still a loss?
- Can I farm weak waves?
- Can PvE replace School?
- Can PvE replace Varum production?

If any answer is unclear, final reward values are not locked.
