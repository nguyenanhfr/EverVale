import {
  buildAuthorityDriftReport,
  buildDependencyGraph,
  buildRoiReport,
  runAuthorityTamperProbe,
} from "./reports.js";
import {
  SCENARIOS,
  runScenario,
  type ScenarioId,
  type ScenarioReport,
} from "./scenarios.js";
import type { BuildingDefinition } from "@evervale/domain/world.types";
import { runStrategicPathPack } from "./strategic-paths.js";
import { runWorkforcePolicyPack } from "./workforce-policy.js";

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function numberFlag(args: string[], name: string, fallback: number): number {
  const raw = flag(args, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`INVALID_${name.replaceAll("-", "").toUpperCase()}`);
  return value;
}

function assertScenario(value: string | undefined): ScenarioId {
  if (!value || !(value in SCENARIOS)) {
    throw new Error(`UNKNOWN_SCENARIO:${value ?? ""}`);
  }
  return value as ScenarioId;
}

function compact(report: ScenarioReport): Record<string, unknown> {
  return {
    provenance: report.provenance,
    scenario: report.scenarioId,
    hours: report.requestedHours,
    seed: report.seed,
    final: {
      money: Number(report.final.money.toFixed(1)),
      power: Number(report.final.power.toFixed(1)),
      water: Number(report.final.water.toFixed(1)),
      population: report.final.population,
      housing: report.final.housing,
      happiness: Number(report.final.happiness.toFixed(1)),
      workforce: report.final.workforce,
      assignedWorkers: report.final.assignedWorkers,
      techPoints: Number(report.final.techPoints.toFixed(1)),
      techTier: report.final.techTier,
      completedBuildings: report.final.completedBuildings,
    },
    milestones: report.milestones,
    plan: report.plan,
    ledger: {
      estimatedMoneyIncome: Number(report.ledger.estimatedMoneyIncome.toFixed(1)),
      estimatedUpkeep: Number(report.ledger.estimatedUpkeep.toFixed(1)),
      constructionSpend: Number(report.ledger.constructionSpend.toFixed(1)),
      repairSpend: Number(report.ledger.repairSpend.toFixed(1)),
      observedMoneyDelta: Number(report.ledger.observedMoneyDelta.toFixed(1)),
      workforceSaturatedHours: Number((report.ledger.workforceSaturatedSeconds / 3600).toFixed(2)),
      schoolZeroStaffHours: Number((report.ledger.schoolZeroStaffSeconds / 3600).toFixed(2)),
      powerZeroHours: Number((report.ledger.timeAtPowerZeroSeconds / 3600).toFixed(2)),
      waterZeroHours: Number((report.ledger.timeAtWaterZeroSeconds / 3600).toFixed(2)),
    },
    strategicPolicy: report.strategicPolicy,
    combatSummary: report.combatSummary,
    diagnostics: report.diagnostics,
  };
}

const SWEEPABLE_FIELDS = new Set<keyof BuildingDefinition>([
  "moneyCost",
  "varumCost",
  "buildCycles",
  "workers",
  "priority",
  "moneyPerWorker",
  "powerProduction",
  "powerUse",
  "waterProduction",
  "waterUse",
  "varumProduction",
  "techProduction",
  "upkeep",
  "housingAdd",
  "educationCoverageAdd",
  "recreationCoverageAdd",
  "safetyAdd",
]);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? "help";

  if (command === "scenario") {
    const scenarioId = assertScenario(args[1]);
    const hours = numberFlag(args, "--hours", 8);
    const seed = numberFlag(args, "--seed", 1);
    const report = await runScenario({
      scenarioId,
      hours,
      seed,
      includeSeries: hasFlag(args, "--series"),
    });
    console.log(JSON.stringify(hasFlag(args, "--full") ? report : compact(report), null, 2));
    return;
  }

  if (command === "baseline") {
    const hours = numberFlag(args, "--hours", 8);
    const seed = numberFlag(args, "--seed", 1);
    const ids: ScenarioId[] = [
      "starter_idle",
      "healthy_planner",
      "economy_rush",
      "tech_rush",
      "defense_rush",
      "overexpand",
    ];
    const reports = [];
    for (const scenarioId of ids) {
      reports.push(compact(await runScenario({ scenarioId, hours, seed })));
    }
    console.log(JSON.stringify(reports, null, 2));
    return;
  }

  if (command === "paths") {
    const hours = numberFlag(args, "--hours", 8);
    const strongHours = numberFlag(args, "--strong-hours", 12);
    const longHours = numberFlag(args, "--long-hours", 12);
    const seed = numberFlag(args, "--seed", 1);
    const report = await runStrategicPathPack({ hours, strongHours, longHours, seed });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (command === "workforce") {
    const hours = numberFlag(args, "--hours", 8);
    const seed = numberFlag(args, "--seed", 1);
    const report = await runWorkforcePolicyPack({ hours, seed });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (command === "roi") {
    console.log(JSON.stringify(await buildRoiReport(), null, 2));
    return;
  }

  if (command === "graph") {
    console.log(JSON.stringify(buildDependencyGraph(), null, 2));
    return;
  }

  if (command === "authority-test") {
    const [tamper, drift] = await Promise.all([
      runAuthorityTamperProbe(),
      buildAuthorityDriftReport(),
    ]);
    console.log(JSON.stringify({ tamper, drift }, null, 2));
    if (!tamper.pass) process.exitCode = 1;
    return;
  }

  if (command === "sweep") {
    const buildingId = args[1];
    const field = args[2] as keyof BuildingDefinition | undefined;
    const valuesRaw = args[3];
    if (!buildingId || !field || !valuesRaw || !SWEEPABLE_FIELDS.has(field)) {
      throw new Error("USAGE: sweep <buildingId> <numericField> <v1,v2,...> [--scenario id] [--hours n]");
    }
    const values = valuesRaw.split(",").map(Number);
    if (values.some((value) => !Number.isFinite(value))) throw new Error("INVALID_SWEEP_VALUES");
    const scenarioId = assertScenario(flag(args, "--scenario") ?? "healthy_planner");
    const hours = numberFlag(args, "--hours", 8);
    const seed = numberFlag(args, "--seed", 1);
    const rows = [];
    for (const value of values) {
      const override = { [field]: value } as Partial<BuildingDefinition>;
      const report = await runScenario({
        scenarioId,
        hours,
        seed,
        buildingOverrides: { [buildingId]: override },
      });
      rows.push({ value, result: compact(report) });
    }
    console.log(JSON.stringify({ buildingId, field, scenarioId, hours, rows }, null, 2));
    return;
  }

  if (command === "smoke") {
    const tamper = await runAuthorityTamperProbe();
    const idle = await runScenario({ scenarioId: "starter_idle", hours: 0.5, seed: 7 });
    const healthy = await runScenario({ scenarioId: "healthy_planner", hours: 0.5, seed: 7 });
    const pass =
      tamper.pass &&
      idle.ledger.constructionSpend === 0 &&
      healthy.ledger.constructionSpend > 0 &&
      healthy.actions.some((action) => action.accepted && action.type === "PLACE_BUILDING");
    console.log(JSON.stringify({
      pass,
      tamper,
      idle: compact(idle),
      healthy: compact(healthy),
    }, null, 2));
    if (!pass) process.exitCode = 1;
    return;
  }

  console.log([
    "EverVale DevSim v2",
    "",
    "Commands:",
    "  scenario <id> [--hours 8] [--seed 1] [--series] [--full]",
    "  baseline [--hours 8] [--seed 1]",
    "  paths [--hours 8] [--long-hours 12] [--strong-hours 12] [--seed 1]",
    "  workforce [--hours 8] [--seed 1]",
    "  roi",
    "  graph",
    "  authority-test",
    "  sweep <buildingId> <numericField> <v1,v2,...> [--scenario id] [--hours n]",
    "  smoke",
    "",
    `Scenarios: ${Object.keys(SCENARIOS).join(", ")}`,
  ].join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
