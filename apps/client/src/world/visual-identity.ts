import type { BuildingInstance } from "@evervale/domain/world.types";

export type WorldVisualDialect =
  | "hearthstone"
  | "willowbrook"
  | "amberfield"
  | "bluebell";

export interface BuildingVisualIdentity {
  dialect: WorldVisualDialect;
  variant: string;
  seed: number;
}

const DIALECTS: readonly WorldVisualDialect[] = [
  "hearthstone",
  "willowbrook",
  "amberfield",
  "bluebell",
];

const BUILDING_VARIANTS: Readonly<Record<string, readonly string[]>> = {
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
  restaurant: [
    "awning_terrace",
    "courtyard_kitchen",
    "corner_cafe_front",
    "lantern_dining_porch",
  ],
  builders_yard: ["hoist_yard", "saw_shed", "stone_yard", "scaffold_court"],
};

function hashText(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function rotationBucket(rotationY: number): number {
  const quarterTurns = Math.round(rotationY / (Math.PI / 2));
  return ((quarterTurns % 4) + 4) % 4;
}

function quantized(value: number): number {
  return Math.round(value * 2) / 2;
}

function identityKey(worldSeed: number, building: BuildingInstance): string {
  return [
    worldSeed,
    building.definitionId,
    quantized(building.position.x),
    quantized(building.position.z),
    rotationBucket(building.rotationY),
  ].join(":");
}

function distanceXZ(a: BuildingInstance, b: BuildingInstance): number {
  return Math.hypot(
    a.position.x - b.position.x,
    a.position.z - b.position.z,
  );
}

export function resolveWorldVisualDialect(worldSeed: number): WorldVisualDialect {
  return DIALECTS[hashText(`dialect:${worldSeed}`) % DIALECTS.length]!;
}

/**
 * Resolves presentation-only building identities for the current layout.
 *
 * The primary choice is stable from world seed + definition + quantized placement
 * + rotation bucket. A nearby same-family instance within 18m rotates to the next
 * legal authored variant when possible, preserving the canonical anti-clone rule.
 */
export function resolveBuildingVisualIdentities(
  worldSeed: number,
  buildings: readonly BuildingInstance[],
): Map<string, BuildingVisualIdentity> {
  const dialect = resolveWorldVisualDialect(worldSeed);
  const resolved = new Map<string, BuildingVisualIdentity>();
  const ordered = [...buildings].sort((a, b) =>
    a.definitionId.localeCompare(b.definitionId)
    || a.position.x - b.position.x
    || a.position.z - b.position.z
    || rotationBucket(a.rotationY) - rotationBucket(b.rotationY)
    || a.id.localeCompare(b.id)
  );

  for (const building of ordered) {
    const variants = BUILDING_VARIANTS[building.definitionId] ?? ["default"];
    const seed = hashText(identityKey(worldSeed, building));
    let index = seed % variants.length;

    if (variants.length > 1) {
      const nearbyUsed = new Set(
        ordered
          .filter((candidate) =>
            candidate !== building
            && candidate.definitionId === building.definitionId
            && resolved.has(candidate.id)
            && distanceXZ(candidate, building) <= 18
          )
          .map((candidate) => resolved.get(candidate.id)!.variant),
      );

      if (nearbyUsed.size < variants.length) {
        for (let attempt = 0; attempt < variants.length; attempt += 1) {
          const candidateIndex = (index + attempt) % variants.length;
          const candidateVariant = variants[candidateIndex]!;
          if (!nearbyUsed.has(candidateVariant)) {
            index = candidateIndex;
            break;
          }
        }
      }
    }

    resolved.set(building.id, {
      dialect,
      variant: variants[index]!,
      seed,
    });
  }

  return resolved;
}
