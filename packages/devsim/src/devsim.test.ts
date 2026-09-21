import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthorityDriftReport, buildRoiReport, runAuthorityTamperProbe } from "./reports.js";
import { runScenario } from "./scenarios.js";

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
