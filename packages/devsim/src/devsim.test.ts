import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthorityDriftReport, buildRoiReport, runAuthorityTamperProbe } from "./reports.js";
import { runScenario } from "./scenarios.js";
import { SimHarness } from "./core.js";
import { runStrategicPathPack } from "./strategic-paths.js";
import { compileWorkforceProfile, runWorkforceCandidatePolicyPack, runWorkforcePolicyPack } from "./workforce-policy.js";
import { runWorkforceAllocatorLab } from "./workforce-allocation-lab.js";
import { runDefenseReadinessLab } from "./defense-readiness.js";

test("healthy planner spends authoritative Money and queues real construction", async () => {
  const report = await runScenario({
    scenarioId: "healthy_planner",
    hours: 0.1,
    seed: 11,
  });

  const firstBuild = report.actions.find(
    (action) => action.accepted && action.type === "PLACE_BUILDING",
  );

  assert.ok(firstBuild);
  assert.equal(firstBuild.definitionId, "house_small");
  assert.equal(firstBuild.moneyDelta, -120);
  assert.equal(report.ledger.constructionSpend, 120);
  assert.ok(report.final.activeConstruction >= 1);
});

test("starter idle cannot silently construct strategic content", async () => {
  const report = await runScenario({
    scenarioId: "starter_idle",
    hours: 1,
    seed: 12,
  });

  assert.equal(report.ledger.constructionSpend, 0);
  assert.equal(
    report.actions.filter((action) => action.type === "PLACE_BUILDING").length,
    0,
  );
  assert.equal(report.final.completedBuildings, report.initial.completedBuildings);
});

test("F12-style fake price fields do not make a server build free", async () => {
  const result = await runAuthorityTamperProbe();

  assert.equal(result.parserStrippedFakeCost, true);
  assert.equal(result.serverRejectedFreeBuild, true);
  assert.equal(result.error, "NOT_ENOUGH_MONEY");
  assert.equal(result.pass, true);
});

test("starter authority drift report exposes duplication but current common values agree", async () => {
  const result = await buildAuthorityDriftReport();

  assert.equal(result.passCommonValues, true);
  assert.deepEqual(result.mismatches, []);
  assert.ok(result.duplicateAuthorityRisks.length > 0);
});

test("ROI report includes Workforce-constrained payback instead of only full-staff fantasy", async () => {
  const report = await buildRoiReport();
  const workshop = report.entries.find((entry) => entry.id === "workshop");

  assert.ok(workshop);
  assert.equal(report.starterSpareWorkers, 1);
  assert.equal(workshop.fullStaffNetPerCycle, 29);
  assert.equal(workshop.constrainedWorkers, 1);
  assert.equal(workshop.constrainedNetPerCycle, 5);
  assert.ok(
    (workshop.constrainedPaybackCycles ?? 0) >
      (workshop.naivePaybackCycles ?? Number.POSITIVE_INFINITY),
  );
});

test("scenario replay is deterministic for the same seed and policy", async () => {
  const a = await runScenario({
    scenarioId: "economy_rush",
    hours: 2,
    seed: 42,
  });
  const b = await runScenario({
    scenarioId: "economy_rush",
    hours: 2,
    seed: 42,
  });

  assert.deepEqual(a.final, b.final);
  assert.deepEqual(a.milestones, b.milestones);
  assert.deepEqual(a.diagnostics, b.diagnostics);
  assert.deepEqual(a.plan, b.plan);
});


test("strategic path scenarios use only build order and job-priority policy overlays", async () => {
  const industrial = await runScenario({
    scenarioId: "pure_industrial",
    hours: 1,
    seed: 31,
  });
  const scholar = await runScenario({
    scenarioId: "pure_scholar",
    hours: 1,
    seed: 31,
  });

  assert.equal(industrial.strategicPolicy.model, "BUILD_ORDER_AND_JOB_PRIORITY");
  assert.equal(scholar.strategicPolicy.model, "BUILD_ORDER_AND_JOB_PRIORITY");
  assert.equal(industrial.balanceOverrides.workshop?.priority, 96);
  assert.equal(scholar.balanceOverrides.school?.priority, 96);
});

test("industrial to fortress pivot applies a deterministic priority transition", async () => {
  const report = await runScenario({
    scenarioId: "pivot_industrial_to_fortress",
    hours: 5,
    seed: 32,
  });

  assert.ok(
    report.strategicPolicy.transitionsApplied.includes(
      "INDUSTRIAL_TO_FORTRESS",
    ),
  );
  assert.ok(
    report.diagnostics.some(
      (item) => item.code === "POLICY_TRANSITION_INDUSTRIAL_TO_FORTRESS",
    ),
  );
});

test("strategic path pack emits Constitution directional diagnostics without pretending Charter bonuses exist", async () => {
  const report = await runStrategicPathPack({
    hours: 2,
    strongHours: 3,
    seed: 33,
  });

  assert.equal(report.model, "BUILD_ORDER_AND_JOB_PRIORITY_ONLY");
  assert.equal(report.metrics.length, 8);
  assert.equal(report.directionalGates.length, 10);
  assert.ok(
    report.unresolvedDesignLimits.some((item) =>
      item.includes("Charter bonuses"),
    ),
  );
});


test("priority transition updates existing building instances, not only future definitions", async () => {
  const harness = new SimHarness({
    seed: 34,
    buildingOverrides: {
      workshop: { priority: 96 },
      guard_post: { priority: 40 },
    },
  });
  await harness.initialize();

  const beforeWorkshop = harness.repository.world?.buildings.find(
    (building) => building.definitionId === "workshop",
  );
  assert.ok(beforeWorkshop);
  assert.equal(beforeWorkshop.priority, 96);

  harness.applyBuildingOverrides({
    workshop: { priority: 52 },
    guard_post: { priority: 96 },
  });

  const afterWorkshop = harness.repository.world?.buildings.find(
    (building) => building.definitionId === "workshop",
  );
  assert.ok(afterWorkshop);
  assert.equal(afterWorkshop.priority, 52);
});


test("workforce policy candidate rejects omni-HIGH before runtime", () => {
  assert.throws(
    () => compileWorkforceProfile("omni_high_invalid"),
    /WORKFORCE_HIGH_SLOT_LIMIT/,
  );
});

test("workforce policy pack measures W0-W7 without changing runtime allocator", async () => {
  const report = await runWorkforcePolicyPack({ hours: 2, seed: 35 });

  assert.equal(report.modelRevision, "workforce-strategic-priority-v1");
  assert.ok(report.gates.some((gate) => gate.id === "WG7_OMNI_HIGH_REJECTED" && gate.pass));
  assert.equal(report.rapidSwitch.deterministic, true);
  assert.ok(report.scenarios.some((item) => item.id === "W0_BALANCED_DEFAULT"));
});


test("workforce allocator lab compares category-aware candidates against flat priority", () => {
  const report = runWorkforceAllocatorLab();
  console.log("DEVSIM_WORKFORCE_ALLOCATOR_LAB", JSON.stringify(report));

  assert.ok(report.results.length > 0);
  assert.equal(
    report.algorithmSummary.current_flat_priority.balanced.byCategory.education ?? 0,
    0,
  );
  assert.ok(
    (report.algorithmSummary.tiered_category_round_robin.balanced.byCategory.education ?? 0) > 0,
  );
  assert.equal(
    report.algorithmSummary.tiered_category_round_robin.paused.byCategory.industry ?? 0,
    0,
  );
});


test("category-floor allocator candidate keeps Balanced categories alive without per-building floors", () => {
  const report = runWorkforceAllocatorLab();
  const candidate = report.algorithmSummary.category_floor_then_priority;

  assert.ok(candidate);
  assert.equal(candidate.fail, 0);
  assert.ok((candidate.balanced.byCategory.education ?? 0) > 0);
  assert.ok((candidate.balanced.byCategory.defense ?? 0) > 0);
  assert.equal(candidate.paused.byCategory.industry ?? 0, 0);
});

test("Defense Readiness lab binds Guard deployment to staffed source capacity", async () => {
  const report = await runDefenseReadinessLab(71);
  console.log("DEVSIM_DEFENSE_READINESS_LAB", JSON.stringify(report));

  assert.equal(report.gates.find((gate) => gate.id === "DG1_ZERO_STAFF_NO_GUARDS")?.pass, true);
  assert.equal(report.gates.find((gate) => gate.id === "DG2_HALF_STAFF_PROPORTIONAL")?.pass, true);
  assert.equal(report.gates.find((gate) => gate.id === "DG3_FULL_STAFF_FULL_CAPACITY")?.pass, true);
});

test("candidate W0-W7 uses category-floor allocator and staffed-source readiness in the real engine", async () => {
  const report = await runWorkforceCandidatePolicyPack({ hours: 5, seed: 72 });
  console.log("DEVSIM_WORKFORCE_CANDIDATE", JSON.stringify(report));

  assert.ok(report.modelRevision.includes("category-floor"));
  assert.equal(report.gates.find((gate) => gate.id === "WG5_PAUSED_MEANS_ZERO")?.pass, true);
  assert.equal(report.gates.find((gate) => gate.id === "WG7_OMNI_HIGH_REJECTED")?.pass, true);
});
