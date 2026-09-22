import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import YAML from "yaml";
import type {
  BuildingDefinition,
  BlockerDefinition,
  CombatActorDefinition,
  PropDefinition,
  Season,
  SimulationDefinitions,
  WeatherDefinitions,
  WeatherKind,
  WeatherModifierDefinition,
} from "@evervale/domain/world.types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readYaml<T>(relativePath: string): T {
  const text = readFileSync(path.join(ROOT, relativePath), "utf8");
  return YAML.parse(text) as T;
}

type RawBalance = {
  reference_cycle_seconds: number;
  buildings: Record<string, Record<string, unknown>>;
};

type RawContent = {
  buildings: Record<string, { name: string; category: string; tech_tier: number }>;
};

type RawCombat = {
  units?: Record<string, Record<string, unknown>>;
  enemies?: Record<string, Record<string, unknown>>;
};

type RawBlockers = {
  blockers: Record<string, Record<string, unknown>>;
};

type RawFootprints = {
  grid_cell_meters: number;
  footprints: Record<string, { cells_x: number; cells_z: number }>;
};


type RawWeather = {
  calendar: {
    season_duration_real_seconds_at_1x: number;
    season_order: Season[];
  };
  episode_duration_minutes: {
    normal_min: number;
    normal_max: number;
    severe_min: number;
    severe_max: number;
  };
  severe: {
    cooldown_real_hours_min: number;
  };
  season_weights: Record<Season, Partial<Record<WeatherKind, number>>>;
  modifiers: Partial<Record<WeatherKind, {
    citizen_power_mult?: number;
    citizen_water_mult?: number;
    travel_cost_mult?: number;
    outdoor_activity_mult?: number;
    civilian_traffic_mult?: number;
  }>>;
};

type RawProps = {
  default_snap_meters: number;
  props: Record<string, {
    title: string;
    group: string;
    size_x_m: number;
    size_z_m: number;
    money_cost: number;
    decor_class: "visual" | "beauty" | "activity_anchor";
    beauty?: number;
    activity_anchor?: string;
  }>;
};

const numberValue = (value: unknown, fallback = 0): number =>
  typeof value === "number" ? value : fallback;


function mapWeather(raw: RawWeather): WeatherDefinitions {
  const canonicalSeasonOrder: readonly Season[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
  if (
    raw.calendar.season_order.length !== canonicalSeasonOrder.length ||
    raw.calendar.season_order.some(
      (season, index) => season !== canonicalSeasonOrder[index],
    )
  ) {
    throw new Error("INVALID_WEATHER_SEASON_ORDER");
  }

  const neutral: WeatherModifierDefinition = {
    citizenPowerMult: 1,
    citizenWaterMult: 1,
    travelCostMult: 1,
    outdoorActivityMult: 1,
    civilianTrafficMult: 1,
  };

  return {
    seasonDurationSeconds: Math.max(
      1,
      numberValue(raw.calendar.season_duration_real_seconds_at_1x, 604800),
    ),
    normalEpisodeMinSeconds:
      Math.max(1, numberValue(raw.episode_duration_minutes.normal_min, 20)) * 60,
    normalEpisodeMaxSeconds:
      Math.max(1, numberValue(raw.episode_duration_minutes.normal_max, 120)) * 60,
    severeEpisodeMinSeconds:
      Math.max(1, numberValue(raw.episode_duration_minutes.severe_min, 15)) * 60,
    severeEpisodeMaxSeconds:
      Math.max(1, numberValue(raw.episode_duration_minutes.severe_max, 60)) * 60,
    severeCooldownSeconds:
      Math.max(0, numberValue(raw.severe.cooldown_real_hours_min, 8)) * 60 * 60,
    seasonWeights: raw.season_weights,
    modifiers: Object.fromEntries(
      Object.entries(raw.modifiers).map(([kind, modifier]) => [
        kind,
        {
          citizenPowerMult: numberValue(
            modifier?.citizen_power_mult,
            neutral.citizenPowerMult,
          ),
          citizenWaterMult: numberValue(
            modifier?.citizen_water_mult,
            neutral.citizenWaterMult,
          ),
          travelCostMult: numberValue(
            modifier?.travel_cost_mult,
            neutral.travelCostMult,
          ),
          outdoorActivityMult: numberValue(
            modifier?.outdoor_activity_mult,
            neutral.outdoorActivityMult,
          ),
          civilianTrafficMult: numberValue(
            modifier?.civilian_traffic_mult,
            neutral.civilianTrafficMult,
          ),
        },
      ]),
    ) as Partial<Record<WeatherKind, WeatherModifierDefinition>>,
  };
}

function mapBuilding(
  id: string,
  raw: Record<string, unknown>,
  footprint: { cells_x: number; cells_z: number },
): BuildingDefinition {
  const combatSpawnRaw = raw.combat_spawn;
  const combatSpawn =
    combatSpawnRaw && typeof combatSpawnRaw === "object"
      ? Object.fromEntries(
          Object.entries(combatSpawnRaw as Record<string, unknown>).map(([key, value]) => [
            key,
            numberValue(value),
          ]),
        )
      : {};

  return {
    id,
    techTier: numberValue(raw.tech_tier),
    moneyCost: numberValue(raw.money_cost),
    varumCost: numberValue(raw.varum_cost),
    buildCycles: numberValue(raw.build_cycles),
    workers: numberValue(raw.workers),
    priority: numberValue(raw.priority),
    ...(typeof raw.job_category === "string" ? { jobCategory: raw.job_category } : {}),
    moneyPerWorker: numberValue(raw.money_per_worker),
    moneyCapAdd: numberValue(raw.money_cap_add),
    powerProduction: numberValue(raw.power_production),
    powerCapAdd: numberValue(raw.power_cap_add),
    powerUse: numberValue(raw.power_use),
    waterProduction: numberValue(raw.water_production),
    waterCapAdd: numberValue(raw.water_cap_add),
    waterUse: numberValue(raw.water_use),
    varumProduction: numberValue(raw.varum_production),
    varumCapAdd: numberValue(raw.varum_cap_add),
    techProduction: numberValue(raw.tech_production),
    upkeep: numberValue(raw.upkeep),
    housingAdd: numberValue(raw.housing_add),
    educationCoverageAdd: numberValue(raw.education_coverage_add),
    recreationCoverageAdd: numberValue(raw.recreation_coverage_add),
    safetyAdd: numberValue(raw.safety_add),
    combatSpawn,
    constructionSlotsAdd: numberValue(raw.construction_slots_add),
    footprintCellsX: footprint.cells_x,
    footprintCellsZ: footprint.cells_z,
  };
}

function mapBlocker(id: string, raw: Record<string, unknown>): BlockerDefinition {
  const sizeByClass: Record<string, number> = { light: 2.5, medium: 3.5, heavy: 5 };
  const cls = typeof raw.class === "string" ? raw.class : "light";
  return {
    id,
    moneyCost: numberValue(raw.money_cost),
    varumCost: numberValue(raw.varum_cost),
    clearCycles: numberValue(raw.clear_cycles, 1),
    techTier: numberValue(raw.tech_tier),
    radius: sizeByClass[cls] ?? 3,
  };
}

function mapProp(
  id: string,
  raw: RawProps["props"][string],
  snapMeters: number,
): PropDefinition {
  return {
    id,
    group: raw.group,
    sizeXMeters: raw.size_x_m,
    sizeZMeters: raw.size_z_m,
    snapMeters,
    moneyCost: raw.money_cost,
    decorClass: raw.decor_class,
    beauty: raw.beauty ?? 0,
    ...(raw.activity_anchor ? { activityAnchor: raw.activity_anchor } : {}),
  };
}

function mapActor(
  id: string,
  raw: Record<string, unknown>,
  side: "DEFENDER" | "ENEMY",
): CombatActorDefinition {
  const target =
    typeof raw.target === "string"
      ? raw.target
      : side === "ENEMY"
        ? "ground"
        : "ground";

  return {
    id,
    side,
    hp: numberValue(raw.hp),
    dps: numberValue(raw.dps),
    armor: numberValue(raw.armor),
    target: target as CombatActorDefinition["target"],
    class: typeof raw.class === "string" ? raw.class : "ground",
  };
}

export interface BuildCatalogEntry {
  id: string;
  name: string;
  category: string;
  techTier: number;
  moneyCost: number;
  varumCost: number;
  buildCycles: number;
  footprintCellsX: number;
  footprintCellsZ: number;
  gridCellMeters: number;
  sizeTitle: string;
  workers: number;
  jobCategory: string | null;
  moneyPerWorker: number;
  powerProduction: number;
  powerUse: number;
  waterProduction: number;
  waterUse: number;
  techProduction: number;
  upkeep: number;
  housingAdd: number;
  educationCoverageAdd: number;
  recreationCoverageAdd: number;
  safetyAdd: number;
}

export interface BlockerCatalogEntry {
  id: string;
  moneyCost: number;
  varumCost: number;
  clearCycles: number;
  techTier: number;
}

export interface PropCatalogEntry {
  id: string;
  title: string;
  group: string;
  sizeXMeters: number;
  sizeZMeters: number;
  snapMeters: number;
  sizeTitle: string;
  moneyCost: number;
  decorClass: "visual" | "beauty" | "activity_anchor";
  beauty: number;
  activityAnchor: string | null;
}

export interface LoadedGameData {
  definitions: SimulationDefinitions;
  buildCatalog: BuildCatalogEntry[];
  blockerCatalog: BlockerCatalogEntry[];
  propCatalog: PropCatalogEntry[];
}

export function loadGameData(): LoadedGameData {
  const balance = readYaml<RawBalance>("data/balance/v0.2/buildings.yaml");
  const content = readYaml<RawContent>("data/content/v0.2/buildings.yaml");
  const defenders = readYaml<RawCombat>("data/combat/v0.2/defense_units.yaml").units ?? {};
  const enemies = readYaml<RawCombat>("data/combat/v0.2/enemies.yaml").enemies ?? {};
  const blockers = readYaml<RawBlockers>("data/world/v0.1/blockers.yaml").blockers;
  const footprintData = readYaml<RawFootprints>("data/content/v0.2/build_footprints.yaml");
  const propData = readYaml<RawProps>("data/content/v0.2/props.yaml");
  const weatherData = readYaml<RawWeather>("data/weather/v0.1/weather.yaml");

  const buildings = Object.fromEntries(
    Object.entries(balance.buildings).map(([id, raw]) => {
      const footprint = footprintData.footprints[id];
      if (!footprint) throw new Error(`Missing footprint for ${id}`);
      return [id, mapBuilding(id, raw, footprint)];
    }),
  );

  const definitions: SimulationDefinitions = {
    referenceCycleSeconds: numberValue(balance.reference_cycle_seconds, 600),
    buildings,
    defenders: Object.fromEntries(
      Object.entries(defenders).map(([id, raw]) => [id, mapActor(id, raw, "DEFENDER")]),
    ),
    enemies: Object.fromEntries(
      Object.entries(enemies).map(([id, raw]) => [id, mapActor(id, raw, "ENEMY")]),
    ),
    blockers: Object.fromEntries(
      Object.entries(blockers).map(([id, raw]) => [id, mapBlocker(id, raw)]),
    ),
    props: Object.fromEntries(
      Object.entries(propData.props).map(([id, raw]) => [
        id,
        mapProp(id, raw, propData.default_snap_meters),
      ]),
    ),
    gridCellMeters: footprintData.grid_cell_meters,
    weather: mapWeather(weatherData),
  };

  const m1Ids = new Set([
    "town_center",
    "house_small",
    "workshop",
    "power_plant",
    "water_plant",
    "school",
    "park",
    "guard_post",
    "farm",
    "restaurant",
    "builders_yard",
  ]);

  const buildCatalog = Object.entries(content.buildings)
    .filter(([id]) => m1Ids.has(id) && id !== "town_center")
    .map(([id, item]) => {
      const def = buildings[id];
      if (!def) throw new Error(`Missing balance for ${id}`);
      return {
        id,
        name: item.name,
        category: item.category,
        techTier: item.tech_tier,
        moneyCost: def.moneyCost,
        varumCost: def.varumCost,
        buildCycles: def.buildCycles,
        footprintCellsX: def.footprintCellsX,
        footprintCellsZ: def.footprintCellsZ,
        gridCellMeters: footprintData.grid_cell_meters,
        sizeTitle: `${def.footprintCellsX}×${def.footprintCellsZ} grid · ${def.footprintCellsX * footprintData.grid_cell_meters}×${def.footprintCellsZ * footprintData.grid_cell_meters}m`,
        workers: def.workers,
        jobCategory: def.jobCategory ?? null,
        moneyPerWorker: def.moneyPerWorker,
        powerProduction: def.powerProduction,
        powerUse: def.powerUse,
        waterProduction: def.waterProduction,
        waterUse: def.waterUse,
        techProduction: def.techProduction,
        upkeep: def.upkeep,
        housingAdd: def.housingAdd,
        educationCoverageAdd: def.educationCoverageAdd,
        recreationCoverageAdd: def.recreationCoverageAdd,
        safetyAdd: def.safetyAdd,
      };
    })
    .sort((a, b) => a.techTier - b.techTier || a.name.localeCompare(b.name));

  const blockerCatalog = Object.values(definitions.blockers)
    .map((item) => ({
      id: item.id,
      moneyCost: item.moneyCost,
      varumCost: item.varumCost,
      clearCycles: item.clearCycles,
      techTier: item.techTier,
    }))
    .sort((a, b) => a.techTier - b.techTier || a.moneyCost - b.moneyCost);

  const propCatalog = Object.entries(propData.props)
    .map(([id, item]) => ({
      id,
      title: item.title,
      group: item.group,
      sizeXMeters: item.size_x_m,
      sizeZMeters: item.size_z_m,
      snapMeters: propData.default_snap_meters,
      moneyCost: item.money_cost,
      decorClass: item.decor_class,
      beauty: item.beauty ?? 0,
      activityAnchor: item.activity_anchor ?? null,
      sizeTitle: `${item.size_x_m}×${item.size_z_m}m`,
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));

  return { definitions, buildCatalog, blockerCatalog, propCatalog };
}


export interface AuditBalanceData {
  buildingBalance: {
    version: string;
    status: string;
  };
  starterWorld: {
    version: string;
    starting_state: {
      population: number;
      happiness: number;
      money: number;
      power_reserve: number;
      water_reserve: number;
      varum: number;
      tech_points: number;
      tech_tier: number;
      construction_slots: number;
    };
    starting_buildings: Record<string, number>;
  };
  simulation: {
    version: string;
    reference_cycle_seconds: number;
    starting_world: {
      population: number;
      happiness: number;
      money: number;
      money_cap: number;
      power: number;
      water: number;
      varum: number;
      tech_points: number;
      tech_tier: number;
      construction_slots: number;
      buildings: Record<string, number>;
    };
    society: {
      workforce_fraction: number;
      citizen_power_per_cycle: number;
      citizen_water_per_cycle: number;
      happiness_growth_threshold: number;
      happiness_smoothing_per_cycle: number;
      growth_per_occupied_house_per_cycle: number;
      growth_world_cap_per_cycle: number;
    };
  };
  tech: {
    version: string;
    model_revision: string;
    tiers: Record<number, {
      threshold: number;
      confirmation_required: boolean;
      unlocks: string[];
    }>;
  };
}

export function loadAuditBalanceData(): AuditBalanceData {
  return {
    buildingBalance: readYaml<AuditBalanceData["buildingBalance"]>("data/balance/v0.2/buildings.yaml"),
    starterWorld: readYaml<AuditBalanceData["starterWorld"]>("data/world/v0.1/starter_world.yaml"),
    simulation: readYaml<AuditBalanceData["simulation"]>("data/balance/v0.1/simulation.yaml"),
    tech: readYaml<AuditBalanceData["tech"]>("data/balance/v0.1/tech.yaml"),
  };
}


export type WorkforcePriorityLevel =
  | "critical"
  | "high"
  | "normal"
  | "low"
  | "paused";

export interface WorkforcePolicyCandidate {
  version: string;
  status: string;
  model_revision: string;
  rules: {
    early_high_slots: number;
    later_high_slots: number;
    critical_reserved_for_emergency: boolean;
    building_local_priority_scale: number;
    category_tie_order: string[];
  };
  semantic_levels: Record<WorkforcePriorityLevel, number>;
  categories: Record<string, {
    job_categories: string[];
    default_level: WorkforcePriorityLevel;
  }>;
  profiles: Record<string, Record<string, WorkforcePriorityLevel>>;
  emergency: {
    utilities: {
      reserve_ratio_trigger: number;
      override_level: WorkforcePriorityLevel;
    };
    defense: {
      active_combat_override_level: WorkforcePriorityLevel;
    };
  };
  devsim: {
    balanced_build_plan: string[];
    test_hours: number;
    rapid_switch_interval_seconds: number;
  };
  gates: {
    balanced_school_zero_staff_max_hours: number;
    balanced_critical_diagnostics_max: number;
    emergency_recovery_max_hours: number;
    rapid_switch_count: number;
    opportunity_cost_min_money_difference: number;
    opportunity_cost_min_tech_difference: number;
  };
}

export function loadWorkforcePolicyCandidate(): WorkforcePolicyCandidate {
  return readYaml<WorkforcePolicyCandidate>("data/devsim/v0.1/workforce_policy.yaml");
}


export interface WorkforceAllocatorLabData {
  version: string;
  status: string;
  model_revision: string;
  fixtures: Record<string, {
    workforce: number;
    buildings: Record<string, number>;
  }>;
  profiles: string[];
  algorithms: string[];
  acceptance: {
    balanced_requires_nonzero_categories: string[];
    paused_requires_zero_category: string;
  };
}

export function loadWorkforceAllocatorLabData(): WorkforceAllocatorLabData {
  return readYaml<WorkforceAllocatorLabData>(
    "data/devsim/v0.1/workforce_allocator_fixtures.yaml",
  );
}


export interface DefenseReadinessCandidate {
  version: string;
  status: string;
  model_revision: string;
  guard: {
    source_building: string;
    unit_definition: string;
    slots_per_source: number;
    requires_staffed_source: boolean;
    capacity_rule: "floor_proportional";
  };
  town_warden: {
    always_available: boolean;
    baseline_count: number;
  };
  validation: {
    zero_staff_expected_guard_capacity: number;
    half_staff_expected_guard_capacity: number;
    full_staff_expected_guard_capacity: number;
  };
  gates: {
    full_staff_condition_loss_must_be_lower_than_zero: boolean;
    defense_high_condition_loss_must_be_lower_than_balanced: boolean;
    deterministic_replay_required: boolean;
  };
}

export function loadDefenseReadinessCandidate(): DefenseReadinessCandidate {
  return readYaml<DefenseReadinessCandidate>(
    "data/devsim/v0.1/defense_readiness.yaml",
  );
}


export interface PveRewardCandidate {
  version: string;
  status: string;
  model_revision: string;
  brackets: Record<number, {
    money_base: number;
    tech_base: number;
    varum_base: number;
  }>;
  outcome_multipliers: Record<"CLEAN" | "COSTLY" | "BREACH", number>;
  anti_farm: {
    equivalent_encounter_multipliers: number[];
    test_wave_reward_enabled: boolean;
  };
  validation: {
    bracket_zero: {
      costly_net_max: number;
      breach_net_max: number;
      clean_money_max_fraction_of_two_hour_industry_income: number;
      pve_tech_max_fraction_of_two_hour_full_school_output: number;
    };
    repeated_equivalent_wins: {
      max_four_encounter_money_fraction_of_eight_hour_industry_income: number;
    };
  };
}

export function loadPveRewardCandidate(): PveRewardCandidate {
  return readYaml<PveRewardCandidate>(
    "data/devsim/v0.1/pve_reward_candidate.yaml",
  );
}
