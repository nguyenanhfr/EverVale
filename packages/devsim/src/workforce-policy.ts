import {
  loadGameData,
  loadWorkforcePolicyCandidate,
  type WorkforcePolicyCandidate,
  type WorkforcePriorityLevel,
} from "@evervale/balance-data";
import type { BuildingDefinition } from "@evervale/domain/world.types";
import {
  runScenario,
  type ScenarioPolicyTransition,
  type ScenarioReport,
} from "./scenarios.js";
import type { SimSample } from "./core.js";

export interface CompiledWorkforceProfile {
  profileName: string;
  categoryLevels: Record<string, WorkforcePriorityLevel>;
  buildingOverrides: Record<string, Partial<BuildingDefinition>>;
}

export interface WorkforceGate {
  id: string;
  pass: boolean;
  detail: string;
}

export interface WorkforceScenarioResult {
  id: string;
  profile: string;
  money: number;
  techPoints: number;
  tier1Seconds: number | null;
  population: number;
  schoolZeroStaffHours: number;
  criticalDiagnostics: number;
  finalCategoryWorkers: Record<string, number>;
  finalCategoryUnmet: Record<string, number>;
  combatConditionLoss: number;
}

export interface WorkforcePolicyPackReport {
  modelRevision: string;
  policyVersion: string;
  seed: number;
  hours: number;
  scenarios: WorkforceScenarioResult[];
  gates: WorkforceGate[];
  emergency: {
    recoverySeconds: number | null;
    beforeUtilityWorkers: number;
    emergencyUtilityWorkers: number;
    finalPower: number;
    finalWater: number;
  };
  rapidSwitch: {
    deterministic: boolean;
    transitionsApplied: number;
    expectedTransitions: number;
  };
  omniHigh: {
    rejected: boolean;
    error: string | null;
  };
  unresolvedRuntimeCapabilities: string[];
  reports: Record<string, ScenarioReport>;
}

type CompileOptions = {
  allowCritical?: boolean;
  highSlotLimit?: number;
};

const profileError = (code: string): never => {
  throw new Error(code);
};

function categoryForJob(
  policy: WorkforcePolicyCandidate,
  jobCategory: string | undefined,
): string | null {
  if (!jobCategory) return null;
  const matches = Object.entries(policy.categories)
    .filter(([, definition]) => definition.job_categories.includes(jobCategory))
    .map(([category]) => category);

  if (matches.length > 1) {
    profileError(`WORKFORCE_CATEGORY_AMBIGUOUS:${jobCategory}`);
  }
  return matches[0] ?? null;
}

function mergedLevels(
  policy: WorkforcePolicyCandidate,
  requested: Record<string, WorkforcePriorityLevel>,
): Record<string, WorkforcePriorityLevel> {
  const levels: Record<string, WorkforcePriorityLevel> = {};
  for (const [category, definition] of Object.entries(policy.categories)) {
    levels[category] = requested[category] ?? definition.default_level;
  }

  for (const category of Object.keys(requested)) {
    if (!policy.categories[category]) {
      profileError(`UNKNOWN_WORKFORCE_CATEGORY:${category}`);
    }
  }
  return levels;
}

export function compileWorkforceLevels(
  requested: Record<string, WorkforcePriorityLevel>,
  options: CompileOptions = {},
): CompiledWorkforceProfile {
  const policy = loadWorkforcePolicyCandidate();
  const gameData = loadGameData();
  const categoryLevels = mergedLevels(policy, requested);
  const highSlotLimit = options.highSlotLimit ?? policy.rules.early_high_slots;

  const highCount = Object.values(categoryLevels).filter((level) => level === "high").length;
  if (highCount > highSlotLimit) {
    profileError(`WORKFORCE_HIGH_SLOT_LIMIT:${highCount}>${highSlotLimit}`);
  }

  if (
    policy.rules.critical_reserved_for_emergency &&
    !options.allowCritical &&
    Object.values(categoryLevels).includes("critical")
  ) {
    profileError("WORKFORCE_CRITICAL_RESERVED_FOR_EMERGENCY");
  }

  const buildingOverrides: Record<string, Partial<BuildingDefinition>> = {};
  for (const definition of Object.values(gameData.definitions.buildings)) {
    if (definition.workers <= 0) continue;
    const category = categoryForJob(policy, definition.jobCategory);
    if (!category) continue;
    const level = categoryLevels[category]!;
    const base = policy.semantic_levels[level];
    const local =
      level === "paused"
        ? 0
        : definition.priority * policy.rules.building_local_priority_scale;
    buildingOverrides[definition.id] = {
      priority: base + local,
    };
  }

  return {
    profileName: "custom",
    categoryLevels,
    buildingOverrides,
  };
}

export function compileWorkforceProfile(
  profileName: string,
  options: CompileOptions = {},
): CompiledWorkforceProfile {
  const policy = loadWorkforcePolicyCandidate();
  const profile = policy.profiles[profileName];
  if (!profile) return profileError(`UNKNOWN_WORKFORCE_PROFILE:${profileName}`);
  const compiled = compileWorkforceLevels(profile, options);
  return { ...compiled, profileName };
}

function strategicCategoryWorkers(
  sample: SimSample,
  policy: WorkforcePolicyCandidate,
  strategicCategory: string,
): number {
  const category = policy.categories[strategicCategory];
  if (!category) return 0;
  return category.job_categories.reduce(
    (sum, job) => sum + (sample.workersByJobCategory[job] ?? 0),
    0,
  );
}

function strategicCategoryUnmet(
  sample: SimSample,
  policy: WorkforcePolicyCandidate,
  strategicCategory: string,
): number {
  const category = policy.categories[strategicCategory];
  if (!category) return 0;
  return category.job_categories.reduce(
    (sum, job) => sum + (sample.unmetWorkersByJobCategory[job] ?? 0),
    0,
  );
}

function scenarioSummary(
  id: string,
  profile: string,
  report: ScenarioReport,
  policy: WorkforcePolicyCandidate,
): WorkforceScenarioResult {
  const finalCategoryWorkers = Object.fromEntries(
    Object.keys(policy.categories).map((category) => [
      category,
      strategicCategoryWorkers(report.final, policy, category),
    ]),
  );
  const finalCategoryUnmet = Object.fromEntries(
    Object.keys(policy.categories).map((category) => [
      category,
      strategicCategoryUnmet(report.final, policy, category),
    ]),
  );

  return {
    id,
    profile,
    money: report.final.money,
    techPoints: report.final.techPoints,
    tier1Seconds: report.milestones.tier1Seconds,
    population: report.final.population,
    schoolZeroStaffHours: report.ledger.schoolZeroStaffSeconds / 3600,
    criticalDiagnostics: report.diagnostics.filter((item) => item.severity === "CRITICAL").length,
    finalCategoryWorkers,
    finalCategoryUnmet,
    combatConditionLoss: report.combatSummary.totalConditionLoss,
  };
}

function sampleAtOrBefore(series: SimSample[] | undefined, seconds: number): SimSample | null {
  if (!series?.length) return null;
  let chosen: SimSample | null = null;
  for (const sample of series) {
    if (sample.atSeconds <= seconds) chosen = sample;
  }
  return chosen;
}

function sampleAtOrAfter(series: SimSample[] | undefined, seconds: number): SimSample | null {
  return series?.find((sample) => sample.atSeconds >= seconds) ?? null;
}

function firstUtilityRecovery(
  series: SimSample[] | undefined,
  startSeconds: number,
  ratio: number,
): number | null {
  if (!series) return null;
  for (const sample of series) {
    if (sample.atSeconds < startSeconds) continue;
    if (
      sample.power >= sample.powerCap * ratio &&
      sample.water >= sample.waterCap * ratio
    ) {
      return sample.atSeconds - startSeconds;
    }
  }
  return null;
}

function makeRapidTransitions(
  count: number,
  intervalSeconds: number,
): ScenarioPolicyTransition[] {
  const transitions: ScenarioPolicyTransition[] = [];
  const industry = compileWorkforceProfile("industry_high").buildingOverrides;
  const education = compileWorkforceProfile("education_high").buildingOverrides;

  for (let index = 0; index < count; index += 1) {
    transitions.push({
      atSeconds: intervalSeconds * (index + 1),
      label: `RAPID_SWITCH_${index + 1}`,
      buildingOverrides: index % 2 === 0 ? industry : education,
    });
  }
  return transitions;
}

export async function runWorkforcePolicyPack(options: {
  seed?: number;
  hours?: number;
} = {}): Promise<WorkforcePolicyPackReport> {
  const policy = loadWorkforcePolicyCandidate();
  const seed = options.seed ?? 1;
  const hours = options.hours ?? policy.devsim.test_hours;
  const buildPlan = policy.devsim.balanced_build_plan;

  const balancedProfile = compileWorkforceProfile("balanced_default");
  const industryProfile = compileWorkforceProfile("industry_high");
  const educationProfile = compileWorkforceProfile("education_high");
  const defenseProfile = compileWorkforceProfile("defense_high");
  const pausedIndustryProfile = compileWorkforceProfile("industry_paused");

  const balanced = await runScenario({
    scenarioId: "healthy_planner",
    hours,
    seed,
    buildPlan,
    buildingOverrides: balancedProfile.buildingOverrides,
  });

  const industry = await runScenario({
    scenarioId: "healthy_planner",
    hours,
    seed,
    buildPlan,
    buildingOverrides: industryProfile.buildingOverrides,
  });

  const education = await runScenario({
    scenarioId: "healthy_planner",
    hours,
    seed,
    buildPlan,
    buildingOverrides: educationProfile.buildingOverrides,
  });

  const defenseBalanced = await runScenario({
    scenarioId: "balanced_hybrid",
    hours,
    seed,
    buildPlan,
    buildingOverrides: balancedProfile.buildingOverrides,
  });

  const defense = await runScenario({
    scenarioId: "balanced_hybrid",
    hours,
    seed,
    buildPlan,
    buildingOverrides: defenseProfile.buildingOverrides,
  });

  const pausedIndustry = await runScenario({
    scenarioId: "healthy_planner",
    hours,
    seed,
    buildPlan,
    buildingOverrides: pausedIndustryProfile.buildingOverrides,
  });

  const emergencyStart = 2 * 60 * 60;
  const emergencyEnd = 3 * 60 * 60;
  const industryLevels = policy.profiles.industry_high!;
  const emergencyLevels = {
    ...industryLevels,
    utilities: policy.emergency.utilities.override_level,
  };
  const emergencyProfile = compileWorkforceLevels(emergencyLevels, {
    allowCritical: true,
  });

  const emergency = await runScenario({
    scenarioId: "healthy_planner",
    hours: Math.max(4, Math.min(hours, 6)),
    seed,
    buildPlan,
    buildingOverrides: industryProfile.buildingOverrides,
    policyTransitions: [
      {
        atSeconds: emergencyStart,
        label: "UTILITY_EMERGENCY_ON",
        buildingOverrides: emergencyProfile.buildingOverrides,
      },
      {
        atSeconds: emergencyEnd,
        label: "UTILITY_EMERGENCY_OFF",
        buildingOverrides: industryProfile.buildingOverrides,
      },
    ],
    resourceTransitions: [
      {
        atSeconds: emergencyStart,
        label: "LOW_UTILITY_RESERVES",
        resources: { power: 5, water: 5 },
      },
    ],
    includeSeries: true,
  });

  const rapidTransitions = makeRapidTransitions(
    policy.gates.rapid_switch_count,
    policy.devsim.rapid_switch_interval_seconds,
  );
  const rapidHours = Math.max(
    4,
    (policy.gates.rapid_switch_count * policy.devsim.rapid_switch_interval_seconds) / 3600 + 1,
  );
  const rapidA = await runScenario({
    scenarioId: "healthy_planner",
    hours: rapidHours,
    seed,
    buildPlan,
    buildingOverrides: balancedProfile.buildingOverrides,
    policyTransitions: rapidTransitions,
  });
  const rapidB = await runScenario({
    scenarioId: "healthy_planner",
    hours: rapidHours,
    seed,
    buildPlan,
    buildingOverrides: balancedProfile.buildingOverrides,
    policyTransitions: rapidTransitions,
  });

  let omniHighError: string | null = null;
  try {
    compileWorkforceProfile("omni_high_invalid");
  } catch (error) {
    omniHighError = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  }

  const scenarios = [
    scenarioSummary("W0_BALANCED_DEFAULT", "balanced_default", balanced, policy),
    scenarioSummary("W1_INDUSTRY_HIGH", "industry_high", industry, policy),
    scenarioSummary("W2_EDUCATION_HIGH", "education_high", education, policy),
    scenarioSummary("W3_DEFENSE_HIGH", "defense_high", defense, policy),
    scenarioSummary("W5_PAUSED_INDUSTRY", "industry_paused", pausedIndustry, policy),
  ];

  const emergencyBefore = sampleAtOrBefore(emergency.series, emergencyStart);
  const emergencyAfter = sampleAtOrAfter(
    emergency.series,
    emergencyStart + policy.devsim.rapid_switch_interval_seconds,
  );
  const beforeUtilityWorkers = emergencyBefore
    ? strategicCategoryWorkers(emergencyBefore, policy, "utilities")
    : 0;
  const emergencyUtilityWorkers = emergencyAfter
    ? strategicCategoryWorkers(emergencyAfter, policy, "utilities")
    : 0;
  const recoverySeconds = firstUtilityRecovery(
    emergency.series,
    emergencyStart,
    policy.emergency.utilities.reserve_ratio_trigger,
  );

  const pausedSummary = scenarios.find((item) => item.id === "W5_PAUSED_INDUSTRY")!;
  const gates: WorkforceGate[] = [
    {
      id: "WG0_BALANCED_DEFAULT",
      pass:
        balanced.ledger.schoolZeroStaffSeconds / 3600 <=
          policy.gates.balanced_school_zero_staff_max_hours &&
        balanced.diagnostics.filter((item) => item.severity === "CRITICAL").length <=
          policy.gates.balanced_critical_diagnostics_max,
      detail:
        `School zero-staff=${(balanced.ledger.schoolZeroStaffSeconds / 3600).toFixed(2)}h; critical diagnostics=${balanced.diagnostics.filter((item) => item.severity === "CRITICAL").length}.`,
    },
    {
      id: "WG1_INDUSTRY_OPPORTUNITY_COST",
      pass:
        industry.final.money >=
          balanced.final.money + policy.gates.opportunity_cost_min_money_difference &&
        industry.final.techPoints <
          balanced.final.techPoints - policy.gates.opportunity_cost_min_tech_difference,
      detail:
        `Money balanced=${balanced.final.money.toFixed(1)}, industry=${industry.final.money.toFixed(1)}; Tech balanced=${balanced.final.techPoints.toFixed(1)}, industry=${industry.final.techPoints.toFixed(1)}.`,
    },
    {
      id: "WG2_EDUCATION_OPPORTUNITY_COST",
      pass:
        education.final.techPoints >=
          balanced.final.techPoints + policy.gates.opportunity_cost_min_tech_difference &&
        education.final.money <
          balanced.final.money - policy.gates.opportunity_cost_min_money_difference,
      detail:
        `Tech balanced=${balanced.final.techPoints.toFixed(1)}, education=${education.final.techPoints.toFixed(1)}; Money balanced=${balanced.final.money.toFixed(1)}, education=${education.final.money.toFixed(1)}.`,
    },
    {
      id: "WG3_DEFENSE_OPPORTUNITY_COST",
      pass:
        defense.combatSummary.totalConditionLoss <
          defenseBalanced.combatSummary.totalConditionLoss &&
        defense.final.money < defenseBalanced.final.money,
      detail:
        `Condition loss balanced=${defenseBalanced.combatSummary.totalConditionLoss}, defense=${defense.combatSummary.totalConditionLoss}; Money balanced=${defenseBalanced.final.money.toFixed(1)}, defense=${defense.final.money.toFixed(1)}.`,
    },
    {
      id: "WG4_UTILITY_EMERGENCY",
      pass:
        emergencyUtilityWorkers >= beforeUtilityWorkers &&
        recoverySeconds !== null &&
        recoverySeconds <= policy.gates.emergency_recovery_max_hours * 3600,
      detail:
        `Utility workers before=${beforeUtilityWorkers}, emergency=${emergencyUtilityWorkers}; recovery=${recoverySeconds === null ? "none" : Math.round(recoverySeconds / 60) + "m"}.`,
    },
    {
      id: "WG5_PAUSED_MEANS_ZERO",
      pass: (pausedSummary.finalCategoryWorkers.industry ?? 0) === 0,
      detail:
        `Industry workers under PAUSED candidate=${pausedSummary.finalCategoryWorkers.industry ?? 0}. A failure proves runtime allocator needs an explicit PAUSED capability rather than a priority sentinel.`,
    },
    {
      id: "WG6_RAPID_SWITCH_DETERMINISTIC",
      pass:
        JSON.stringify(rapidA.final) === JSON.stringify(rapidB.final) &&
        JSON.stringify(rapidA.milestones) === JSON.stringify(rapidB.milestones) &&
        rapidA.strategicPolicy.transitionsApplied.length ===
          policy.gates.rapid_switch_count,
      detail:
        `Transitions applied=${rapidA.strategicPolicy.transitionsApplied.length}/${policy.gates.rapid_switch_count}; deterministic=${JSON.stringify(rapidA.final) === JSON.stringify(rapidB.final)}.`,
    },
    {
      id: "WG7_OMNI_HIGH_REJECTED",
      pass: omniHighError?.startsWith("WORKFORCE_HIGH_SLOT_LIMIT:") ?? false,
      detail: `Omni-HIGH validation result=${omniHighError ?? "accepted"}.`,
    },
  ];

  return {
    modelRevision: policy.model_revision,
    policyVersion: policy.version,
    seed,
    hours,
    scenarios,
    gates,
    emergency: {
      recoverySeconds,
      beforeUtilityWorkers,
      emergencyUtilityWorkers,
      finalPower: emergency.final.power,
      finalWater: emergency.final.water,
    },
    rapidSwitch: {
      deterministic:
        JSON.stringify(rapidA.final) === JSON.stringify(rapidB.final) &&
        JSON.stringify(rapidA.milestones) === JSON.stringify(rapidB.milestones),
      transitionsApplied: rapidA.strategicPolicy.transitionsApplied.length,
      expectedTransitions: policy.gates.rapid_switch_count,
    },
    omniHigh: {
      rejected: omniHighError?.startsWith("WORKFORCE_HIGH_SLOT_LIMIT:") ?? false,
      error: omniHighError,
    },
    unresolvedRuntimeCapabilities: [
      "PAUSED is only approximated by a very low priority in this candidate; the current allocator has no explicit paused-category exclusion.",
      "Critical utility override is simulated as a deterministic DevSim priority transition; runtime policy state/commands do not exist yet.",
      "Player-facing category priorities and focus-slot validation are not implemented in authoritative runtime commands yet.",
      "Funding priority remains separate and is not modeled by this Workforce pack.",
    ],
    reports: {
      balanced,
      industry,
      education,
      defenseBalanced,
      defense,
      pausedIndustry,
      emergency,
      rapidA,
      rapidB,
    },
  };
}
