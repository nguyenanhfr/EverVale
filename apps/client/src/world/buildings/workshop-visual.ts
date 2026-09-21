import * as THREE from "three";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addDoor,
  addFoundation,
  addWindow,
  box,
  finalizeBuilding,
  material,
  mesh,
} from "./shared-building-visual";

function addCrates(group: THREE.Group, width: number, depth: number): void {
  for (let i = 0; i < 4; i += 1) {
    box(
      group,
      0.5,
      0.34 + (i % 2) * 0.08,
      0.48,
      material("timber"),
      -width * 0.34 + i * 0.46,
      0.18,
      -depth * 0.56,
      false,
    );
  }
}

export function createWorkshopVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 6;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 5;
  const h = 3.25;

  addFoundation(group, width, depth);
  box(
    group,
    width * 0.9,
    h,
    depth * 0.86,
    material(identity.variantName === "forge_stack" ? "brickDark" : "brick"),
    0,
    h / 2 + 0.34,
    0,
  );
  box(group, width * 0.74, 0.2, depth * 0.98, material(identity.roofTone), 0, h + 0.52, 0);
  addDoor(group, width * 0.2, depth * 0.43 + 0.08, identity, 1.35, 1.85);
  addWindow(group, -width * 0.25, 1.72, depth * 0.43 + 0.09, identity);

  switch (identity.variantName) {
    case "forge_stack": {
      const stack = mesh(
        new THREE.CylinderGeometry(0.32, 0.42, 2.6, 9),
        material("metal", 0.68, 0.25),
        -width * 0.3,
        h + 1.05,
        -depth * 0.2,
      );
      group.add(stack);
      box(
        group,
        width * 0.34,
        1.5,
        depth * 0.42,
        material(identity.secondaryWallTone),
        width * 0.36,
        0.92,
        -depth * 0.08,
      );
      box(group, 0.74, 0.54, 0.64, material("stone"), width * 0.24, 0.4, depth * 0.44, false);
      break;
    }

    case "loading_shed": {
      box(
        group,
        width * 0.38,
        2.05,
        depth * 0.62,
        material(identity.secondaryWallTone),
        -width * 0.38,
        1.03,
        -depth * 0.02,
      );
      const shedRoof = box(
        group,
        width * 0.46,
        0.14,
        depth * 0.72,
        material(identity.roofTone),
        -width * 0.38,
        2.13,
        -depth * 0.02,
      );
      shedRoof.rotation.z = 0.08;
      addCrates(group, width, depth);
      break;
    }

    case "saw_court": {
      const canopy = box(
        group,
        width * 0.72,
        0.12,
        1.05,
        material(identity.roofTone),
        0,
        2.35,
        depth * 0.55,
      );
      canopy.rotation.x = -0.1;
      for (const x of [-width * 0.3, 0, width * 0.3]) {
        box(group, 0.08, 2.1, 0.08, material("metal"), x, 1.05, depth * 0.64, false);
      }
      const saw = mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.05, 16),
        material("metal", 0.55, 0.3),
        width * 0.26,
        0.72,
        depth * 0.48,
        false,
      );
      saw.rotation.x = Math.PI / 2;
      group.add(saw);
      for (let i = 0; i < 5; i += 1) {
        box(
          group,
          0.78,
          0.1,
          0.18,
          material("timber"),
          -width * 0.3 + i * 0.32,
          0.11 + i * 0.035,
          -depth * 0.55,
          false,
        );
      }
      break;
    }

    default: {
      const awning = box(
        group,
        width * 0.42,
        0.13,
        0.95,
        material(identity.accentTone, 0.65, 0.18),
        width * 0.2,
        h * 0.62,
        depth * 0.49 + 0.4,
      );
      awning.rotation.x = -0.12;
      const wheel = mesh(
        new THREE.TorusGeometry(0.62, 0.12, 8, 18),
        material("metal", 0.55, 0.35),
        -width * 0.32,
        1.25,
        depth * 0.46 + 0.13,
        false,
      );
      group.add(wheel);
      addCrates(group, width, depth);
      break;
    }
  }

  return finalizeBuilding(group, building, identity, 4.8);
}
