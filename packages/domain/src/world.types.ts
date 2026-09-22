export type WorldSpeed = 0 | 1 | 2 | 4;
export type WorldLifecycle = "ACTIVE" | "WARM" | "COLD";
export type ConstructionState = "COMPLETE" | "BUILDING";
export type DamageState = "HEALTHY" | "DAMAGED" | "DISABLED" | "REPAIRING";
export type CombatOutcome = "CLEAN" | "COSTLY" | "BREACH";
export type Season = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";
export type WeatherKind =
  | "CLEAR"
  | "PARTLY_CLOUDY"
  | "CLOUDY"
  | "FOG"
  | "LIGHT_RAIN"
  | "RAIN"
  | "HEAVY_RAIN"
  | "THUNDERSTORM"
  | "LIGHT_WIND"
  | "STRONG_WIND"
  | "WINDSTORM"
  | "HEATWAVE"
  | "COLD_SNAP"
  | "LIGHT_SNOW"
  | "SNOW"
  | "HEAVY_SNOW"
  | "SEVERE_STORM";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ResourceState {
  money: number;
  moneyCap: number;
  power: number;
  powerCap: number;
  water: number;
  waterCap: number;
  varum: number;
  varumCap: number;
  techPoints: number;
  techTier: number;
}

export interface SocietyState {
  population: number;
  housingCapacity: number;
  happiness: number;
  growthProgress: number;
  workforce: number;
  assignedWorkers: number;
  educationCoverage: number;
  recreationCoverage: number;
  safety: number;
  beauty: number;
}

export interface BuildingDefinition {
  id: string;
  techTier: number;
  moneyCost: number;
  varumCost: number;
  buildCycles: number;
  workers: number;
  priority: number;
  jobCategory?: string;
  moneyPerWorker: number;
  moneyCapAdd: number;
  powerProduction: number;
  powerCapAdd: number;
  powerUse: number;
  waterProduction: number;
  waterCapAdd: number;
  waterUse: number;
  varumProduction: number;
  varumCapAdd: number;
  techProduction: number;
  upkeep: number;
  housingAdd: number;
  educationCoverageAdd: number;
  recreationCoverageAdd: number;
  safetyAdd: number;
  combatSpawn: Record<string, number>;
  constructionSlotsAdd: number;
  footprintCellsX: number;
  footprintCellsZ: number;
}

export type PropDecorClass = "visual" | "beauty" | "activity_anchor";

export interface PropDefinition {
  id: string;
  group: string;
  sizeXMeters: number;
  sizeZMeters: number;
  snapMeters: number;
  moneyCost: number;
  decorClass: PropDecorClass;
  beauty: number;
  activityAnchor?: string;
}

export interface BlockerDefinition {
  id: string;
  moneyCost: number;
  varumCost: number;
  clearCycles: number;
  techTier: number;
  radius: number;
}

export interface WeatherModifierDefinition {
  citizenPowerMult: number;
  citizenWaterMult: number;
  travelCostMult: number;
  outdoorActivityMult: number;
  civilianTrafficMult: number;
}

export interface WeatherDefinitions {
  seasonDurationSeconds: number;
  normalEpisodeMinSeconds: number;
  normalEpisodeMaxSeconds: number;
  severeEpisodeMinSeconds: number;
  severeEpisodeMaxSeconds: number;
  severeCooldownSeconds: number;
  seasonWeights: Record<Season, Partial<Record<WeatherKind, number>>>;
  modifiers: Partial<Record<WeatherKind, WeatherModifierDefinition>>;
}

export interface WeatherState {
  season: Season;
  seasonProgress: number;
  climateSeed: number;
  current: WeatherKind;
  episodeIndex: number;
  episodeSeed: number;
  episodeRemainingSeconds: number;
  severeCooldownRemainingSeconds: number;
}

export interface CombatActorDefinition {
  id: string;
  side: "DEFENDER" | "ENEMY";
  hp: number;
  dps: number;
  armor: number;
  target: "ground" | "ground_and_light_air" | "air" | "air_and_ground";
  class: string;
}

export interface SimulationDefinitions {
  buildings: Record<string, BuildingDefinition>;
  defenders: Record<string, CombatActorDefinition>;
  enemies: Record<string, CombatActorDefinition>;
  blockers: Record<string, BlockerDefinition>;
  props: Record<string, PropDefinition>;
  gridCellMeters: number;
  referenceCycleSeconds: number;
  weather?: WeatherDefinitions;
}

export interface BuildingInstance {
  id: string;
  definitionId: string;
  position: Vec3;
  rotationY: number;
  constructionState: ConstructionState;
  constructionRemainingSeconds: number;
  constructionTotalSeconds: number;
  workersAssigned: number;
  priority: number;
  condition: number;
  damageState: DamageState;
  repairRemainingSeconds: number;
}

export interface RoadSegment {
  id: string;
  type: "DIRT";
  from: Vec3;
  to: Vec3;
}

export interface BlockerInstance {
  id: string;
  definitionId: string;
  position: Vec3;
  state: "BLOCKING" | "CLEARING";
  clearRemainingSeconds: number;
}

export interface PropInstance {
  id: string;
  definitionId: string;
  position: Vec3;
  rotationY: number;
}

export interface CombatActor {
  id: string;
  definitionId: string;
  side: "DEFENDER" | "ENEMY";
  hp: number;
  maxHp: number;
  position: Vec3;
}

export interface CombatState {
  id: string;
  status: "WARNING" | "ACTIVE" | "RESOLVED";
  warningRemainingSeconds: number;
  elapsedSeconds: number;
  actors: CombatActor[];
  outcome?: CombatOutcome;
  summary?: string;
}

export interface WorldEvent {
  id: string;
  type: string;
  happenedAt: string;
  severity: number;
  summary: string;
}

export interface WorldState {
  worldId: string;
  ownerId: string;
  seed: number;
  revision: number;
  lifecycle: WorldLifecycle;
  speed: WorldSpeed;
  simulationSeconds: number;
  lastSimulatedAt: string;
  resources: ResourceState;
  society: SocietyState;
  buildings: BuildingInstance[];
  roads: RoadSegment[];
  blockers: BlockerInstance[];
  props: PropInstance[];
  weather?: WeatherState;
  combat: CombatState | null;
  events: WorldEvent[];
}
