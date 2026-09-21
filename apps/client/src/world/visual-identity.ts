import type { BuildingInstance } from "@evervale/domain/world.types";
import {
  BUILDING_VARIANT_IDS,
  CITIZEN_PRESENTATION_ROLE_IDS,
  VISUAL_DIALECT_IDS,
} from "./generated/visual-identity-data";

export type VisualDialectId = (typeof VISUAL_DIALECT_IDS)[number];
export type CitizenPresentationRole = (typeof CITIZEN_PRESENTATION_ROLE_IDS)[number];
export type BuildingVisualFamilyId = keyof typeof BUILDING_VARIANT_IDS;

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
  wallPrimary: BuildingMaterialTone;
  wallSecondary: BuildingMaterialTone;
  roofPrimary: BuildingMaterialTone;
  roofSecondary: BuildingMaterialTone;
  trim: BuildingMaterialTone;
  accent: BuildingMaterialTone;
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

export interface CitizenVisualIdentity {
  role: CitizenPresentationRole;
  paletteIndex: number;
  bodyVariant: number;
  hairVariant: number;
  skinVariant: number;
  headwearVariant: number;
  accessoryVariant: number;
}

const dialects: Record<VisualDialectId, WorldVisualDialect> = {
  hearthstone: {
    id: "hearthstone",
    wallPrimary: "plaster",
    wallSecondary: "plasterWarm",
    roofPrimary: "roofWarm",
    roofSecondary: "roof",
    trim: "timberDark",
    accent: "copper",
  },
  willowbrook: {
    id: "willowbrook",
    wallPrimary: "plasterSage",
    wallSecondary: "cream",
    roofPrimary: "roofGreen",
    roofSecondary: "roof",
    trim: "timberLight",
    accent: "copper",
  },
  amberfield: {
    id: "amberfield",
    wallPrimary: "plasterOchre",
    wallSecondary: "plasterWarm",
    roofPrimary: "roofRust",
    roofSecondary: "roofWarm",
    trim: "timberDark",
    accent: "brass",
  },
  bluebell: {
    id: "bluebell",
    wallPrimary: "plasterCool",
    wallSecondary: "stoneWarm",
    roofPrimary: "roofBlue",
    roofSecondary: "roofGreen",
    trim: "timber",
    accent: "copper",
  },
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

function seedString(seed: string | number): string {
  return String(seed);
}

export function resolveWorldVisualDialect(seed: string | number): WorldVisualDialect {
  const id = VISUAL_DIALECT_IDS[
    stableVisualHash(seedString(seed)) % VISUAL_DIALECT_IDS.length
  ]!;
  return dialects[id];
}

function isVisualFamily(id: string): id is BuildingVisualFamilyId {
  return Object.prototype.hasOwnProperty.call(BUILDING_VARIANT_IDS, id);
}

function variantNames(definitionId: string): readonly string[] {
  return isVisualFamily(definitionId)
    ? BUILDING_VARIANT_IDS[definitionId]
    : ["standard"];
}

function primaryBuildingSeed(seed: string | number, building: BuildingInstance): string {
  const rotationBucket = Math.round(building.rotationY / (Math.PI / 4));
  return [
    seedString(seed),
    building.definitionId,
    Math.round(building.position.x * 2) / 2,
    Math.round(building.position.z * 2) / 2,
    rotationBucket,
  ].join(":");
}

function resolveOne(
  seed: string | number,
  building: BuildingInstance,
  forcedVariant?: number,
): BuildingVisualIdentity {
  const dialect = resolveWorldVisualDialect(seed);
  const variants = variantNames(building.definitionId);
  const base = stableVisualHash(primaryBuildingSeed(seed, building));
  const variantIndex = forcedVariant ?? base % variants.length;
  const secondary = ((base >>> 7) & 1) === 1;
  return {
    dialect,
    variantIndex,
    variantName: variants[variantIndex]!,
    wallTone: secondary ? dialect.wallSecondary : dialect.wallPrimary,
    secondaryWallTone: secondary ? dialect.wallPrimary : dialect.wallSecondary,
    roofTone: ((base >>> 9) & 1) === 1 ? dialect.roofSecondary : dialect.roofPrimary,
    trimTone: dialect.trim,
    accentTone: dialect.accent,
    clutterSeed: stableVisualHash(
      `${primaryBuildingSeed(seed, building)}:${building.id}:clutter`,
    ),
  };
}

export function resolveBuildingVisualIdentities(
  seed: string | number,
  buildings: readonly BuildingInstance[],
): Map<string, BuildingVisualIdentity> {
  const result = new Map<string, BuildingVisualIdentity>();
  const ordered = [...buildings].sort(
    (a, b) =>
      a.definitionId.localeCompare(b.definitionId) ||
      a.position.z - b.position.z ||
      a.position.x - b.position.x ||
      a.rotationY - b.rotationY ||
      a.id.localeCompare(b.id),
  );

  for (const building of ordered) {
    const variants = variantNames(building.definitionId);
    let identity = resolveOne(seed, building);

    if (variants.length > 1) {
      const occupied = ordered
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

      if (occupied.includes(identity.variantIndex)) {
        for (let offset = 1; offset < variants.length; offset += 1) {
          const candidate = (identity.variantIndex + offset) % variants.length;
          if (!occupied.includes(candidate)) {
            identity = resolveOne(seed, building, candidate);
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
    case "builders_yard":
      return "builder";
    case "farm":
      return "farmer";
    case "restaurant":
      return "cafe_worker";
    default:
      return "casual_resident";
  }
}

export function resolveCitizenVisualIdentity(
  seed: string | number,
  presentationSlot: number,
  role: CitizenPresentationRole,
): CitizenVisualIdentity {
  const hash = stableVisualHash(
    `${seedString(seed)}:citizen:${presentationSlot}:${role}`,
  );
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
