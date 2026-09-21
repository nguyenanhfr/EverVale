import {
  loadGameData,
  loadPveRewardCandidate,
  loadWorkforcePolicyCandidate,
} from "@evervale/balance-data";
import { runDefenseReadinessCase } from "./defense-readiness.js";
import {
  createCategoryFloorPolicyController,
} from "./workforce-policy.js";
import { runScenario } from "./scenarios.js";

type CombatOutcome = "CLEAN" | "COSTLY" | "BREACH";

export interface PveRewardCase {
  id: string;
  outcome: CombatOutcome;
  workersAssigned: number;
  guards: number;
  conditionLoss: number;
  repairSpend: number;
  moneyReward: number;
  techReward: number;
  varumReward: number;
  netMoneyAfterRepair: number;
}

export interface PveRewardGate {
  id: string;
  pass: boolean;
  detail: string;
}

export interface PveRewardSweepReport {
  modelRevision: string;
  bracket: number;
  rewardCases: PveRewardCase[];
  peacefulEconomy: {
    hours: number;
    balancedNetMoneyProduced: number;
    industryNetMoneyProduced: number;
    defenseNetMoneyProduced: number;
    defenseOpportunityCostVsBalanced: number;
    defenseOpportunityCostVsIndustry: number;
    twoHourIndustryRunRate: number;
    twoHourFullSchoolTech: number;
  };
  antiFarm: {
    fourEquivalentCleanReward: number;
    eightHourIndustryNetMoneyProduced: number;
    fractionOfIndustryIncome: number;
    multipliers: number[];
  };
  defenseRoi: {
    cleanVsUnstaffedCombatValueDelta: number;
    wavesToCoverDefenseCostVsBalanced: number | null;
    wavesToCoverDefenseCostVsIndustry: number | null;
  };
  gates: PveRewardGate[];
  candidateVerdict: "PASS" | "FAIL";
}

function requireOutcome(value: string | null, id: string): CombatOutcome {
  if (value === "CLEAN" || value === "COSTLY" || value === "BREACH") return value;
  throw new Error(`PVE_REWARD_CASE_UNRESOLVED:${id}:${value ?? "NULL"}`);
}

function rewardFor(
  outcome: CombatOutcome,
  repeatIndex: number,
): { money: number; tech: number; varum: number } {
  const candidate = loadPveRewardCandidate();
  const bracket = candidate.brackets[0];
  if (!bracket) throw new Error("PVE_REWARD_BRACKET_0_MISSING");
  const outcomeMultiplier = candidate.outcome_multipliers[outcome];
  const antiFarm =
    candidate.anti_farm.equivalent_encounter_multipliers[repeatIndex] ?? 0;
  const multiplier = outcomeMultiplier * antiFarm;
  return {
    money: bracket.money_base * multiplier,
    tech: bracket.tech_base * multiplier,
    varum: bracket.varum_base * multiplier,
  };
}

function netProduced(report: Awaited<ReturnType<typeof runScenario>>): number {
  return report.ledger.estimatedMoneyIncome - report.ledger.estimatedUpkeep;
}

async function peacefulProfile(
  profileName: "balanced_default" | "industry_high" | "defense_high",
  hours: number,
  seed: number,
) {
  const policy = loadWorkforcePolicyCandidate();
  const controller = createCategoryFloorPolicyController(profileName);
  return runScenario({
    scenarioId: "healthy_planner",
    hours,
    seed,
    buildPlan: policy.devsim.balanced_build_plan,
    workforceAllocator: controller.allocator,
  });
}

export async function runPveRewardSweep(seed = 91): Promise<PveRewardSweepReport> {
  const candidate = loadPveRewardCandidate();
  const game = loadGameData();
  const hours = 8;

  const [unprepared, prepared, breach, balancedPeace, industryPeace, defensePeace] =
    await Promise.all([
      runDefenseReadinessCase({ workersAssigned: 0, seed }),
      runDefenseReadinessCase({ workersAssigned: 2, seed: seed + 1 }),
      runDefenseReadinessCase({
        workersAssigned: 0,
        seed: seed + 2,
        extraEnemies: { nibbler: 6, wobble_slime: 3, burrower: 2 },
      }),
      peacefulProfile("balanced_default", hours, seed + 10),
      peacefulProfile("industry_high", hours, seed + 11),
      peacefulProfile("defense_high", hours, seed + 12),
    ]);

  const rawCases = [
    { id: "PR0_UNPREPARED", result: unprepared },
    { id: "PR2_PREPARED", result: prepared },
    { id: "PR5_BREACH", result: breach },
  ];

  const rewardCases: PveRewardCase[] = rawCases.map(({ id, result }) => {
    const outcome = requireOutcome(result.outcome, id);
    const reward = rewardFor(outcome, 0);
    return {
      id,
      outcome,
      workersAssigned: result.workersAssigned,
      guards: result.guardActorsDeployed,
      conditionLoss: result.conditionLoss,
      repairSpend: result.repairSpend,
      moneyReward: reward.money,
      techReward: reward.tech,
      varumReward: reward.varum,
      netMoneyAfterRepair: reward.money - result.repairSpend,
    };
  });

  const clean = rewardCases.find((item) => item.outcome === "CLEAN");
  const costly = rewardCases.find((item) => item.outcome === "COSTLY");
  const breachCase = rewardCases.find((item) => item.outcome === "BREACH");
  if (!clean || !costly || !breachCase) {
    throw new Error("PVE_REWARD_OUTCOME_COVERAGE_MISSING");
  }

  const balancedNet = netProduced(balancedPeace);
  const industryNet = netProduced(industryPeace);
  const defenseNet = netProduced(defensePeace);
  const defenseOpportunityCostVsBalanced = Math.max(0, balancedNet - defenseNet);
  const defenseOpportunityCostVsIndustry = Math.max(0, industryNet - defenseNet);

  const referenceCyclesPerTwoHours =
    (2 * 60 * 60) / game.definitions.referenceCycleSeconds;
  const twoHourIndustryRunRate =
    Math.max(0, industryPeace.final.moneyFlow.netPerCycle) *
    referenceCyclesPerTwoHours;
  const school = game.definitions.buildings.school;
  if (!school) throw new Error("PVE_REWARD_SCHOOL_DEFINITION_MISSING");
  const twoHourFullSchoolTech =
    school.techProduction * referenceCyclesPerTwoHours;

  const antiFarmRewards = candidate.anti_farm.equivalent_encounter_multipliers
    .slice(0, 4)
    .map((_, index) => rewardFor("CLEAN", index).money);
  const fourEquivalentCleanReward = antiFarmRewards.reduce(
    (sum, value) => sum + value,
    0,
  );
  const antiFarmFraction =
    industryNet > 0 ? fourEquivalentCleanReward / industryNet : Number.POSITIVE_INFINITY;

  const cleanVsUnstaffedCombatValueDelta =
    clean.netMoneyAfterRepair - costly.netMoneyAfterRepair;

  const wavesToCover = (cost: number): number | null =>
    cleanVsUnstaffedCombatValueDelta > 0
      ? cost / cleanVsUnstaffedCombatValueDelta
      : null;

  const validation = candidate.validation;
  const gates: PveRewardGate[] = [
    {
      id: "PG1_DEFENSE_CREATES_COMBAT_VALUE",
      pass: cleanVsUnstaffedCombatValueDelta > 0,
      detail:
        `Prepared CLEAN net=${clean.netMoneyAfterRepair.toFixed(1)}; unprepared COSTLY net=${costly.netMoneyAfterRepair.toFixed(1)}; delta=${cleanVsUnstaffedCombatValueDelta.toFixed(1)}.`,
    },
    {
      id: "PG2_INDUSTRY_WINS_PEACEFUL_ECONOMY",
      pass: industryNet > balancedNet && balancedNet > defenseNet,
      detail:
        `8h net production industry=${industryNet.toFixed(1)}, balanced=${balancedNet.toFixed(1)}, defense=${defenseNet.toFixed(1)}.`,
    },
    {
      id: "PG3_REWARD_HIERARCHY",
      pass:
        clean.moneyReward > costly.moneyReward &&
        costly.moneyReward > breachCase.moneyReward,
      detail:
        `Money reward CLEAN=${clean.moneyReward.toFixed(1)}, COSTLY=${costly.moneyReward.toFixed(1)}, BREACH=${breachCase.moneyReward.toFixed(1)}.`,
    },
    {
      id: "PG4_BREACH_REMAINS_NEGATIVE",
      pass:
        breachCase.netMoneyAfterRepair <=
        validation.bracket_zero.breach_net_max,
      detail:
        `BREACH reward=${breachCase.moneyReward.toFixed(1)}, repair=${breachCase.repairSpend.toFixed(1)}, net=${breachCase.netMoneyAfterRepair.toFixed(1)}.`,
    },
    {
      id: "PG5_COSTLY_NOT_FREE_PROFIT",
      pass:
        costly.netMoneyAfterRepair <=
        validation.bracket_zero.costly_net_max,
      detail:
        `COSTLY reward=${costly.moneyReward.toFixed(1)}, repair=${costly.repairSpend.toFixed(1)}, net=${costly.netMoneyAfterRepair.toFixed(1)}.`,
    },
    {
      id: "PG6_CLEAN_NOT_BETTER_THAN_INDUSTRY_ENGINE",
      pass:
        clean.moneyReward <=
        twoHourIndustryRunRate *
          validation.bracket_zero.clean_money_max_fraction_of_two_hour_industry_income,
      detail:
        `CLEAN reward=${clean.moneyReward.toFixed(1)}; 2h Industry run-rate=${twoHourIndustryRunRate.toFixed(1)}.`,
    },
    {
      id: "PG7_PVE_TECH_STAYS_BONUS",
      pass:
        clean.techReward <=
        twoHourFullSchoolTech *
          validation.bracket_zero.pve_tech_max_fraction_of_two_hour_full_school_output,
      detail:
        `CLEAN Tech reward=${clean.techReward.toFixed(1)}; 2h full-School Tech=${twoHourFullSchoolTech.toFixed(1)}.`,
    },
    {
      id: "PG8_REPEATED_EQUIVALENT_ANTI_FARM",
      pass:
        antiFarmFraction <=
        validation.repeated_equivalent_wins
          .max_four_encounter_money_fraction_of_eight_hour_industry_income,
      detail:
        `Four equivalent CLEAN rewards=${fourEquivalentCleanReward.toFixed(1)}; 8h Industry net=${industryNet.toFixed(1)}; fraction=${antiFarmFraction.toFixed(3)}.`,
    },
    {
      id: "PG9_TEST_WAVE_HAS_NO_REWARD",
      pass: candidate.anti_farm.test_wave_reward_enabled === false,
      detail:
        `test_wave_reward_enabled=${candidate.anti_farm.test_wave_reward_enabled}.`,
    },
  ];

  return {
    modelRevision: candidate.model_revision,
    bracket: 0,
    rewardCases,
    peacefulEconomy: {
      hours,
      balancedNetMoneyProduced: balancedNet,
      industryNetMoneyProduced: industryNet,
      defenseNetMoneyProduced: defenseNet,
      defenseOpportunityCostVsBalanced,
      defenseOpportunityCostVsIndustry,
      twoHourIndustryRunRate,
      twoHourFullSchoolTech,
    },
    antiFarm: {
      fourEquivalentCleanReward,
      eightHourIndustryNetMoneyProduced: industryNet,
      fractionOfIndustryIncome: antiFarmFraction,
      multipliers: candidate.anti_farm.equivalent_encounter_multipliers.slice(0, 4),
    },
    defenseRoi: {
      cleanVsUnstaffedCombatValueDelta,
      wavesToCoverDefenseCostVsBalanced: wavesToCover(defenseOpportunityCostVsBalanced),
      wavesToCoverDefenseCostVsIndustry: wavesToCover(defenseOpportunityCostVsIndustry),
    },
    gates,
    candidateVerdict: gates.every((gate) => gate.pass) ? "PASS" : "FAIL",
  };
}
