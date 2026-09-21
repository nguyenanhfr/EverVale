# 88 — Defense Readiness Constitution v1

Status: **DEVSIM VALIDATED — RUNTIME IMPLEMENTATION PENDING**

Date: 2026-09-21

Authority:
- combat control: `docs/53_COMBAT_COMMAND_DEPLOYMENT_WIN_LOSS.md`
- Workforce evidence: `docs/87_WORKFORCE_POLICY_BASELINE_REPORT_V1.md`
- production data: `data/combat/v0.2/production.yaml`

Purpose:

Connect Defense Workforce investment to real combat capability so Defense priority has measurable strategic value.

This document does not authorize runtime implementation yet.

---

# 1. Confirmed gap

Current combat production data already states:

```
guard:
  source: guard_post
  requires_staffed_source: true
```

But current M1 runtime wave creation effectively uses:

```
completed guard posts
× 2 Guards
```

without checking source staffing.

Measured result:

```
Defense HIGH
→ Money much lower
→ more Defense workers
→ same combat condition loss
```

This is invalid strategic feedback.

---

# 2. Leadership rule

Defense staffing must affect combat capability.

The causal chain is:

```
Defense Workforce
→ source staffing
→ readiness
→ deployable/effective defenders
→ combat outcome
→ damage avoided
→ PvE reward opportunity
```

A player must never pay the Workforce cost of Defense without receiving combat value.

---

# 3. Readiness is not a new spendable currency

Readiness is an operational state from 0..100.

It represents:
- staffing
- maintenance
- recent combat fatigue/damage
- source availability

It is not manually purchased as a separate resource.

---

# 4. Source staffing rule

For a combat unit with:

```
requires_staffed_source: true
```

its supported combat capacity depends on source staffing.

Example:

Guard Post:
- workers required: 2
- supported Guards: 2

Candidate relationship:

```
source_staffing_ratio
=
workers_assigned / workers_required
```

Then:

```
supported_guard_capacity
=
slots_per_source × staffing_ratio
```

Fractional capacity is resolved deterministically.

Exact rounding rule must be data-driven/tested.

---

# 5. Candidate MVP deployment rule

For initial M1/M2 validation:

## 0% staffed

- no deployable Guard from that source

## partial staffed

- proportional supported capacity

Example:

```
1 / 2 workers
→ 1 / 2 Guard supported
```

## fully staffed

- full supported Guard slots

This is easier to understand than spawning full Guards with hidden DPS penalties.

---

# 6. Town Warden exception

Town Wardens are onboarding/core defenders.

They may remain available independent of Guard Post staffing.

Purpose:
- prevent early hard-lock
- preserve minimum tutorial defense
- maintain recoverability

They must not be strong enough to erase the value of actual Defense investment.

---

# 7. Readiness factor after deployment

Once a unit is deployable, readiness may modify combat efficiency.

Existing combat design already specifies candidate factors:

- readiness 100 → 1.00
- readiness 75 → 0.94
- readiness 50 → 0.82
- readiness 25 → 0.65

This remains the preferred later model.

For the immediate DevSim proof:

**source staffing/deployability comes first.**

Do not simultaneously add several unproven readiness multipliers.

---

# 8. Defense Workforce during peace

Defense workers represent:
- patrol
- training
- maintenance
- readiness preparation

They should therefore contribute to:
- deployable Guard capacity
- readiness recovery
- eventual response speed

They should not generate normal Money.

---

# 9. Emergency Defense override

During warning/active threat:

server may temporarily elevate Defense category priority.

But:

- missing Guard Posts remain missing
- missing Tech remains missing
- unproduced vehicles remain unavailable
- low pre-combat readiness is not instantly restored

Emergency staffing can activate existing capacity.

It cannot create a Fortress settlement instantly.

---

# 10. Warning phase role

The current M1 wave has an 8 second warning.

Future strategic model may use warning phase to:
- reassign emergency workers
- activate staffed Guard sources
- apply doctrine
- deploy ready reserve

The warning is not enough time to build infrastructure.

Therefore pre-wave investment remains important.

---

# 11. Readiness recovery

Existing production data defines readiness recovery per cycle by unit class.

This should remain server-authoritative.

Recovery can depend on:
- source staffed
- repair facility
- funding
- Power
- unit class

No final formula is locked yet.

---

# 12. Combat value equation

Defense investment should be evaluated as:

```
Defense Value
=
repair avoided
+ production downtime avoided
+ PvE reward enabled
- Defense upkeep
- Defense Workforce opportunity cost
- military production cost
```

Readiness is the bridge between Workforce investment and the first two terms.

---

# 13. DevSim readiness candidate

Before runtime changes, DevSim should test:

## DR0 — Unstaffed Guard Post

Expected:
- no supported Guards from source
- worse outcome / more condition loss

## DR1 — Half staffed

Expected:
- partial Guard capacity
- outcome between DR0 and full staffing when the wave is sensitive enough

## DR2 — Fully staffed

Expected:
- full Guard capacity
- lower expected damage

## DR3 — Defense HIGH

Expected:
- more staffing than Balanced under scarcity
- better combat result
- lower Money/Tech opportunity

## DR4 — Emergency-only staffing

Expected:
- improves active capacity only if workers can be reassigned
- must not equal long-prepared Fortress if later readiness/fatigue exists

---

# 14. Acceptance gates

## DG1 — Staffing matters

Full Guard staffing must outperform zero staffing on at least one measurable combat metric.

## DG2 — No free defenders

An unstaffed source cannot deploy full supported units.

## DG3 — Defense priority ROI input

Defense HIGH must create measurable combat improvement under a scarcity fixture.

## DG4 — Town remains recoverable

Zero optional Defense must not necessarily delete/restart the world in onboarding threat.

## DG5 — Deterministic

Same staffing/state/seed gives same deployment/outcome.

## DG6 — Server authority

Client cannot claim fake staffing/readiness.

---

# 15. Current runtime debt

Required future runtime changes, only after DevSim proof:

- Guard spawn capacity must respect staffed source
- readiness must exist in authoritative state or be deterministically derived
- Defense category priority must affect staffing
- combat deployment must consume authoritative readiness
- aftermath/recovery must update readiness

These are not implemented by this document.

---

# 16. Corrected execution order

1. choose Workforce allocator semantics
2. DevSim source-staffing readiness overlay
3. rerun Workforce/Defense gates
4. lock Defense Readiness candidate
5. design PvE Reward Contract
6. simulate Defense ROI including reward
7. only then implement authoritative runtime state/commands


---

# 17. Measured validation

Defense Readiness DevSim used the existing M1 combat engine and real domain repair command.

Base threat results:

| Guard Post staffing | Deployable Guards | Outcome | Condition loss | Repair spend |
|---|---:|---|---:|---:|
| 0 / 2 | 0 | COSTLY | 18 | 54 |
| 1 / 2 | 1 | CLEAN | 0 | 0 |
| 2 / 2 | 2 | CLEAN | 0 | 0 |

Measured gates:

- zero staffing creates zero Guards — PASS
- half staffing creates proportional capacity — PASS
- full staffing creates full capacity — PASS
- full staffing creates measurable combat value — PASS

This validates the staffed-source rule already declared by `production.yaml`.

It does **not** validate the later 0..100 persistent readiness/fatigue model yet.

Production debt remains:

`triggerM1Wave()` must eventually stop granting full Guard capacity merely because a Guard Post is complete.
