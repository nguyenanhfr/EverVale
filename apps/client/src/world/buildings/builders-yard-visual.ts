import * as THREE from "three";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  box,
  finalizeBuilding,
  material,
  mesh,
} from "./shared-building-visual";

function addMaterialStacks(
  group: THREE.Group,
  width: number,
  depth: number,
  stone = false,
): void {
  for (let i = 0; i < 5; i += 1) {
    box(
      group,
      0.62,
      0.28 + (i % 2) * 0.08,
      0.55,
      material(stone ? "stone" : "timber"),
      width * 0.18 + (i % 3) * 0.56,
      0.15 + Math.floor(i / 3) * 0.31,
      -depth * 0.28 + Math.floor(i / 3) * 0.52,
      false,
    );
  }
}

function addHoist(
  group: THREE.Group,
  x: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  box(group, 0.09, 3.1, 0.09, material("metal"), x, 1.55, z, false);
  box(group, 1.85, 0.09, 0.09, material("metal"), x + 0.84, 2.95, z, false);
  box(group, 0.04, 1.25, 0.04, material("metal"), x + 1.55, 2.28, z, false);
  const hook = mesh(
    new THREE.TorusGeometry(0.13, 0.035, 5, 10, Math.PI * 1.45),
    material(identity.accentTone),
    x + 1.55,
    1.62,
    z,
    false,
  );
  group.add(hook);
}

export function createBuildersYardVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 7;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 6;
  const shedH = 2.4;

  box(group, width * 0.96, 0.08, depth * 0.96, material("soil"), 0, 0.04, 0, false);
  box(group, width * 0.52, shedH, depth * 0.6, material(identity.wallTone), -width * 0.16, shedH / 2, 0);
  const roof = box(
    group,
    width * 0.6,
    0.16,
    depth * 0.7,
    material(identity.roofTone),
    -width * 0.16,
    shedH + 0.12,
    0,
  );
  roof.rotation.z = -0.06;

  switch (identity.variantName) {
    case "saw_shed": {
      const saw = mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.05, 16),
        material("metal", 0.55, 0.32),
        width * 0.26,
        0.72,
        depth * 0.22,
        false,
      );
      saw.rotation.x = Math.PI / 2;
      group.add(saw);
      for (let i = 0; i < 5; i += 1) {
        box(
          group,
          0.9,
          0.1,
          0.18,
          material("timber"),
          width * 0.18 + (i % 2) * 0.22,
          0.12 + i * 0.08,
          -depth * 0.42,
          false,
        );
      }
      break;
    }

    case "stone_yard": {
      addMaterialStacks(group, width, depth, true);
      addHoist(group, width * 0.12, depth * 0.34, identity);
      break;
    }

    case "scaffold_court": {
      for (const x of [-width * 0.44, width * 0.44]) {
        box(group, 0.07, 2.9, 0.07, material("metal"), x, 1.45, depth * 0.35, false);
      }
      for (const y of [0.7, 1.5, 2.3]) {
        box(group, width * 0.88, 0.07, 0.07, material("metal"), 0, y, depth * 0.35, false);
      }
      for (const x of [-width * 0.3, 0, width * 0.3]) {
        box(group, 0.6, 0.08, 0.22, material("timber"), x, 0.42, -depth * 0.48, false);
      }
      break;
    }

    default: {
      addHoist(group, width * 0.08, depth * 0.34, identity);
      addMaterialStacks(group, width, depth, false);
      break;
    }
  }

  return finalizeBuilding(group, building, identity, 4.2);
}
