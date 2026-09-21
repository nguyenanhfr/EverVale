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

function addBikeRack(group: THREE.Group, width: number, depth: number): void {
  for (let i = 0; i < 3; i += 1) {
    const x = -width * 0.22 + i * width * 0.22;
    const wheelA = mesh(
      new THREE.TorusGeometry(0.18, 0.025, 5, 10),
      material("metal"),
      x - 0.12,
      0.22,
      depth * 0.56,
      false,
    );
    const wheelB = mesh(
      new THREE.TorusGeometry(0.18, 0.025, 5, 10),
      material("metal"),
      x + 0.12,
      0.22,
      depth * 0.56,
      false,
    );
    wheelA.rotation.y = Math.PI / 2;
    wheelB.rotation.y = Math.PI / 2;
    group.add(wheelA, wheelB);
  }
  box(group, width * 0.7, 0.06, 0.06, material("metal"), 0, 0.43, depth * 0.56, false);
}

function addSchoolBell(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  box(group, 0.78, 0.92, 0.62, material(identity.secondaryWallTone), x, y, z);
  const bell = mesh(
    new THREE.ConeGeometry(0.23, 0.34, 10),
    material(identity.accentTone, 0.45, 0.3),
    x,
    y + 0.18,
    z + 0.34,
    false,
  );
  bell.rotation.x = Math.PI;
  group.add(bell);
  addGabledRoof(group, 0.96, 0.78, y + 0.46, identity, 0.38);
}

export function createSchoolVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 7;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 6;
  const h = 3.25;

  addFoundation(group, width, depth);
  box(group, width * 0.88, h, depth * 0.8, material(identity.wallTone), 0, h / 2 + 0.34, 0);
  addTimberFront(group, width * 0.88, depth * 0.8, h, identity);
  addDoor(group, 0, depth * 0.4 + 0.08, identity, 1.05, 1.76);
  addStoneStep(group, 0, depth * 0.46 + 0.28, 1.5);

  switch (identity.variantName) {
    case "courtyard_school": {
      addGabledRoof(group, width * 0.62, depth * 0.86, h + 0.34, identity, 0.98);
      for (const side of [-1, 1] as const) {
        const x = side * width * 0.36;
        box(
          group,
          width * 0.24,
          h * 0.78,
          depth * 0.58,
          material(identity.secondaryWallTone),
          x,
          h * 0.39 + 0.34,
          -depth * 0.08,
        );
        addGabledRoof(group, width * 0.29, depth * 0.64, h * 0.78 + 0.34, identity, 0.62);
        addWindow(group, x, 1.58, depth * 0.3 + 0.05, identity);
      }
      for (const x of [-width * 0.19, width * 0.19]) {
        addWindow(group, x, 1.64, depth * 0.4 + 0.09, identity);
      }
      box(group, width * 0.46, 0.05, depth * 0.2, material("stoneWarm"), 0, 0.04, depth * 0.55, false);
      addBikeRack(group, width, depth);
      break;
    }

    case "classroom_annex": {
      addGabledRoof(group, width * 0.96, depth * 0.86, h + 0.34, identity, 1.05);
      const annexX = width * 0.38;
      box(
        group,
        width * 0.34,
        2.35,
        depth * 0.62,
        material(identity.secondaryWallTone),
        annexX,
        1.18,
        -depth * 0.06,
      );
      const annexRoof = box(
        group,
        width * 0.4,
        0.15,
        depth * 0.7,
        material(identity.roofTone),
        annexX,
        2.48,
        -depth * 0.06,
      );
      annexRoof.rotation.z = -0.08;
      for (const x of [-width * 0.29, -width * 0.08, width * 0.12]) {
        addWindow(group, x, 1.63, depth * 0.4 + 0.09, identity);
      }
      addWindow(group, annexX, 1.42, depth * 0.32 + 0.06, identity);
      box(
        group,
        width * 0.3,
        0.08,
        0.45,
        material(identity.trimTone),
        -width * 0.26,
        0.62,
        depth * 0.55,
        false,
      );
      addBikeRack(group, width, depth);
      break;
    }

    default: {
      addGabledRoof(group, width * 0.96, depth * 0.86, h + 0.34, identity, 1.08);
      for (const x of [-width * 0.3, -width * 0.1, width * 0.1, width * 0.3]) {
        addWindow(group, x, 1.64, depth * 0.4 + 0.09, identity);
      }
      addSchoolBell(group, 0, h + 0.72, 0, identity);
      addBikeRack(group, width, depth);
      break;
    }
  }

  return finalizeBuilding(group, building, identity, 5.6);
}

function addTrainingDummy(
  group: THREE.Group,
  x: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  box(group, 0.09, 1.55, 0.09, material("timber"), x, 0.78, z, false);
  box(group, 0.78, 0.08, 0.08, material("timber"), x, 1.22, z, false);
  const target = mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12),
    material(identity.accentTone),
    x,
    1.42,
    z + 0.06,
    false,
  );
  target.rotation.x = Math.PI / 2;
  group.add(target);
}

function addGuardBanner(
  group: THREE.Group,
  x: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  box(group, 0.06, 2.25, 0.06, material("metal"), x, 1.12, z, false);
  box(
    group,
    0.72,
    0.52,
    0.045,
    material(identity.accentTone),
    x + 0.36,
    1.9,
    z,
    false,
  );
}

export function createGuardPostVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 6;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 5;
  const h = 2.9;

  addFoundation(group, width, depth);
  box(group, width * 0.86, 1.0, depth * 0.8, material("stoneWarm"), 0, 0.84, 0);
  box(group, width * 0.78, h - 0.72, depth * 0.72, material(identity.wallTone), 0, 1.84, 0);
  addTimberFront(group, width * 0.78, depth * 0.72, h - 0.6, identity);
  addGabledRoof(group, width * 0.94, depth * 0.84, h + 0.34, identity, 0.92);
  addDoor(group, 0, depth * 0.36 + 0.08, identity);
  addWindow(group, -width * 0.22, 1.72, depth * 0.36 + 0.09, identity);
  addWindow(group, width * 0.22, 1.72, depth * 0.36 + 0.09, identity);

  switch (identity.variantName) {
    case "watch_court": {
      const tx = width * 0.34;
      box(group, 1.15, 2.25, 1.15, material(identity.secondaryWallTone), tx, 2.05, -depth * 0.16);
      box(group, 1.5, 0.12, 1.5, material(identity.roofTone), tx, 3.2, -depth * 0.16);
      for (const sx of [-0.46, 0.46]) {
        box(group, 0.07, 1.15, 0.07, material("timberDark"), tx + sx, 3.78, -depth * 0.16, false);
      }
      box(group, 1.0, 0.08, 0.08, material("timberDark"), tx, 4.28, -depth * 0.16, false);
      addGuardBanner(group, -width * 0.43, depth * 0.5, identity);
      break;
    }

    case "gate_lodge": {
      for (const side of [-1, 1] as const) {
        const x = side * width * 0.36;
        box(group, 0.5, 2.0, 0.5, material("stone"), x, 1.0, depth * 0.56, false);
        box(group, 0.68, 0.12, 0.68, material(identity.accentTone), x, 2.04, depth * 0.56, false);
      }
      box(group, width * 0.72, 0.09, 0.09, material("timberDark"), 0, 1.72, depth * 0.56, false);
      const lantern = mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 0.4, 8),
        windowMaterial(),
        -width * 0.35,
        2.42,
        depth * 0.56,
        false,
      );
      lantern.userData.buildingGlow = true;
      group.add(lantern);
      addGuardBanner(group, width * 0.4, depth * 0.56, identity);
      break;
    }

    default: {
      addGuardBanner(group, width * 0.42, depth * 0.48, identity);
      addTrainingDummy(group, -width * 0.28, depth * 0.56, identity);
      addTrainingDummy(group, width * 0.08, depth * 0.58, identity);
      const bell = mesh(
        new THREE.ConeGeometry(0.18, 0.27, 9),
        material(identity.accentTone, 0.45, 0.28),
        width * 0.28,
        2.38,
        depth * 0.39,
        false,
      );
      bell.rotation.x = Math.PI;
      group.add(bell);
      break;
    }
  }

  return finalizeBuilding(group, building, identity, 5.3);
}
