import { loadAuditBalanceData } from "@evervale/balance-data";
import type { BuildingDefinition } from "@evervale/domain/world.types";
import {
  SimHarness,
  type SimActionResult,
  type SimHarnessOptions,
  type SimSample,
} from "./core.js";

export type ScenarioId =
  | "starter_idle"
  | "healthy_planner"
  | "economy_rush"
  | "tech_rush"
  | "defense_rush"
  | "overexpand"
  | "combat_recovery";

export interface ScenarioDefinition {
  id: ScenarioId;
  description: string;
  buildPlan: string[];
  triggerWaveAtSeconds?: number;
  autoRepair?: boolean;
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  starter_idle: {
    id: "starter_idle",
    description: "No player construction. Measures passive plateau and accidental auto-win.",
    buildPlan: [],
  },
  healthy_planner: {
    id: "healthy_planner",
    description: "Balanced early plan: growth, Tech, recreation and basic defense.",
    buildPlan: ["house_small", "school", "park", "guard_post"],
  },
  economy_rush: {
    id: "economy_rush",
    description: "Prioritizes Money workplaces before civic/defense systems.",
    buildPlan: ["house_small", "workshop", "house_small", "workshop", "school", "guard_post"],
  },
  tech_rush: {
    id: "tech_rush",
    description: "Prioritizes School investment and enough Housing to feed Workforce.",
    buildPlan: ["house_small", "school", "house_small", "school", "park", "guard_post"],
  },
  defense_rush: {
    id: "defense_rush",
    description: "Pays the early defense tax before expanding Money output.",
    buildPlan: ["house_small", "guard_post", "house_small", "school", "park", "workshop"],
  },
  overexpand: {
    id: "overexpand",
    description: "Builds services/income aggressively before utility/workforce reinforcement.",
    buildPlan: [
      "house_small",
      "school",
      "park",
      "restaurant",
      "house_small",
      "school",
      "park",
      "restaurant",
      "guard_post",
    ],
  },
  combat_recovery: {
    id: "combat_recovery",
    description: "Balanced town followed by an authoritative M1 threat and automatic repair authorization.",
    buildPlan: ["house_small", "school", "park", "guard_post"],
    triggerWaveAtSeconds: 2 * 60 * 60,
    autoRepair: true,
  },
};

export interface ScenarioRunOptions {
  scenarioId: ScenarioId;
  hours: number;
  seed?: number;
  stepSeconds?: number;
  buildingOverrides?: Record<string, Partial<BuildingDefinition>>;
  includeSeries?: boolean;
}

export interface ScenarioMilestones {
  firstAcceptedBuildSeconds: number | null;
  firstPopulationGrowthSeconds: number | null;
  tier1Seconds: number | null;
  firstTreasuryPressureSeconds: number | null;
  firstPowerPressureSeconds: number | null;
  firstWaterPressureSeconds: number | null;
  firstCombatResolutionSeconds: number | null;
}

export interface ScenarioDiagnostic {
  code: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  firstAtSeconds: number;
  detail: string;
}

export interface ScenarioLedger {
  estimatedMoneyIncome: number;
  estimatedUpkeep: number;
  constructionSpend: number;
  repairSpend: number;
  observedMoneyDelta: number;
  timeAtMoneyCapSeconds: number;
  timeAtPowerZeroSeconds: number;
  timeAtWaterZeroSeconds: number;
  workforceSaturatedSeconds: number;
  schoolZeroStaffSeconds: number;
}

export interface ScenarioReport {
  provenance: {
    balanceVersion: string;
    simulationDataVersion: string;
    techDataVersion: string;
    scenarioPolicyVersion: string;
    sourceRevision: string;
  };
  scenarioId: ScenarioId;
  description: string;
  seed: number;
  requestedHours: number;
  stepSeconds: number;
  balanceOverrides: Record<string, Partial<BuildingDefinition>>;
  initial: SimSample;
  final: SimSample;
  milestones: ScenarioMilestones;
  diagnostics: ScenarioDiagnostic[];
  actions: SimActionResult[];
  ledger: ScenarioLedger;
  plan: {
    requested: string[];
    acceptedCount: number;
    nextBuilding: string | null;
  };
  series?: SimSample[];
}

function staffingByDefinition(sampleWorld: Awaited<ReturnType<SimHarness["world"]>>, id: string): number {
  return sampleWorld.buildings
    .filter((building) => building.definitionId === id && building.constructionState === "COMPLETE")
    .reduce((sum, building) => sum + building.workersAssigned, 0);
}

function pushOnce(
  diagnostics: ScenarioDiagnostic[],
  code: string,
  severity: ScenarioDiagnostic["severity"],
  firstAtSeconds: number,
  detail: string,
): void {
  if (diagnostics.some((item) => item.code === code)) return;
  diagnostics.push({ code, severity, firstAtSeconds, detail });
}

export async function runScenario(options: ScenarioRunOptions): Promise<ScenarioReport> {
  const definition = SCENARIOS[options.scenarioId];
  const auditBalance = loadAuditBalanceData();
  const stepSeconds = options.stepSeconds ?? 60;
  if (!Number.isFinite(options.hours) || options.hours <= 0) throw new Error("INVALID_HOURS");
  if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) throw new Error("INVALID_STEP_SECONDS");

  const harnessOptions: SimHarnessOptions = {
    seed: options.seed ?? 1,
    ...(options.buildingOverrides ? { buildingOverrides: options.buildingOverrides } : {}),
  };
  const harness = new SimHarness(harnessOptions);
  let world = await harness.initialize();
  const initial = harness.sample(world);
  const initialMoney = world.resources.money;
  const initialPopulation = world.society.population;

  const milestones: ScenarioMilestones = {
    firstAcceptedBuildSeconds: null,
    firstPopulationGrowthSeconds: null,
    tier1Seconds: null,
    firstTreasuryPressureSeconds: null,
    firstPowerPressureSeconds: null,
    firstWaterPressureSeconds: null,
    firstCombatResolutionSeconds: null,
  };

  const diagnostics: ScenarioDiagnostic[] = [];
  const series: SimSample[] = [initial];
  let planIndex = 0;
  let nextDecisionAt = 0;
  let waveTriggered = false;
  let estimatedMoneyIncome = 0;
  let estimatedUpkeep = 0;
  let timeAtMoneyCapSeconds = 0;
  let timeAtPowerZeroSeconds = 0;
  let timeAtWaterZeroSeconds = 0;
  let workforceSaturatedSeconds = 0;
  let schoolZeroStaffSeconds = 0;
  let lastSchoolZeroStartedAt: number | null = null;
  let lastNoMoneyStartedAt: number | null = null;

  const horizonSeconds = options.hours * 60 * 60;

  for (let elapsed = 0; elapsed < horizonSeconds; elapsed += stepSeconds) {
    world = await harness.world();

    const hasConstruction = world.buildings.some(
      (building) => building.constructionState === "BUILDING",
    );

    if (!hasConstruction && planIndex < definition.buildPlan.length && elapsed >= nextDecisionAt) {
      const buildingId = definition.buildPlan[planIndex]!;
      const action = await harness.placeBuilding(buildingId);
      if (action.accepted) {
        planIndex += 1;
        lastNoMoneyStartedAt = null;
        milestones.firstAcceptedBuildSeconds ??= elapsed;
      } else {
        if (action.error === "NOT_ENOUGH_MONEY") {
          lastNoMoneyStartedAt ??= elapsed;
        }
        if (action.error === "TECH_LOCKED") {
          pushOnce(
            diagnostics,
            "PLAN_TECH_BLOCKED",
            "INFO",
            elapsed,
            `Plan is waiting for Tech before ${buildingId} can be built.`,
          );
        }
        if (action.error === "NO_VALID_PLACEMENT") {
          pushOnce(
            diagnostics,
            "PLAN_PLACEMENT_EXHAUSTED",
            "CRITICAL",
            elapsed,
            `No legal starter-road placement found for ${buildingId}.`,
          );
          nextDecisionAt = Number.POSITIVE_INFINITY;
        } else {
          nextDecisionAt = elapsed + harness.definitions.referenceCycleSeconds;
        }
      }
    }

    if (
      definition.triggerWaveAtSeconds !== undefined &&
      !waveTriggered &&
      elapsed >= definition.triggerWaveAtSeconds
    ) {
      const action = await harness.triggerWave();
      if (action.accepted) waveTriggered = true;
    }

    if (definition.autoRepair) {
      const damaged = world.buildings.find(
        (building) =>
          building.damageState === "DAMAGED" ||
          building.damageState === "DISABLED",
      );
      if (damaged) {
        await harness.repairBuilding(damaged.id);
      }
    }

    world = await harness.advance(Math.min(stepSeconds, horizonSeconds - elapsed));
    const sample = harness.sample(world);
    const cycleFraction = stepSeconds / harness.definitions.referenceCycleSeconds;
    estimatedMoneyIncome += sample.moneyFlow.grossIncomePerCycle * cycleFraction;
    estimatedUpkeep += sample.moneyFlow.upkeepPerCycle * cycleFraction;

    if (sample.money >= sample.moneyCap - 0.001) timeAtMoneyCapSeconds += stepSeconds;
    if (sample.power <= 0.001) timeAtPowerZeroSeconds += stepSeconds;
    if (sample.water <= 0.001) timeAtWaterZeroSeconds += stepSeconds;
    if (sample.workforce > 0 && sample.assignedWorkers >= sample.workforce) {
      workforceSaturatedSeconds += stepSeconds;
    }

    const schoolStaff = staffingByDefinition(world, "school");
    const completedSchoolCount = world.buildings.filter(
      (building) =>
        building.definitionId === "school" &&
        building.constructionState === "COMPLETE" &&
        building.damageState !== "DISABLED",
    ).length;

    if (completedSchoolCount > 0 && schoolStaff === 0) {
      schoolZeroStaffSeconds += stepSeconds;
      lastSchoolZeroStartedAt ??= elapsed;
      if (elapsed - lastSchoolZeroStartedAt >= 60 * 60) {
        pushOnce(
          diagnostics,
          "TECH_STARVATION",
          "WARNING",
          lastSchoolZeroStartedAt,
          "A completed School has remained at zero workers for at least one real hour.",
        );
      }
    } else {
      lastSchoolZeroStartedAt = null;
    }

    if (
      lastNoMoneyStartedAt !== null &&
      sample.moneyFlow.netPerCycle <= 0 &&
      elapsed - lastNoMoneyStartedAt >= 60 * 60
    ) {
      pushOnce(
        diagnostics,
        "TREASURY_SOFTLOCK_CANDIDATE",
        "CRITICAL",
        lastNoMoneyStartedAt,
        "The plan is blocked by Money and the current authoritative Money flow is non-positive.",
      );
    }

    if (
      sample.workforce > 0 &&
      sample.assignedWorkers >= sample.workforce &&
      workforceSaturatedSeconds >= 60 * 60
    ) {
      pushOnce(
        diagnostics,
        "WORKFORCE_SATURATION",
        "INFO",
        elapsed - 60 * 60,
        "All available Workforce has been continuously assigned for at least one real hour.",
      );
    }

    if (sample.population > initialPopulation) {
      milestones.firstPopulationGrowthSeconds ??= elapsed + stepSeconds;
    }
    if (sample.techTier >= 1) {
      milestones.tier1Seconds ??= elapsed + stepSeconds;
    }
    if (sample.money <= sample.moneyCap * 0.1) {
      milestones.firstTreasuryPressureSeconds ??= elapsed + stepSeconds;
    }
    if (sample.power <= sample.powerCap * 0.25) {
      milestones.firstPowerPressureSeconds ??= elapsed + stepSeconds;
    }
    if (sample.water <= sample.waterCap * 0.25) {
      milestones.firstWaterPressureSeconds ??= elapsed + stepSeconds;
    }
    if (world.combat?.status === "RESOLVED") {
      milestones.firstCombatResolutionSeconds ??= elapsed + stepSeconds;
    }

    if (options.includeSeries && ((elapsed + stepSeconds) % 600 === 0 || elapsed + stepSeconds >= horizonSeconds)) {
      series.push(sample);
    }
  }

  world = await harness.world();
  const final = harness.sample(world);
  const constructionSpend = harness.actions
    .filter((action) => action.accepted && action.type === "PLACE_BUILDING")
    .reduce((sum, action) => sum + Math.max(0, -action.moneyDelta), 0);
  const repairSpend = harness.actions
    .filter((action) => action.accepted && action.type === "REPAIR_BUILDING")
    .reduce((sum, action) => sum + Math.max(0, -action.moneyDelta), 0);

  const report: ScenarioReport = {
    provenance: {
      balanceVersion: auditBalance.buildingBalance.version,
      simulationDataVersion: auditBalance.simulation.version,
      techDataVersion: auditBalance.tech.version,
      scenarioPolicyVersion: "0.1",
      sourceRevision: process.env.GITHUB_SHA ?? "working-tree",
    },
    scenarioId: definition.id,
    description: definition.description,
    seed: harness.seed,
    requestedHours: options.hours,
    stepSeconds,
    balanceOverrides: options.buildingOverrides ?? {},
    initial,
    final,
    milestones,
    diagnostics,
    actions: harness.actions,
    ledger: {
      estimatedMoneyIncome,
      estimatedUpkeep,
      constructionSpend,
      repairSpend,
      observedMoneyDelta: final.money - initialMoney,
      timeAtMoneyCapSeconds,
      timeAtPowerZeroSeconds,
      timeAtWaterZeroSeconds,
      workforceSaturatedSeconds,
      schoolZeroStaffSeconds,
    },
    plan: {
      requested: definition.buildPlan,
      acceptedCount: planIndex,
      nextBuilding: definition.buildPlan[planIndex] ?? null,
    },
  };

  if (options.includeSeries) report.series = series;
  return report;
}
