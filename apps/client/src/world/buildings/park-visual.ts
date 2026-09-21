import * as THREE from "three";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  box,
  finalizeBuilding,
  material,
  mesh,
  windowMaterial,
} from "./shared-building-visual";

function addTree(
  group: THREE.Group,
  x: number,
  z: number,
  scale: number,
  identity: BuildingVisualIdentity,
): void {
  group.add(
    mesh(
      new THREE.CylinderGeometry(0.13 * scale, 0.2 * scale, 1.65 * scale, 6),
      material("timber"),
      x,
      0.83 * scale,
      z,
      false,
    ),
  );
  group.add(
    mesh(
      new THREE.DodecahedronGeometry(0.72 * scale, 0),
      material(identity.dialect.id === "amberfield" ? "plasterOchre" : "grass"),
      x,
      2.0 * scale,
      z,
      false,
    ),
  );
}

function addBench(
  group: THREE.Group,
  x: number,
  z: number,
  rotationY = 0,
): void {
  const bench = new THREE.Group();
  box(bench, 1.15, 0.12, 0.36, material("timber"), 0, 0.48, 0, false);
  box(bench, 1.15, 0.42, 0.08, material("timber"), 0, 0.74, -0.16, false);
  for (const side of [-1, 1] as const) {
    box(bench, 0.08, 0.48, 0.08, material("metal"), side * 0.42, 0.25, 0, false);
  }
  bench.position.set(x, 0, z);
  bench.rotation.y = rotationY;
  group.add(bench);
}

function addLamp(
  group: THREE.Group,
  x: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  box(group, 0.055, 1.8, 0.055, material("metal"), x, 0.9, z, false);
  const glow = mesh(
    new THREE.SphereGeometry(0.14, 8, 5),
    windowMaterial(),
    x,
    1.82,
    z,
    false,
  );
  glow.userData.buildingGlow = true;
  group.add(glow);
}

function addSoftPaths(
  group: THREE.Group,
  width: number,
  depth: number,
  cross = true,
): void {
  box(group, width * 0.78, 0.035, 0.42, material("stoneWarm"), 0, 0.08, 0, false);
  if (cross) {
    box(group, 0.42, 0.035, depth * 0.78, material("stoneWarm"), 0, 0.08, 0, false);
  }
}

export function createParkVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 7;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 6;

  box(group, width * 0.96, 0.1, depth * 0.96, material("grass"), 0, 0.05, 0, false);

  switch (identity.variantName) {
    case "duck_pond": {
      addSoftPaths(group, width, depth, false);
      const basin = mesh(
        new THREE.CylinderGeometry(1.3, 1.45, 0.2, 20),
        material("stone"),
        0,
        0.14,
        0,
        false,
      );
      const water = mesh(
        new THREE.CylinderGeometry(1.18, 1.18, 0.035, 20),
        material("water", 0.28),
        0,
        0.27,
        0,
        false,
      );
      water.userData.propWater = true;
      group.add(basin, water);
      for (const angle of [0.2, 1.1, 2.6, 3.8, 5.2]) {
        const x = Math.cos(angle) * 1.5;
        const z = Math.sin(angle) * 1.15;
        box(group, 0.06, 0.48, 0.06, material("grass"), x, 0.24, z, false);
      }
      addBench(group, -width * 0.29, depth * 0.26, 0.2);
      addTree(group, width * 0.31, -depth * 0.29, 0.9, identity);
      addTree(group, -width * 0.32, -depth * 0.24, 0.78, identity);
      break;
    }

    case "play_lawn": {
      addSoftPaths(group, width, depth, false);
      for (const side of [-1, 1] as const) {
        box(group, 0.08, 1.65, 0.08, material("metal"), side * 0.55, 0.82, 0.2, false);
      }
      box(group, 1.18, 0.08, 0.08, material("metal"), 0, 1.52, 0.2, false);
      for (const side of [-1, 1] as const) {
        box(group, 0.035, 0.95, 0.035, material("metal"), side * 0.28, 1.03, 0.2, false);
        box(group, 0.42, 0.06, 0.28, material(identity.accentTone), side * 0.28, 0.56, 0.2, false);
      }
      const slide = box(group, 0.56, 0.08, 1.55, material(identity.accentTone), 1.25, 0.62, -0.28, false);
      slide.rotation.x = -0.48;
      addBench(group, -width * 0.3, depth * 0.28, 0.15);
      addTree(group, width * 0.32, depth * 0.3, 0.82, identity);
      break;
    }

    case "reading_garden": {
      addSoftPaths(group, width, depth, true);
      for (const side of [-1, 1] as const) {
        for (const z of [-0.7, 0.7]) {
          box(group, 0.08, 2.05, 0.08, material(identity.trimTone), side * 0.95, 1.02, z, false);
        }
      }
      box(group, 2.2, 0.14, 1.9, material(identity.roofTone), 0, 2.05, 0, false);
      addBench(group, -0.45, 0, Math.PI / 2);
      addBench(group, 0.45, 0, -Math.PI / 2);
      for (const x of [-width * 0.34, width * 0.34]) {
        box(group, 0.65, 0.07, 1.6, material("soil"), x, 0.09, 0, false);
      }
      addTree(group, -width * 0.31, -depth * 0.31, 0.86, identity);
      addTree(group, width * 0.31, depth * 0.31, 0.9, identity);
      break;
    }

    default: {
      addSoftPaths(group, width, depth, true);
      const basin = mesh(
        new THREE.CylinderGeometry(0.82, 0.94, 0.24, 16),
        material("stone"),
        0,
        0.17,
        0,
        false,
      );
      const water = mesh(
        new THREE.CylinderGeometry(0.68, 0.68, 0.035, 16),
        material("water", 0.28),
        0,
        0.31,
        0,
        false,
      );
      water.userData.propWater = true;
      const jet = mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 0.85, 8),
        material("water", 0.22),
        0,
        0.78,
        0,
        false,
      );
      jet.userData.propWater = true;
      group.add(basin, water, jet);
      for (const [x, z, s] of [
        [-width * 0.32, -depth * 0.28, 0.9],
        [width * 0.31, -depth * 0.26, 0.82],
        [-width * 0.3, depth * 0.3, 0.76],
        [width * 0.31, depth * 0.28, 0.88],
      ] as const) {
        addTree(group, x, z, s, identity);
      }
      addBench(group, -width * 0.3, 0.2, Math.PI / 2);
      addBench(group, width * 0.3, -0.2, -Math.PI / 2);
      addLamp(group, -width * 0.22, depth * 0.34, identity);
      addLamp(group, width * 0.22, depth * 0.34, identity);
      break;
    }
  }

  return finalizeBuilding(group, building, identity, 2.9);
}
