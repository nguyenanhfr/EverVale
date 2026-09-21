import type { BuildingInstance } from "@evervale/domain/world.types";

export type VisualDialectId = "hearthstone" | "willowbrook" | "amberfield" | "bluebell";

export type BuildingMaterialTone =
  | "plaster"
  | "plasterWarm"
  | "plasterSage"
  | "plasterOchre"
  | "plasterCool"
  | "cream"
  | "stone"
  | "stoneWarm"
  | "brick"
  | "brickDark"
  | "timber"
  | "timberLight"
  | "timberDark"
  | "roof"
  | "roofWarm"
  | "roofGreen"
  | "roofBlue"
  | "roofRust"
  | "copper"
  | "brass";

export interface WorldVisualDialect {
  id: VisualDialectId;
  label: string;
  wallPrimary: BuildingMaterialTone;
  wallSecondary: BuildingMaterialTone;
  roofPrimary: BuildingMaterialTone;
  roofSecondary: BuildingMaterialTone;
  trim: BuildingMaterialTone;
  accent: BuildingMaterialTone;
  foliageBias: number;
}

export interface BuildingVisualIdentity {
  dialect: WorldVisualDialect;
  variantIndex: number;
  variantName: string;
  wallTone: BuildingMaterialTone;
  secondaryWallTone: BuildingMaterialTone;
  roofTone: BuildingMaterialTone;
  trimTone: BuildingMaterialTone;
  accentTone: BuildingMaterialTone;
  clutterSeed: number;
}

export type CitizenPresentationRole =
  | "school_child"
  | "casual_resident"
  | "workshop_worker"
  | "utility_technician"
  | "teacher"
  | "guard"
  | "builder"
  | "farmer"
  | "cafe_worker"
  | "service_crew";

export interface CitizenVisualIdentity {
  role: CitizenPresentationRole;
  paletteIndex: number;
  bodyVariant: number;
  hairVariant: number;
  skinVariant: number;
  headwearVariant: number;
  accessoryVariant: number;
}

const dialects: readonly WorldVisualDialect[] = [
  {
    id: "hearthstone",
    label: "Hearthstone",
    wallPrimary: "plaster",
    wallSecondary: "plasterWarm",
    roofPrimary: "roofWarm",
    roofSecondary: "roof",
    trim: "timberDark",
    accent: "copper",
    foliageBias: 0,
  },
  {
    id: "willowbrook",
    label: "Willowbrook",
    wallPrimary: "plasterSage",
    wallSecondary: "cream",
    roofPrimary: "roofGreen",
    roofSecondary: "roof",
    trim: "timberLight",
    accent: "copper",
    foliageBias: 1,
  },
  {
    id: "amberfield",
    label: "Amberfield",
    wallPrimary: "plasterOchre",
    wallSecondary: "plasterWarm",
    roofPrimary: "roofRust",
    roofSecondary: "roofWarm",
    trim: "timberDark",
    accent: "brass",
    foliageBias: 2,
  },
  {
    id: "bluebell",
    label: "Bluebell",
    wallPrimary: "plasterCool",
    wallSecondary: "stoneWarm",
    roofPrimary: "roofBlue",
    roofSecondary: "roofGreen",
    trim: "timber",
    accent: "copper",
    foliageBias: 3,
  },
] as const;

const variantNames: Record<string, readonly string[]> = {
  town_center: ["clock_hall", "bell_porch_hall", "twin_gable_hall"],
  house_small: [
    "flower_gable",
    "side_porch",
    "dormer_cottage",
    "stone_end_cottage",
    "craft_cottage",
    "laundry_garden",
  ],
  workshop: ["wheel_yard", "forge_stack", "loading_shed", "saw_court"],
  power_plant: ["twin_stack", "turbine_hall", "generator_annex"],
  water_plant: ["twin_cistern", "pump_court", "filter_house"],
  school: ["bell_gable", "courtyard_school", "classroom_annex"],
  park: ["fountain_grove", "duck_pond", "play_lawn", "reading_garden"],
  guard_post: ["lodge_yard", "watch_court", "gate_lodge"],
  farm: ["barnyard", "silo_farm", "orchard_edge", "animal_court"],
  restaurant: ["awning_terrace", "courtyard_kitchen", "corner_cafe", "lantern_porch"],
  builders_yard: ["hoist_yard", "saw_shed", "stone_yard", "scaffold_court"],
};

export function stableVisualHash(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 16;
  return h >>> 0;
}

export function resolveWorldVisualDialect(worldSeed: string): WorldVisualDialect {
  return dialects[stableVisualHash(worldSeed) % dialects.length]!;
}

function variantList(definitionId: string): readonly string[] {
  return variantNames[definitionId] ?? ["standard", "alternate"];
}

function makeBuildingIdentity(
  worldSeed: string,
  building: BuildingInstance,
  forcedVariant?: number,
): BuildingVisualIdentity {
  const dialect = resolveWorldVisualDialect(worldSeed);
  const variants = variantList(building.definitionId);
  const base = stableVisualHash(
    `${worldSeed}:${building.definitionId}:${building.id}:${Math.round(building.position.x)}:${Math.round(building.position.z)}`,
  );
  const variantIndex = forcedVariant ?? base % variants.length;
  const secondary = (base >>> 7) % 2 === 0;
  return {
    dialect,
    variantIndex,
    variantName: variants[variantIndex]!,
    wallTone: secondary ? dialect.wallSecondary : dialect.wallPrimary,
    secondaryWallTone: secondary ? dialect.wallPrimary : dialect.wallSecondary,
    roofTone: (base >>> 9) % 2 === 0 ? dialect.roofPrimary : dialect.roofSecondary,
    trimTone: dialect.trim,
    accentTone: dialect.accent,
    clutterSeed: base,
  };
}

export function resolveBuildingVisualIdentities(
  worldSeed: string,
  buildings: readonly BuildingInstance[],
): Map<string, BuildingVisualIdentity> {
  const result = new Map<string, BuildingVisualIdentity>();
  const ordered = [...buildings].sort(
    (a, b) =>
      a.definitionId.localeCompare(b.definitionId) ||
      a.position.z - b.position.z ||
      a.position.x - b.position.x ||
      a.id.localeCompare(b.id),
  );

  for (const building of ordered) {
    const variants = variantList(building.definitionId);
    let identity = makeBuildingIdentity(worldSeed, building);

    if (variants.length > 1) {
      const nearbySame = ordered
        .filter(
          (other) =>
            other.id !== building.id &&
            other.definitionId === building.definitionId &&
            result.has(other.id) &&
            Math.hypot(
              other.position.x - building.position.x,
              other.position.z - building.position.z,
            ) <= 18,
        )
        .map((other) => result.get(other.id)!.variantIndex);

      if (nearbySame.includes(identity.variantIndex)) {
        for (let step = 1; step < variants.length; step += 1) {
          const candidate = (identity.variantIndex + step) % variants.length;
          if (!nearbySame.includes(candidate)) {
            identity = makeBuildingIdentity(worldSeed, building, candidate);
            break;
          }
        }
      }
    }

    result.set(building.id, identity);
  }

  return result;
}

export function citizenRoleForWorkplace(
  child: boolean,
  workplaceDefinitionId?: string,
): CitizenPresentationRole {
  if (child) return "school_child";
  switch (workplaceDefinitionId) {
    case "workshop":
      return "workshop_worker";
    case "power_plant":
    case "water_plant":
      return "utility_technician";
    case "school":
      return "teacher";
    case "guard_post":
      return "guard";
    case "farm":
      return "farmer";
    case "restaurant":
      return "cafe_worker";
    case "builders_yard":
      return "builder";
    default:
      return "casual_resident";
  }
}

export function resolveCitizenVisualIdentity(
  worldSeed: string,
  index: number,
  role: CitizenPresentationRole,
): CitizenVisualIdentity {
  const hash = stableVisualHash(`${worldSeed}:citizen:${index}:${role}`);
  return {
    role,
    paletteIndex: hash % 10,
    bodyVariant: (hash >>> 4) % 6,
    hairVariant: (hash >>> 8) % 12,
    skinVariant: (hash >>> 12) % 8,
    headwearVariant: (hash >>> 16) % 5,
    accessoryVariant: (hash >>> 20) % 6,
  };
}
