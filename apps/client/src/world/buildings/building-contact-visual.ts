import * as THREE from "three";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import { box, material, mesh } from "./shared-building-visual";

function footprint(meta: BuildCatalogEntryDto | undefined, fallbackX: number, fallbackZ: number) {
  return {
    width: meta ? meta.footprintCellsX * meta.gridCellMeters : fallbackX,
    depth: meta ? meta.footprintCellsZ * meta.gridCellMeters : fallbackZ,
  };
}

function addSteppingStones(
  group: THREE.Group,
  depth: number,
  count: number,
  width = 0.62,
): void {
  for (let i = 0; i < count; i += 1) {
    const stone = mesh(
      new THREE.CylinderGeometry(width * 0.5, width * 0.54, 0.06, 8),
      material("stoneWarm"),
      (i % 2 === 0 ? -1 : 1) * 0.05,
      0.07,
      depth * 0.5 + 0.45 + i * 0.55,
      false,
    );
    stone.rotation.y = i * 0.23;
    group.add(stone);
  }
}

function addGardenBeds(
  group: THREE.Group,
  width: number,
  depth: number,
  identity: BuildingVisualIdentity,
): void {
  for (const side of [-1, 1] as const) {
    box(
      group,
      width * 0.22,
      0.07,
      0.58,
      material("soil"),
      side * width * 0.31,
      0.045,
      depth * 0.54,
      false,
    );
    for (let i = 0; i < 3; i += 1) {
      const blossom = mesh(
        new THREE.OctahedronGeometry(0.07 + i * 0.01, 0),
        material(i === 1 ? identity.accentTone : "plasterWarm"),
        side * width * 0.31 + (i - 1) * 0.18,
        0.18 + (i % 2) * 0.05,
        depth * 0.56,
        false,
      );
      group.add(blossom);
    }
  }
}

function addCivicApron(
  group: THREE.Group,
  width: number,
  depth: number,
  identity: BuildingVisualIdentity,
): void {
  box(
    group,
    width * 0.82,
    0.055,
    Math.min(1.8, depth * 0.28),
    material("stoneWarm"),
    0,
    0.035,
    depth * 0.52,
    false,
  );
  box(
    group,
    1.35,
    0.045,
    2.4,
    material("stone"),
    0,
    0.03,
    depth * 0.68 + 0.75,
    false,
  );
  for (const side of [-1, 1] as const) {
    const planter = box(
      group,
      0.46,
      0.3,
      0.46,
      material(identity.trimTone),
      side * width * 0.34,
      0.15,
      depth * 0.55,
      false,
    );
    planter.rotation.y = side * 0.06;
    group.add(
      mesh(
        new THREE.DodecahedronGeometry(0.24, 0),
        material("grass"),
        side * width * 0.34,
        0.46,
        depth * 0.55,
        false,
      ),
    );
  }
}

function addIndustrialYard(
  group: THREE.Group,
  width: number,
  depth: number,
  identity: BuildingVisualIdentity,
): void {
  box(
    group,
    width * 0.92,
    0.05,
    depth * 0.34,
    material("stone"),
    0,
    0.028,
    depth * 0.5 + depth * 0.12,
    false,
  );
  for (const x of [-width * 0.22, width * 0.22]) {
    box(
      group,
      0.16,
      0.025,
      depth * 0.28,
      material("metal"),
      x,
      0.06,
      depth * 0.58,
      false,
    );
  }
  for (let i = 0; i < 3; i += 1) {
    box(
      group,
      0.42,
      0.28,
      0.42,
      material(i === 2 ? identity.accentTone : "timber"),
      -width * 0.32 + i * 0.46,
      0.15,
      -depth * 0.55,
      false,
    );
  }
}

function addWaterServiceEdge(
  group: THREE.Group,
  width: number,
  depth: number,
): void {
  box(
    group,
    width * 0.86,
    0.05,
    depth * 0.3,
    material("stoneWarm"),
    0,
    0.03,
    depth * 0.52,
    false,
  );
  const channel = box(
    group,
    width * 0.48,
    0.025,
    0.24,
    material("water", 0.3),
    0,
    0.065,
    depth * 0.68,
    false,
  );
  channel.userData.propWater = true;
}

export function addBuildingGroundContact(
  visual: THREE.Group,
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): void {
  if (building.constructionState !== "COMPLETE") return;

  const fallback =
    building.definitionId === "town_center"
      ? { x: 8, z: 8 }
      : building.definitionId === "power_plant" || building.definitionId === "water_plant"
        ? { x: 7, z: 6 }
        : building.definitionId === "workshop"
          ? { x: 6, z: 5 }
          : { x: 5, z: 4 };

  const { width, depth } = footprint(meta, fallback.x, fallback.z);

  switch (building.definitionId) {
    case "house_small":
      addSteppingStones(visual, depth, 3);
      addGardenBeds(visual, width, depth, identity);
      break;
    case "town_center":
    case "school":
    case "guard_post":
      addCivicApron(visual, width, depth, identity);
      break;
    case "workshop":
    case "power_plant":
    case "builders_yard":
      addIndustrialYard(visual, width, depth, identity);
      break;
    case "water_plant":
      addWaterServiceEdge(visual, width, depth);
      break;
    case "restaurant":
      addCivicApron(visual, width, depth, identity);
      break;
    case "farm":
      box(
        visual,
        width * 0.92,
        0.045,
        depth * 0.35,
        material("soil"),
        0,
        0.028,
        depth * 0.54,
        false,
      );
      break;
    default:
      break;
  }
}
