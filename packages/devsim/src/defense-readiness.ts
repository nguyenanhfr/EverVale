import { loadDefenseReadinessCandidate } from "@evervale/balance-data";
import { SimHarness } from "./core.js";

export interface DefenseReadinessCase {
  workersAssigned: number;
  supportedGuardCapacity: number;
  guardActorsDeployed: number;
  outcome: string | null;
  conditionLoss: number;
}

export interface DefenseReadinessLabReport {
  modelRevision: string;
  cases: DefenseReadinessCase[];
  gates: Array<{
    id: string;
    pass: boolean;
    detail: string;
  }>;
}

function totalConditionLoss(before: Map<string, number>, after: Awaited<ReturnType<SimHarness["world"]>>): number {
  let loss = 0;
  for (const building of after.buildings) {
    const previous = before.get(building.id);
    if (previous === undefined) continue;
    loss += Math.max(0, previous - building.condition);
  }
  return loss;
}

async function runCase(workersAssigned: number, seed: number): Promise<DefenseReadinessCase> {
  const readiness = loadDefenseReadinessCandidate();
  const harness = new SimHarness({
    seed,
    defenseReadiness: {
      sourceBuildingDefinitionId: readiness.guard.source_building,
      guardActorDefinitionId: readiness.guard.unit_definition,
      slotsPerSource: readiness.guard.slots_per_source,
    },
  });

  await harness.initialize();
  const placed = await harness.placeBuilding(readiness.guard.source_building);
  if (!placed.accepted) {
    throw new Error(`DEVSIM_GUARD_POST_BUILD_FAILED:${placed.error ?? "UNKNOWN"}`);
  }

  const sourceDefinition = harness.definitions.buildings[readiness.guard.source_building];
  if (!sourceDefinition) throw new Error("DEVSIM_GUARD_SOURCE_DEFINITION_MISSING");

  await harness.advance(
    sourceDefinition.buildCycles * harness.definitions.referenceCycleSeconds + 1,
  );

  const world = await harness.world();
  const source = world.buildings.find(
    (building) =>
      building.definitionId === readiness.guard.source_building &&
      building.constructionState === "COMPLETE",
  );
  if (!source) throw new Error("DEVSIM_GUARD_SOURCE_INSTANCE_MISSING");

  const clampedWorkers = Math.max(0, Math.min(workersAssigned, sourceDefinition.workers));
  harness.repository.replaceForFixture({
    ...world,
    buildings: world.buildings.map((building) =>
      building.id === source.id
        ? { ...building, workersAssigned: clampedWorkers }
        : building,
    ),
  });

  const beforeCombatWorld = await harness.world();
  const beforeConditions = new Map(
    beforeCombatWorld.buildings.map((building) => [building.id, building.condition]),
  );

  const wave = await harness.triggerWave();
  if (!wave.accepted) {
    throw new Error(`DEVSIM_TRIGGER_WAVE_FAILED:${wave.error ?? "UNKNOWN"}`);
  }

  const deployment = harness.defenseDeployments.at(-1);
  if (!deployment) throw new Error("DEVSIM_DEFENSE_DEPLOYMENT_MISSING");

  const resolved = await harness.advance(120);

  return {
    workersAssigned: clampedWorkers,
    supportedGuardCapacity: deployment.supportedGuardCapacity,
    guardActorsDeployed: deployment.guardActorsAfter,
    outcome: resolved.combat?.outcome ?? null,
    conditionLoss: totalConditionLoss(beforeConditions, resolved),
  };
}

export async function runDefenseReadinessLab(seed = 1): Promise<DefenseReadinessLabReport> {
  const readiness = loadDefenseReadinessCandidate();
  const zero = await runCase(0, seed);
  const half = await runCase(1, seed + 1);
  const full = await runCase(2, seed + 2);

  const gates = [
    {
      id: "DG1_ZERO_STAFF_NO_GUARDS",
      pass:
        zero.supportedGuardCapacity === readiness.validation.zero_staff_expected_guard_capacity &&
        zero.guardActorsDeployed === 0,
      detail:
        `capacity=${zero.supportedGuardCapacity}, deployed=${zero.guardActorsDeployed}.`,
    },
    {
      id: "DG2_HALF_STAFF_PROPORTIONAL",
      pass:
        half.supportedGuardCapacity === readiness.validation.half_staff_expected_guard_capacity &&
        half.guardActorsDeployed === readiness.validation.half_staff_expected_guard_capacity,
      detail:
        `capacity=${half.supportedGuardCapacity}, deployed=${half.guardActorsDeployed}.`,
    },
    {
      id: "DG3_FULL_STAFF_FULL_CAPACITY",
      pass:
        full.supportedGuardCapacity === readiness.validation.full_staff_expected_guard_capacity &&
        full.guardActorsDeployed === readiness.validation.full_staff_expected_guard_capacity,
      detail:
        `capacity=${full.supportedGuardCapacity}, deployed=${full.guardActorsDeployed}.`,
    },
    {
      id: "DG4_FULL_STAFF_COMBAT_VALUE",
      pass:
        full.conditionLoss < zero.conditionLoss ||
        (full.outcome !== zero.outcome && full.outcome !== null),
      detail:
        `zero outcome=${zero.outcome}, loss=${zero.conditionLoss}; full outcome=${full.outcome}, loss=${full.conditionLoss}.`,
    },
  ];

  return {
    modelRevision: readiness.model_revision,
    cases: [zero, half, full],
    gates,
  };
}
