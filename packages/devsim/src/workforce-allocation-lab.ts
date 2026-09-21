import {
  loadGameData,
  loadWorkforceAllocatorLabData,
  loadWorkforcePolicyCandidate,
  type WorkforcePriorityLevel,
} from "@evervale/balance-data";
import type { BuildingDefinition } from "@evervale/domain/world.types";
import { compileWorkforceProfile } from "./workforce-policy.js";

export type AllocationAlgorithm =
  | "current_flat_priority"
  | "one_floor_then_priority"
  | "category_floor_then_priority"
  | "tiered_category_round_robin";

interface DemandUnit {
  id: string;
  definition: BuildingDefinition;
  category: string;
  level: WorkforcePriorityLevel;
  effectivePriority: number;
  demand: number;
}

export interface AllocationResult {
  algorithm: AllocationAlgorithm;
  fixture: string;
  profile: string;
  workforce: number;
  assigned: number;
  unassigned: number;
  byBuilding: Record<string, number>;
  byCategory: Record<string, number>;
  unmetByCategory: Record<string, number>;
  outputs: {
    moneyPerCycle: number;
    techPerCycle: number;
    powerPerCycle: number;
    waterPerCycle: number;
    defenseWorkers: number;
  };
}

export interface AllocatorGate {
  id: string;
  algorithm: AllocationAlgorithm;
  pass: boolean;
  detail: string;
}

export interface WorkforceAllocatorLabReport {
  modelRevision: string;
  fixtureVersion: string;
  results: AllocationResult[];
  gates: AllocatorGate[];
  algorithmSummary: Record<AllocationAlgorithm, {
    pass: number;
    fail: number;
    balanced: AllocationResult;
    industry: AllocationResult;
    education: AllocationResult;
    defense: AllocationResult;
    paused: AllocationResult;
  }>;
  recommendation: {
    algorithm: AllocationAlgorithm;
    reason: string;
  };
  caveats: string[];
}

function categoryForJob(jobCategory: string | undefined): string | null {
  if (!jobCategory) return null;
  const policy = loadWorkforcePolicyCandidate();
  const matches = Object.entries(policy.categories)
    .filter(([, category]) => category.job_categories.includes(jobCategory))
    .map(([name]) => name);
  if (matches.length > 1) {
    throw new Error(`AMBIGUOUS_JOB_CATEGORY:${jobCategory}`);
  }
  return matches[0] ?? null;
}

function buildDemandUnits(
  fixtureName: string,
  profileName: string,
): { workforce: number; units: DemandUnit[] } {
  const fixtures = loadWorkforceAllocatorLabData();
  const fixture = fixtures.fixtures[fixtureName];
  if (!fixture) throw new Error(`UNKNOWN_ALLOCATOR_FIXTURE:${fixtureName}`);

  const policy = loadWorkforcePolicyCandidate();
  const profile = compileWorkforceProfile(profileName);
  const gameData = loadGameData();
  const units: DemandUnit[] = [];

  for (const [definitionId, count] of Object.entries(fixture.buildings)) {
    const definition = gameData.definitions.buildings[definitionId];
    if (!definition) throw new Error(`UNKNOWN_ALLOCATOR_BUILDING:${definitionId}`);
    const category = categoryForJob(definition.jobCategory);
    if (!category) continue;
    const level = profile.categoryLevels[category]!;
    const effectivePriority =
      profile.buildingOverrides[definitionId]?.priority ?? definition.priority;

    for (let index = 0; index < count; index += 1) {
      units.push({
        id: `${definitionId}#${index + 1}`,
        definition,
        category,
        level,
        effectivePriority,
        demand: definition.workers,
      });
    }
  }

  return { workforce: fixture.workforce, units };
}

function initAssignment(units: DemandUnit[]): Record<string, number> {
  return Object.fromEntries(units.map((unit) => [unit.id, 0]));
}

function categoryOrder(category: string): number {
  const order = loadWorkforcePolicyCandidate().rules.category_tie_order;
  const index = order.indexOf(category);
  return index >= 0 ? index : order.length;
}

function allocateCurrentFlat(
  workforce: number,
  units: DemandUnit[],
): Record<string, number> {
  const assignment = initAssignment(units);
  let available = workforce;

  const ordered = [...units].sort(
    (a, b) =>
      b.effectivePriority - a.effectivePriority ||
      a.id.localeCompare(b.id),
  );

  for (const unit of ordered) {
    if (available <= 0) break;
    const count = Math.min(available, unit.demand);
    assignment[unit.id] = count;
    available -= count;
  }
  return assignment;
}

function allocateOneFloorThenPriority(
  workforce: number,
  units: DemandUnit[],
): Record<string, number> {
  const assignment = initAssignment(units);
  let available = workforce;
  const active = units
    .filter((unit) => unit.level !== "paused")
    .sort(
      (a, b) =>
        b.effectivePriority - a.effectivePriority ||
        categoryOrder(a.category) - categoryOrder(b.category) ||
        a.id.localeCompare(b.id),
    );

  for (const unit of active) {
    if (available <= 0) break;
    assignment[unit.id] = 1;
    available -= 1;
  }

  for (const unit of active) {
    if (available <= 0) break;
    const missing = unit.demand - assignment[unit.id]!;
    if (missing <= 0) continue;
    const count = Math.min(available, missing);
    assignment[unit.id]! += count;
    available -= count;
  }

  return assignment;
}

function allocateCategoryFloorThenPriority(
  workforce: number,
  units: DemandUnit[],
): Record<string, number> {
  const assignment = initAssignment(units);
  let available = workforce;
  const active = units.filter((unit) => unit.level !== "paused");
  const categories = [...new Set(active.map((unit) => unit.category))]
    .sort((a, b) => categoryOrder(a) - categoryOrder(b) || a.localeCompare(b));

  for (const category of categories) {
    if (available <= 0) break;
    const candidates = active
      .filter((unit) => unit.category === category)
      .sort((a, b) => b.effectivePriority - a.effectivePriority || a.id.localeCompare(b.id));
    const target = candidates[0];
    if (!target) continue;
    assignment[target.id] = 1;
    available -= 1;
  }

  const ordered = [...active].sort(
    (a, b) =>
      b.effectivePriority - a.effectivePriority ||
      categoryOrder(a.category) - categoryOrder(b.category) ||
      a.id.localeCompare(b.id),
  );

  for (const unit of ordered) {
    if (available <= 0) break;
    const missing = unit.demand - (assignment[unit.id] ?? 0);
    if (missing <= 0) continue;
    const count = Math.min(available, missing);
    assignment[unit.id]! += count;
    available -= count;
  }

  return assignment;
}

function allocateTieredCategoryRoundRobin(
  workforce: number,
  units: DemandUnit[],
): Record<string, number> {
  const assignment = initAssignment(units);
  let available = workforce;
  const policy = loadWorkforcePolicyCandidate();

  const active = units.filter((unit) => unit.level !== "paused");
  const categories = [...new Set(active.map((unit) => unit.category))];
  const levelWeight = (category: string): number => {
    const unit = active.find((item) => item.category === category);
    return unit ? policy.semantic_levels[unit.level] : Number.NEGATIVE_INFINITY;
  };

  const levels = [...new Set(categories.map(levelWeight))].sort((a, b) => b - a);

  for (const weight of levels) {
    const sameTierCategories = categories
      .filter((category) => levelWeight(category) === weight)
      .sort((a, b) => categoryOrder(a) - categoryOrder(b) || a.localeCompare(b));

    const unitsByCategory = Object.fromEntries(
      sameTierCategories.map((category) => [
        category,
        active
          .filter((unit) => unit.category === category)
          .sort((a, b) => b.effectivePriority - a.effectivePriority || a.id.localeCompare(b.id)),
      ]),
    ) as Record<string, DemandUnit[]>;

    const cursors = Object.fromEntries(sameTierCategories.map((category) => [category, 0]));

    while (available > 0) {
      let allocatedThisRound = 0;

      for (const category of sameTierCategories) {
        const categoryUnits = unitsByCategory[category] ?? [];
        if (categoryUnits.length === 0) continue;

        let attempts = 0;
        while (attempts < categoryUnits.length) {
          const cursor = cursors[category] ?? 0;
          const unit = categoryUnits[cursor % categoryUnits.length]!;
          cursors[category] = (cursor + 1) % categoryUnits.length;
          attempts += 1;

          if ((assignment[unit.id] ?? 0) >= unit.demand) continue;

          assignment[unit.id]! += 1;
          available -= 1;
          allocatedThisRound += 1;
          break;
        }

        if (available <= 0) break;
      }

      if (allocatedThisRound === 0) break;
    }

    if (available <= 0) break;
  }

  return assignment;
}

function calculateResult(
  algorithm: AllocationAlgorithm,
  fixtureName: string,
  profileName: string,
): AllocationResult {
  const { workforce, units } = buildDemandUnits(fixtureName, profileName);
  const byBuilding =
    algorithm === "current_flat_priority"
      ? allocateCurrentFlat(workforce, units)
      : algorithm === "one_floor_then_priority"
        ? allocateOneFloorThenPriority(workforce, units)
        : algorithm === "category_floor_then_priority"
          ? allocateCategoryFloorThenPriority(workforce, units)
          : allocateTieredCategoryRoundRobin(workforce, units);

  const byCategory: Record<string, number> = {};
  const demandByCategory: Record<string, number> = {};
  let moneyPerCycle = 0;
  let techPerCycle = 0;
  let powerPerCycle = 0;
  let waterPerCycle = 0;

  for (const unit of units) {
    const assigned = byBuilding[unit.id] ?? 0;
    byCategory[unit.category] = (byCategory[unit.category] ?? 0) + assigned;
    demandByCategory[unit.category] =
      (demandByCategory[unit.category] ?? 0) + unit.demand;

    const ratio = unit.demand > 0 ? assigned / unit.demand : 1;
    moneyPerCycle += unit.definition.moneyPerWorker * assigned;
    techPerCycle += unit.definition.techProduction * ratio;
    powerPerCycle += unit.definition.powerProduction * ratio;
    waterPerCycle += unit.definition.waterProduction * ratio;
  }

  const assigned = Object.values(byBuilding).reduce((sum, value) => sum + value, 0);
  const unmetByCategory = Object.fromEntries(
    Object.entries(demandByCategory).map(([category, demand]) => [
      category,
      Math.max(0, demand - (byCategory[category] ?? 0)),
    ]),
  );

  return {
    algorithm,
    fixture: fixtureName,
    profile: profileName,
    workforce,
    assigned,
    unassigned: workforce - assigned,
    byBuilding,
    byCategory,
    unmetByCategory,
    outputs: {
      moneyPerCycle,
      techPerCycle,
      powerPerCycle,
      waterPerCycle,
      defenseWorkers: byCategory.defense ?? 0,
    },
  };
}

export function runWorkforceAllocatorLab(): WorkforceAllocatorLabReport {
  const data = loadWorkforceAllocatorLabData();
  const algorithms = data.algorithms as AllocationAlgorithm[];
  const fixture = "scarcity_12";
  const results: AllocationResult[] = [];

  for (const algorithm of algorithms) {
    for (const profile of data.profiles) {
      results.push(calculateResult(algorithm, fixture, profile));
    }
  }

  const find = (algorithm: AllocationAlgorithm, profile: string): AllocationResult => {
    const result = results.find(
      (item) => item.algorithm === algorithm && item.profile === profile,
    );
    if (!result) throw new Error(`MISSING_ALLOCATOR_RESULT:${algorithm}:${profile}`);
    return result;
  };

  const gates: AllocatorGate[] = [];
  const algorithmSummary = {} as WorkforceAllocatorLabReport["algorithmSummary"];

  for (const algorithm of algorithms) {
    const balanced = find(algorithm, "balanced_default");
    const industry = find(algorithm, "industry_high");
    const education = find(algorithm, "education_high");
    const defense = find(algorithm, "defense_high");
    const paused = find(algorithm, "industry_paused");

    const localGates: AllocatorGate[] = [
      {
        id: "AL_BALANCED_NONZERO",
        algorithm,
        pass: data.acceptance.balanced_requires_nonzero_categories.every(
          (category) => (balanced.byCategory[category] ?? 0) > 0,
        ),
        detail: `Balanced assignments=${JSON.stringify(balanced.byCategory)}.`,
      },
      {
        id: "AL_INDUSTRY_TRADEOFF",
        algorithm,
        pass:
          industry.outputs.moneyPerCycle > balanced.outputs.moneyPerCycle &&
          industry.outputs.techPerCycle <= balanced.outputs.techPerCycle,
        detail:
          `Money balanced=${balanced.outputs.moneyPerCycle.toFixed(1)}, industry=${industry.outputs.moneyPerCycle.toFixed(1)}; Tech balanced=${balanced.outputs.techPerCycle.toFixed(1)}, industry=${industry.outputs.techPerCycle.toFixed(1)}.`,
      },
      {
        id: "AL_EDUCATION_TRADEOFF",
        algorithm,
        pass:
          education.outputs.techPerCycle > balanced.outputs.techPerCycle &&
          education.outputs.moneyPerCycle < balanced.outputs.moneyPerCycle,
        detail:
          `Tech balanced=${balanced.outputs.techPerCycle.toFixed(1)}, education=${education.outputs.techPerCycle.toFixed(1)}; Money balanced=${balanced.outputs.moneyPerCycle.toFixed(1)}, education=${education.outputs.moneyPerCycle.toFixed(1)}.`,
      },
      {
        id: "AL_DEFENSE_TRADEOFF",
        algorithm,
        pass:
          defense.outputs.defenseWorkers > balanced.outputs.defenseWorkers &&
          defense.outputs.moneyPerCycle < balanced.outputs.moneyPerCycle,
        detail:
          `Defense workers balanced=${balanced.outputs.defenseWorkers}, defense=${defense.outputs.defenseWorkers}; Money balanced=${balanced.outputs.moneyPerCycle.toFixed(1)}, defense=${defense.outputs.moneyPerCycle.toFixed(1)}.`,
      },
      {
        id: "AL_PAUSED_ZERO",
        algorithm,
        pass:
          (paused.byCategory[data.acceptance.paused_requires_zero_category] ?? 0) === 0,
        detail:
          `Paused category workers=${paused.byCategory[data.acceptance.paused_requires_zero_category] ?? 0}.`,
      },
    ];

    gates.push(...localGates);
    algorithmSummary[algorithm] = {
      pass: localGates.filter((gate) => gate.pass).length,
      fail: localGates.filter((gate) => !gate.pass).length,
      balanced,
      industry,
      education,
      defense,
      paused,
    };
  }

  const recommendation: WorkforceAllocatorLabReport["recommendation"] = {
    algorithm: "category_floor_then_priority",
    reason:
      "It gives each active category a minimum foothold without granting one guaranteed worker per building, then lets semantic priority decide the remaining scarce Workforce. This preserves a viable Balanced baseline while keeping HIGH meaningful and supports true PAUSED exclusion in the candidate model.",
  };

  return {
    modelRevision: data.model_revision,
    fixtureVersion: data.version,
    results,
    gates,
    algorithmSummary,
    recommendation,
    caveats: [
      "This is a one-step allocator laboratory, not a replacement long-run economy simulator.",
      "Defense workers are measured as staffing only; current runtime combat effectiveness does not yet depend enough on Defense staffing/readiness.",
      "The recommended algorithm must be implemented in the authoritative domain allocator and then re-tested through full DevSim W0-W7 before becoming canonical.",
    ],
  };
}
