import { runScenario, type ScenarioId, type ScenarioReport } from "./scenarios.js";

export interface StrategicMetricRow {
  scenarioId: ScenarioId;
  money: number;
  population: number;
  techPoints: number;
  tier1Seconds: number | null;
  totalConditionLoss: number;
  damagedBuildings: number;
  disabledBuildings: number;
  workforceSaturatedHours: number;
  schoolZeroStaffHours: number;
  criticalDiagnostics: number;
  acceptedBuilds: number;
}

export interface StrategicDirectionalGate {
  id: string;
  pass: boolean;
  detail: string;
}

export interface StrategicPathPackReport {
  model: "BUILD_ORDER_AND_JOB_PRIORITY_ONLY";
  hours: number;
  strongHours: number;
  longHours: number;
  seed: number;
  metrics: StrategicMetricRow[];
  longHorizonMetrics: StrategicMetricRow[];
  leaderboards: {
    money: ScenarioId[];
    tech: ScenarioId[];
    population: ScenarioId[];
    populationLongHorizon: ScenarioId[];
    defense: ScenarioId[];
  };
  directionalGates: StrategicDirectionalGate[];
  unresolvedDesignLimits: string[];
  reports: ScenarioReport[];
  longHorizonReports: ScenarioReport[];
}

const PURE_PATHS: ScenarioId[] = [
  "pure_industrial",
  "pure_scholar",
  "pure_civic",
  "pure_fortress",
];

const PACK_SCENARIOS: ScenarioId[] = [
  ...PURE_PATHS,
  "balanced_hybrid",
  "omni_build",
  "pivot_industrial_to_fortress",
];

function metric(report: ScenarioReport): StrategicMetricRow {
  return {
    scenarioId: report.scenarioId,
    money: report.final.money,
    population: report.final.population,
    techPoints: report.final.techPoints,
    tier1Seconds: report.milestones.tier1Seconds,
    totalConditionLoss: report.combatSummary.totalConditionLoss,
    damagedBuildings: report.combatSummary.damagedBuildings,
    disabledBuildings: report.combatSummary.disabledBuildings,
    workforceSaturatedHours: report.ledger.workforceSaturatedSeconds / 3600,
    schoolZeroStaffHours: report.ledger.schoolZeroStaffSeconds / 3600,
    criticalDiagnostics: report.diagnostics.filter((item) => item.severity === "CRITICAL").length,
    acceptedBuilds: report.plan.acceptedCount,
  };
}

const tier1SortValue = (row: StrategicMetricRow): number =>
  row.tier1Seconds ?? Number.POSITIVE_INFINITY;

export async function runStrategicPathPack(options: {
  hours?: number;
  strongHours?: number;
  longHours?: number;
  seed?: number;
} = {}): Promise<StrategicPathPackReport> {
  const hours = options.hours ?? 8;
  const strongHours = options.strongHours ?? 12;
  const longHours = options.longHours ?? 12;
  const seed = options.seed ?? 1;

  const reports: ScenarioReport[] = [];
  for (const scenarioId of PACK_SCENARIOS) {
    reports.push(await runScenario({ scenarioId, hours, seed }));
  }
  reports.push(
    await runScenario({
      scenarioId: "strong_multipath",
      hours: strongHours,
      seed,
    }),
  );

  const longHorizonReports: ScenarioReport[] = [];
  for (const scenarioId of PURE_PATHS) {
    longHorizonReports.push(
      await runScenario({
        scenarioId,
        hours: longHours,
        seed,
      }),
    );
  }

  const metrics = reports.map(metric);
  const longHorizonMetrics = longHorizonReports.map(metric);
  const pure = metrics.filter((row) => PURE_PATHS.includes(row.scenarioId));

  const money = [...pure]
    .sort((a, b) => b.money - a.money)
    .map((row) => row.scenarioId);
  const tech = [...pure]
    .sort((a, b) => tier1SortValue(a) - tier1SortValue(b) || b.techPoints - a.techPoints)
    .map((row) => row.scenarioId);
  const population = [...pure]
    .sort((a, b) => b.population - a.population)
    .map((row) => row.scenarioId);
  const populationLongHorizon = [...longHorizonMetrics]
    .sort((a, b) => b.population - a.population)
    .map((row) => row.scenarioId);
  const defense = [...pure]
    .sort(
      (a, b) =>
        a.totalConditionLoss - b.totalConditionLoss ||
        a.disabledBuildings - b.disabledBuildings ||
        a.damagedBuildings - b.damagedBuildings,
    )
    .map((row) => row.scenarioId);

  const byId = Object.fromEntries(metrics.map((row) => [row.scenarioId, row])) as Partial<
    Record<ScenarioId, StrategicMetricRow>
  >;
  const industrial = byId.pure_industrial!;
  const scholar = byId.pure_scholar!;
  const hybrid = byId.balanced_hybrid!;
  const omni = byId.omni_build!;
  const pivot = byId.pivot_industrial_to_fortress!;

  const pureLeaders = new Map<ScenarioId, number>();
  for (const winner of [money[0], tech[0], populationLongHorizon[0], defense[0]]) {
    if (!winner) continue;
    pureLeaders.set(winner, (pureLeaders.get(winner) ?? 0) + 1);
  }

  const bestTier1 = Math.min(...pure.map((row) => tier1SortValue(row)));
  const bestDamage = Math.min(...pure.map((row) => row.totalConditionLoss));
  const omniNearBestCount =
    Number(omni.money >= Math.max(...pure.map((row) => row.money)) * 0.95) +
    Number(omni.population >= Math.max(...pure.map((row) => row.population)) * 0.95) +
    Number(Number.isFinite(bestTier1) && tier1SortValue(omni) <= bestTier1 * 1.05) +
    Number(omni.totalConditionLoss <= bestDamage * 1.05);

  const pivotReport = reports.find(
    (report) => report.scenarioId === "pivot_industrial_to_fortress",
  )!;

  const directionalGates: StrategicDirectionalGate[] = [
    {
      id: "G1_INDUSTRIAL_IDENTITY",
      pass: money[0] === "pure_industrial",
      detail: "Money leaderboard: " + money.join(" > ") + ".",
    },
    {
      id: "G2_SCHOLAR_IDENTITY",
      pass: tech[0] === "pure_scholar",
      detail: "Tech leaderboard: " + tech.join(" > ") + ".",
    },
    {
      id: "G3_CIVIC_IDENTITY",
      pass: populationLongHorizon[0] === "pure_civic",
      detail:
        "Population leaderboard at " +
        longHours +
        "h: " +
        populationLongHorizon.join(" > ") +
        ".",
    },
    {
      id: "G4_FORTRESS_IDENTITY",
      pass: defense[0] === "pure_fortress",
      detail: "Defense/damage leaderboard: " + defense.join(" > ") + ".",
    },
    {
      id: "G5_SACRIFICE",
      pass: [...pureLeaders.values()].every((count) => count < 4),
      detail: "Pure-path metric wins: " + JSON.stringify(Object.fromEntries(pureLeaders)) + ".",
    },
    {
      id: "G6_OMNI_PENALTY",
      pass: omniNearBestCount < 3,
      detail:
        "Omni Build is within 5% of the best pure path on " +
        omniNearBestCount +
        "/4 signature metrics.",
    },
    {
      id: "G7_HYBRID_VALIDITY",
      pass: hybrid.criticalDiagnostics === 0 && hybrid.money >= 0,
      detail:
        "Hybrid critical diagnostics=" +
        hybrid.criticalDiagnostics +
        ", final Money=" +
        hybrid.money.toFixed(1) +
        ".",
    },
    {
      id: "G8_PIVOT_VIABILITY",
      pass:
        pivot.criticalDiagnostics === 0 &&
        pivotReport.strategicPolicy.transitionsApplied.includes(
          "INDUSTRIAL_TO_FORTRESS",
        ),
      detail:
        "Pivot transitions=" +
        (pivotReport.strategicPolicy.transitionsApplied.join(",") || "none") +
        ", critical diagnostics=" +
        pivot.criticalDiagnostics +
        ".",
    },
    {
      id: "G9_PIVOT_COST",
      pass:
        pivot.money < industrial.money ||
        tier1SortValue(pivot) > tier1SortValue(scholar),
      detail:
        "Directional probe only: pivot should not instantly equal the best specialist on every relevant metric.",
    },
    {
      id: "G10_NO_DOMINANT_PATH",
      pass: Math.max(0, ...pureLeaders.values()) <= 2,
      detail:
        "Maximum signature-metric wins by one pure path=" +
        Math.max(0, ...pureLeaders.values()) +
        ".",
    },
  ];

  return {
    model: "BUILD_ORDER_AND_JOB_PRIORITY_ONLY",
    hours,
    strongHours,
    longHours,
    seed,
    metrics,
    longHorizonMetrics,
    leaderboards: {
      money,
      tech,
      population,
      populationLongHorizon,
      defense,
    },
    directionalGates,
    unresolvedDesignLimits: [
      "Settlement Charter bonuses do not exist in runtime and are intentionally not simulated.",
      "Funding-failure priorities are not yet implemented as a complete authoritative loop.",
      "PvE rewards are not yet part of the authoritative economy, so Fortress ROI is incomplete.",
      "Utility shortages mainly feed Happiness in the current M1 runtime; full operational throttling is not yet complete.",
      "These directional gates diagnose current identity; they are not canonical balance thresholds.",
    ],
    reports,
    longHorizonReports,
  };
}
