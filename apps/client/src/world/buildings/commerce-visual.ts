import * as THREE from "three";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addChimney,
  addDoor,
  addFlowerBox,
  addFoundation,
  addGabledRoof,
  addStoneStep,
  addWindow,
  box,
  finalizeBuilding,
  material,
  mesh,
  windowMaterial,
} from "./shared-building-visual";

function addTable(group: THREE.Group, x: number, z: number): void {
  const top = mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.07, 10),
    material("timber"),
    x,
    0.7,
    z,
    false,
  );
  group.add(top);
  box(group, 0.08, 0.62, 0.08, material("metal"), x, 0.36, z, false);
  for (const side of [-1, 1] as const) {
    box(group, 0.34, 0.08, 0.24, material("timber"), x + side * 0.48, 0.42, z, false);
  }
}

function addLantern(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  const glow = mesh(
    new THREE.CylinderGeometry(0.14, 0.2, 0.34, 8),
    windowMaterial(),
    x,
    y,
    z,
    false,
  );
  glow.userData.buildingGlow = true;
  group.add(glow);
  box(group, 0.04, 0.54, 0.04, material(identity.trimTone), x, y + 0.34, z, false);
}

export function createRestaurantVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 6;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 5;
  const h = 2.95;

  addFoundation(group, width, depth);
  box(group, width * 0.9, h, depth * 0.8, material(identity.wallTone), 0, h / 2 + 0.34, 0);
  addGabledRoof(group, width * 0.96, depth * 0.86, h + 0.34, identity, 0.9);
  addDoor(group, width * 0.2, depth * 0.4 + 0.08, identity);
  addStoneStep(group, width * 0.2, depth * 0.46 + 0.3, 1.2);
  addWindow(group, -width * 0.25, 1.6, depth * 0.4 + 0.09, identity);
  addFlowerBox(group, -width * 0.25, 1.1, depth * 0.43 + 0.13, identity);

  switch (identity.variantName) {
    case "courtyard_kitchen": {
      const canopy = box(
        group,
        width * 0.5,
        0.12,
        1.15,
        material(identity.roofTone),
        -width * 0.13,
        2.14,
        depth * 0.56,
      );
      canopy.rotation.x = -0.08;
      for (const x of [-width * 0.32, width * 0.06]) {
        box(group, 0.08, 1.8, 0.08, material(identity.trimTone), x, 0.9, depth * 0.62, false);
      }
      addTable(group, -width * 0.2, depth * 0.68);
      addTable(group, width * 0.22, depth * 0.66);
      addChimney(group, width * 0.31, -depth * 0.18, h + 0.18, identity);
      break;
    }

    case "corner_cafe": {
      for (const x of [-width * 0.3, 0]) {
        const pane = box(
          group,
          width * 0.22,
          1.1,
          0.06,
          windowMaterial(),
          x,
          1.55,
          depth * 0.41 + 0.1,
          false,
        );
        pane.userData.buildingGlow = true;
      }
      box(
        group,
        width * 0.46,
        0.28,
        0.08,
        material(identity.trimTone),
        -width * 0.14,
        2.4,
        depth * 0.42 + 0.12,
        false,
      );
      addTable(group, -width * 0.28, depth * 0.67);
      addTable(group, width * 0.02, depth * 0.7);
      break;
    }

    case "lantern_porch": {
      const porch = box(
        group,
        width * 0.76,
        0.14,
        1.45,
        material(identity.roofTone),
        0,
        2.38,
        depth * 0.56,
      );
      porch.rotation.x = -0.08;
      for (const x of [-width * 0.32, -width * 0.1, width * 0.12, width * 0.34]) {
        box(group, 0.08, 2.0, 0.08, material(identity.trimTone), x, 1, depth * 0.65, false);
      }
      addLantern(group, -width * 0.22, 2.0, depth * 0.68, identity);
      addLantern(group, width * 0.22, 2.0, depth * 0.68, identity);
      addTable(group, -width * 0.24, depth * 0.82);
      addTable(group, width * 0.24, depth * 0.82);
      break;
    }

    default: {
      const awning = box(
        group,
        width * 0.55,
        0.12,
        0.95,
        material("awning"),
        -width * 0.14,
        2.2,
        depth * 0.52,
      );
      awning.rotation.x = -0.12;
      addTable(group, -width * 0.25, depth * 0.68);
      addTable(group, width * 0.18, depth * 0.68);
      break;
    }
  }

  return finalizeBuilding(group, building, identity, 4.7);
}
