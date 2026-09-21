import { randomUUID } from "node:crypto";
import { loadAuditBalanceData } from "@evervale/balance-data";
import { parseWorldCommand } from "@evervale/protocol/world-command-runtime";
import { SimHarness } from "./core.js";

export interface RoiEntry {
  id: string;
  techTier: number;
  moneyCost: number;
  workerSlots: number;
  moneyPerWorker: number;
  upkeepPerCycle: number;
  fullStaffGrossPerCycle: number;
  fullStaffNetPerCycle: number;
  naivePaybackCycles: number | null;
  naivePaybackHours: number | null;
  starterSpareWorkers: number;
  constrainedWorkers: number;
  constrainedNetPerCycle: number;
  constrainedPaybackCycles: number | null;
  constrainedPaybackHours: number | null;
}

const payback = (cost: number, net: number): number | null =>
  net > 0 ? cost / net : null;

export async function buildRoiReport(): Promise<{
  referenceCycleSeconds: number;
  starterSpareWorkers: number;
  entries: RoiEntry[];
}> {
  const harness = new SimHarness();
  await harness.initialize();
  const world = await harness.advance(60);
  const sample = harness.sample(world);
  const spare = Math.max(0, sample.workforce - sample.assignedWorkers);

  const entries = Object.values(harness.definitions.buildings)
    .filter((def) => def.moneyCost > 0 && (def.moneyPerWorker > 0 || def.upkeep > 0))
    .map((def): RoiEntry => {
      const fullGross = def.moneyPerWorker * def.workers;
      const fullNet = fullGross - def.upkeep;
      const constrainedWorkers = Math.min(spare, def.workers);
      const constrainedNet = def.moneyPerWorker * constrainedWorkers - def.upkeep;
      const naiveCycles = payback(def.moneyCost, fullNet);
      const constrainedCycles = payback(def.moneyCost, constrainedNet);
      return {
        id: def.id,
        techTier: def.techTier,
        moneyCost: def.moneyCost,
        workerSlots: def.workers,
        moneyPerWorker: def.moneyPerWorker,
        upkeepPerCycle: def.upkeep,
        fullStaffGrossPerCycle: fullGross,
        fullStaffNetPerCycle: fullNet,
        naivePaybackCycles: naiveCycles,
        naivePaybackHours:
          naiveCycles === null
            ? null
            : naiveCycles * harness.definitions.referenceCycleSeconds / 3600,
        starterSpareWorkers: spare,
        constrainedWorkers,
        constrainedNetPerCycle: constrainedNet,
        constrainedPaybackCycles: constrainedCycles,
        constrainedPaybackHours:
          constrainedCycles === null
            ? null
            : constrainedCycles * harness.definitions.referenceCycleSeconds / 3600,
      };
    })
    .sort((a, b) =>
      a.techTier - b.techTier ||
      (a.naivePaybackCycles ?? Number.POSITIVE_INFINITY) -
        (b.naivePaybackCycles ?? Number.POSITIVE_INFINITY) ||
      a.id.localeCompare(b.id),
    );

  return {
    referenceCycleSeconds: harness.definitions.referenceCycleSeconds,
    starterSpareWorkers: spare,
    entries,
  };
}

export interface ResourceGraphNode {
  resource: string;
  faucets: string[];
  sinks: string[];
  downstream: string[];
  risk: string | null;
}

export function buildDependencyGraph(): {
  resources: ResourceGraphNode[];
  authorityDebts: string[];
} {
  const harness = new SimHarness();
  const defs = Object.values(harness.definitions.buildings);

  const moneyFaucets = defs.filter((d) => d.moneyPerWorker > 0).map((d) => d.id);
  const moneySinks = defs
    .filter((d) => d.moneyCost > 0 || d.upkeep > 0)
    .map((d) => d.id);
  const powerFaucets = defs.filter((d) => d.powerProduction > 0).map((d) => d.id);
  const powerSinks = defs.filter((d) => d.powerUse > 0).map((d) => d.id);
  const waterFaucets = defs.filter((d) => d.waterProduction > 0).map((d) => d.id);
  const waterSinks = defs.filter((d) => d.waterUse > 0).map((d) => d.id);
  const varumFaucets = defs.filter((d) => d.varumProduction > 0).map((d) => d.id);
  const varumBuildingSinks = defs.filter((d) => d.varumCost > 0).map((d) => d.id);
  const techFaucets = defs.filter((d) => d.techProduction > 0).map((d) => d.id);

  const resources: ResourceGraphNode[] = [
    {
      resource: "Money",
      faucets: moneyFaucets,
      sinks: [...moneySinks, "roads(code)", "repairs(code)", "future military production(data)"],
      downstream: ["construction", "roads", "repairs", "military", "funding/upkeep"],
      risk: null,
    },
    {
      resource: "Power",
      faucets: powerFaucets,
      sinks: [...powerSinks, "residents(code)"],
      downstream: ["utility satisfaction", "Happiness", "building operation (documented target)"],
      risk: "Current M1 runtime mainly converts shortages into Happiness pressure; operational shutdown/funding interaction is not yet complete.",
    },
    {
      resource: "Water",
      faucets: waterFaucets,
      sinks: [...waterSinks, "residents(code)"],
      downstream: ["utility satisfaction", "Happiness", "building operation (documented target)"],
      risk: "Current M1 runtime mainly converts shortages into Happiness pressure; operational shutdown/funding interaction is not yet complete.",
    },
    {
      resource: "Varum",
      faucets: varumFaucets,
      sinks: [...varumBuildingSinks, "military production(data)"],
      downstream: ["advanced construction", "advanced military"],
      risk:
        varumFaucets.length === 0 || varumBuildingSinks.length === 0
          ? "DEAD_RESOURCE_RISK"
          : "M1 runtime has limited meaningful Varum sinks before advanced production is implemented.",
    },
    {
      resource: "Tech",
      faucets: techFaucets,
      sinks: [],
      downstream: ["tier gates", "building/unit unlocks"],
      risk: "Tech is cumulative progression rather than a spendable sink; decision gates must provide the strategic branch.",
    },
    {
      resource: "Workforce",
      faucets: ["Population × runtime workforce fraction"],
      sinks: defs.filter((d) => d.workers > 0).map((d) => d.id),
      downstream: ["Money", "Power", "Water", "Tech", "Varum", "Defense"],
      risk: "This is the strongest current scarcity but player priority control is not yet implemented.",
    },
  ];

  return {
    resources,
    authorityDebts: [
      "starter-world values are duplicated between runtime construction and versioned YAML",
      "resident Power/Water demand is duplicated as runtime numeric constants",
      "Happiness/Growth constants exist both in runtime and simulation balance data",
      "road price/length/access constants are runtime hardcodes",
      "repair cost/duration formula is runtime hardcode",
      "combat aftermath damage policy is runtime hardcode",
      "legacy Python long-run simulator duplicates balance constants",
    ],
  };
}

export async function runAuthorityTamperProbe(): Promise<{
  pass: boolean;
  parserStrippedFakeCost: boolean;
  serverRejectedFreeBuild: boolean;
  error: string | null;
}> {
  const harness = new SimHarness();
  let world = await harness.initialize();

  world = {
    ...world,
    resources: {
      ...world.resources,
      money: 0,
    },
  };
  harness.repository.replaceForFixture(world);

  const parsed = parseWorldCommand({
    type: "PLACE_BUILDING",
    commandId: randomUUID(),
    expectedRevision: world.revision,
    payload: {
      definitionId: "school",
      x: 20,
      z: 10,
      moneyCost: 0,
      buildCycles: 0,
      techTier: 0,
    },
    money: 999999,
  });

  const parserStrippedFakeCost =
    !("moneyCost" in parsed.payload) &&
    !("buildCycles" in parsed.payload) &&
    !("techTier" in parsed.payload);

  let error: string | null = null;
  try {
    await harness.service.command(harness.ownerId, parsed);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "UNKNOWN_ERROR";
  }

  const serverRejectedFreeBuild = error === "NOT_ENOUGH_MONEY";
  return {
    pass: parserStrippedFakeCost && serverRejectedFreeBuild,
    parserStrippedFakeCost,
    serverRejectedFreeBuild,
    error,
  };
}

function countBuildings(ids: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

export async function buildAuthorityDriftReport(): Promise<{
  passCommonValues: boolean;
  runtime: Record<string, unknown>;
  starterWorldYaml: Record<string, unknown>;
  simulationYaml: Record<string, unknown>;
  mismatches: string[];
  duplicateAuthorityRisks: string[];
}> {
  const harness = new SimHarness();
  const world = await harness.initialize();
  const audit = loadAuditBalanceData();

  const runtimeBuildings = countBuildings(world.buildings.map((b) => b.definitionId));
  const runtime: Record<string, unknown> = {
    population: world.society.population,
    happiness: world.society.happiness,
    money: world.resources.money,
    power: world.resources.power,
    water: world.resources.water,
    varum: world.resources.varum,
    tech_points: world.resources.techPoints,
    tech_tier: world.resources.techTier,
    buildings: runtimeBuildings,
    reference_cycle_seconds: harness.definitions.referenceCycleSeconds,
  };

  const starterWorldYaml: Record<string, unknown> = {
    ...audit.starterWorld.starting_state,
    buildings: audit.starterWorld.starting_buildings,
  };

  const simulationYaml: Record<string, unknown> = {
    ...audit.simulation.starting_world,
    reference_cycle_seconds: audit.simulation.reference_cycle_seconds,
  };

  const mismatches: string[] = [];
  const pairs: Array<[string, unknown, unknown, unknown]> = [
    ["population", runtime.population, starterWorldYaml.population, simulationYaml.population],
    ["happiness", runtime.happiness, starterWorldYaml.happiness, simulationYaml.happiness],
    ["money", runtime.money, starterWorldYaml.money, simulationYaml.money],
    ["power", runtime.power, starterWorldYaml.power_reserve, simulationYaml.power],
    ["water", runtime.water, starterWorldYaml.water_reserve, simulationYaml.water],
    ["varum", runtime.varum, starterWorldYaml.varum, simulationYaml.varum],
    ["tech_points", runtime.tech_points, starterWorldYaml.tech_points, simulationYaml.tech_points],
    ["tech_tier", runtime.tech_tier, starterWorldYaml.tech_tier, simulationYaml.tech_tier],
    [
      "reference_cycle_seconds",
      runtime.reference_cycle_seconds,
      audit.simulation.reference_cycle_seconds,
      audit.simulation.reference_cycle_seconds,
    ],
  ];

  for (const [name, actual, a, b] of pairs) {
    if (actual !== a || actual !== b) {
      mismatches.push(`${name}: runtime=${String(actual)} starter_yaml=${String(a)} simulation_yaml=${String(b)}`);
    }
  }

  for (const [id, count] of Object.entries(audit.starterWorld.starting_buildings)) {
    if ((runtimeBuildings[id] ?? 0) !== count) {
      mismatches.push(
        `building:${id}: runtime=${runtimeBuildings[id] ?? 0} starter_yaml=${count}`,
      );
    }
  }

  return {
    passCommonValues: mismatches.length === 0,
    runtime,
    starterWorldYaml,
    simulationYaml,
    mismatches,
    duplicateAuthorityRisks: [
      "Passing equality is not SSOT: runtime and YAML still duplicate starter values.",
      "DevSim intentionally reports this until runtime starter creation consumes authoritative data.",
    ],
  };
}
