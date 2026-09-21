import * as THREE from "three";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addDoor,
  addFoundation,
  addGabledRoof,
  addStoneStep,
  addTimberFront,
  addWindow,
  box,
  finalizeBuilding,
  material,
  mesh,
  windowMaterial,
} from "./shared-building-visual";

export function createTownCenterVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 8;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 8;
  const h = 4;

  addFoundation(group, width, depth);
  box(group, width * 0.9, h, depth * 0.84, material(identity.wallTone), 0, h / 2 + 0.34, 0);
  addTimberFront(group, width * 0.9, depth * 0.84, h, identity);
  addGabledRoof(group, width * 0.98, depth * 0.9, h + 0.34, identity, 1.35);
  addDoor(group, 0, depth * 0.42 + 0.08, identity, 1.2, 1.9);
  addStoneStep(group, 0, depth * 0.47 + 0.34, 1.7);

  for (const x of [-width * 0.28, width * 0.28]) {
    addWindow(group, x, 1.75, depth * 0.42 + 0.09, identity);
    addWindow(group, x, 3.05, depth * 0.42 + 0.09, identity);
  }

  if (identity.variantName === "clock_hall") {
    box(group, 1.75, 2.15, 1.75, material(identity.secondaryWallTone), 0, h + 1.2, 0);
    addGabledRoof(group, 2.1, 2.1, h + 2.28, identity, 0.85);
    const clock = mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.08, 18),
      material("cream"),
      0,
      h + 1.45,
      0.91,
      false,
    );
    clock.rotation.x = Math.PI / 2;
    group.add(clock);
  } else if (identity.variantName === "bell_porch_hall") {
    const tx = -width * 0.28;
    box(group, 1.55, 2.45, 1.55, material(identity.secondaryWallTone), tx, h + 1.35, 0);
    addGabledRoof(group, 1.9, 1.9, h + 2.58, identity, 0.78);
    const bell = mesh(
      new THREE.ConeGeometry(0.25, 0.38, 10),
      material(identity.accentTone, 0.45, 0.3),
      tx,
      h + 1.65,
      depth * 0.44,
      false,
    );
    bell.rotation.x = Math.PI;
    group.add(bell);
    const porch = box(group, width * 0.5, 0.14, 1.25, material(identity.roofTone), width * 0.16, 2.75, depth * 0.53);
    porch.rotation.x = -0.08;
    for (const x of [-width * 0.06, width * 0.18, width * 0.4]) {
      box(group, 0.1, 2.2, 0.1, material(identity.trimTone), x, 1.1, depth * 0.61, false);
    }
  } else {
    for (const x of [-width * 0.25, width * 0.25]) {
      box(group, width * 0.27, 1, depth * 0.34, material(identity.secondaryWallTone), x, h + 0.4, depth * 0.12);
      addGabledRoof(group, width * 0.32, depth * 0.38, h + 0.9, identity, 0.48);
    }
    const lantern = mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 0.5, 8),
      windowMaterial(),
      0,
      h + 0.78,
      depth * 0.45,
      false,
    );
    lantern.userData.buildingGlow = true;
    group.add(lantern);
  }

  box(
    group,
    width * 0.32,
    0.12,
    0.52,
    material(identity.trimTone),
    -width * 0.25,
    0.55,
    depth * 0.5 + 0.35,
    false,
  );

  return finalizeBuilding(group, building, identity, 6.5);
}
