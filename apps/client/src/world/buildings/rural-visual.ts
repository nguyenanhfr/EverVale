import * as THREE from "three";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addDoor,
  addFoundation,
  addGabledRoof,
  addWindow,
  box,
  finalizeBuilding,
  material,
  mesh,
} from "./shared-building-visual";

function addFence(
  group: THREE.Group,
  width: number,
  depth: number,
  openFront = true,
): void {
  for (const z of [-depth * 0.55, depth * 0.55]) {
    if (openFront && z > 0) continue;
    for (let i = 0; i < 5; i += 1) {
      const x = -width * 0.45 + i * (width * 0.9 / 4);
      box(group, 0.07, 0.72, 0.07, material("timber"), x, 0.36, z, false);
    }
    box(group, width * 0.9, 0.07, 0.07, material("timber"), 0, 0.28, z, false);
    box(group, width * 0.9, 0.07, 0.07, material("timber"), 0, 0.57, z, false);
  }
}

function addHay(group: THREE.Group, x: number, z: number): void {
  const bale = mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.58, 10),
    material("plasterOchre"),
    x,
    0.35,
    z,
    false,
  );
  bale.rotation.z = Math.PI / 2;
  group.add(bale);
}

function addOrchardTree(
  group: THREE.Group,
  x: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  group.add(
    mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 1.25, 6),
      material("timber"),
      x,
      0.63,
      z,
      false,
    ),
  );
  group.add(
    mesh(
      new THREE.DodecahedronGeometry(0.55, 0),
      material("grass"),
      x,
      1.45,
      z,
      false,
    ),
  );
  for (const dx of [-0.18, 0.14]) {
    group.add(
      mesh(
        new THREE.SphereGeometry(0.06, 6, 4),
        material(identity.accentTone),
        x + dx,
        1.5,
        z + 0.16,
        false,
      ),
    );
  }
}

export function createFarmVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 8;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 7;
  const h = 3.15;

  addFoundation(group, width, depth);
  box(group, width * 0.62, h, depth * 0.68, material(identity.wallTone), -width * 0.1, h / 2 + 0.34, 0);
  addGabledRoof(group, width * 0.72, depth * 0.76, h + 0.34, identity, 1.15);
  addDoor(group, -width * 0.1, depth * 0.34 + 0.08, identity, 1.25, 1.85);
  addWindow(group, width * 0.18, 1.58, depth * 0.34 + 0.09, identity);

  switch (identity.variantName) {
    case "silo_farm": {
      for (const x of [width * 0.28, width * 0.43]) {
        const silo = mesh(
          new THREE.CylinderGeometry(0.48, 0.58, 2.45, 12),
          material("metal", 0.82, 0.18),
          x,
          1.24,
          -depth * 0.12,
          false,
        );
        group.add(silo);
        const cap = mesh(
          new THREE.ConeGeometry(0.58, 0.45, 12),
          material(identity.roofTone),
          x,
          2.68,
          -depth * 0.12,
          false,
        );
        group.add(cap);
      }
      addFence(group, width, depth);
      addHay(group, -width * 0.34, -depth * 0.48);
      break;
    }

    case "orchard_edge": {
      addFence(group, width, depth);
      for (const x of [-width * 0.36, -width * 0.12, width * 0.12, width * 0.36]) {
        addOrchardTree(group, x, -depth * 0.5, identity);
      }
      for (let i = 0; i < 3; i += 1) {
        box(
          group,
          0.42,
          0.24 + i * 0.04,
          0.42,
          material("timber"),
          width * 0.32 + (i % 2) * 0.34,
          0.13,
          depth * 0.46 - Math.floor(i / 2) * 0.38,
          false,
        );
      }
      break;
    }

    case "animal_court": {
      addFence(group, width, depth, false);
      const trough = box(
        group,
        1.45,
        0.28,
        0.48,
        material("stoneWarm"),
        width * 0.28,
        0.15,
        depth * 0.42,
        false,
      );
      trough.rotation.y = 0.1;
      addHay(group, -width * 0.34, depth * 0.42);
      addHay(group, -width * 0.21, depth * 0.48);
      break;
    }

    default: {
      addFence(group, width, depth);
      addHay(group, -width * 0.34, depth * 0.45);
      addHay(group, -width * 0.2, depth * 0.52);
      box(group, 1.6, 0.22, 0.72, material("timber"), width * 0.31, 0.16, depth * 0.42, false);
      break;
    }
  }

  return finalizeBuilding(group, building, identity, 5.0);
}
