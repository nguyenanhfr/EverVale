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
  addTimberFront,
  addWindow,
  box,
  finalizeBuilding,
  material,
  mesh,
} from "./shared-building-visual";

function addMailbox(
  group: THREE.Group,
  width: number,
  depth: number,
  identity: BuildingVisualIdentity,
): void {
  box(group, 0.08, 1.08, 0.08, material(identity.trimTone), width * 0.36, 0.54, depth * 0.52, false);
  box(group, 0.48, 0.3, 0.12, material(identity.accentTone), width * 0.36, 1.1, depth * 0.52, false);
}

function addBicycle(group: THREE.Group, width: number, depth: number): void {
  for (const dx of [-0.17, 0.17]) {
    const wheel = mesh(
      new THREE.TorusGeometry(0.18, 0.025, 5, 10),
      material("metal"),
      width * 0.34 + dx,
      0.24,
      depth * 0.53,
      false,
    );
    wheel.rotation.y = Math.PI / 2;
    group.add(wheel);
  }
  const frame = box(group, 0.42, 0.04, 0.04, material("metal"), width * 0.34, 0.42, depth * 0.53, false);
  frame.rotation.z = 0.45;
}

function addWoodpile(group: THREE.Group, width: number, depth: number): void {
  for (let i = 0; i < 5; i += 1) {
    const log = mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.7, 6),
      material("timber"),
      width * 0.34 + (i % 2) * 0.12,
      0.12 + Math.floor(i / 2) * 0.13,
      -depth * 0.38,
      false,
    );
    log.rotation.z = Math.PI / 2;
    group.add(log);
  }
}

function addLaundry(group: THREE.Group, width: number, depth: number): void {
  for (const x of [-width * 0.33, width * 0.33]) {
    box(group, 0.055, 1.65, 0.055, material("timber"), x, 0.82, -depth * 0.54, false);
  }
  box(group, width * 0.68, 0.025, 0.025, material("metal"), 0, 1.5, -depth * 0.54, false);
  for (const [x, tone] of [
    [-0.22, "plasterCool"],
    [0.03, "awning"],
    [0.26, "plasterWarm"],
  ] as const) {
    box(group, 0.24, 0.32, 0.025, material(tone), x, 1.3, -depth * 0.55, false);
  }
}

export function createHouseSmallVisual(
  building: BuildingInstance,
  meta: BuildCatalogEntryDto | undefined,
  identity: BuildingVisualIdentity,
): THREE.Group {
  const group = new THREE.Group();
  const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 5;
  const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 4;
  const h = 2.8;
  const variant = identity.variantName;

  addFoundation(group, width, depth);
  box(group, width * 0.88, h, depth * 0.86, material(identity.wallTone), 0, h / 2 + 0.34, 0);
  addTimberFront(group, width * 0.88, depth * 0.86, h, identity);
  addGabledRoof(
    group,
    width * 0.96,
    depth * 0.92,
    h + 0.34,
    identity,
    variant === "dormer_cottage" ? 1.42 : variant === "side_porch" ? 0.98 : 1.15,
  );

  const doorX = variant === "side_porch"
    ? -width * 0.2
    : variant === "craft_cottage"
      ? width * 0.2
      : 0;
  addDoor(group, doorX, depth * 0.43 + 0.08, identity);
  addStoneStep(group, doorX, depth * 0.48 + 0.32);
  addWindow(group, -width * 0.24, 1.62, depth * 0.43 + 0.09, identity);
  addWindow(group, width * 0.24, 1.62, depth * 0.43 + 0.09, identity);

  if (variant === "flower_gable" || variant === "laundry_garden") {
    addFlowerBox(group, -width * 0.24, 1.13, depth * 0.45 + 0.14, identity);
    addFlowerBox(group, width * 0.24, 1.13, depth * 0.45 + 0.14, identity);
  }

  if (variant === "side_porch") {
    const canopy = box(
      group,
      width * 0.44,
      0.12,
      1.05,
      material(identity.roofTone),
      -width * 0.2,
      2.12,
      depth * 0.5 + 0.35,
    );
    canopy.rotation.x = -0.12;
    for (const x of [-width * 0.36, -width * 0.04]) {
      box(group, 0.08, 1.8, 0.08, material(identity.trimTone), x, 0.9, depth * 0.5 + 0.72, false);
    }
    addWoodpile(group, width, depth);
  }

  if (variant === "dormer_cottage") {
    box(
      group,
      width * 0.27,
      0.78,
      0.62,
      material(identity.secondaryWallTone),
      0,
      h + 0.72,
      depth * 0.22,
    );
    addGabledRoof(group, width * 0.34, 0.72, h + 1.1, identity, 0.42);
    addWindow(group, 0, h + 0.72, depth * 0.54 + 0.02, identity);
  }

  if (variant === "stone_end_cottage") {
    box(group, 0.28, h * 0.92, depth * 0.76, material("stoneWarm"), -width * 0.43, h * 0.46 + 0.34, 0);
    addChimney(group, -width * 0.36, -depth * 0.12, h + 0.08, identity);
    addMailbox(group, width, depth, identity);
    addBicycle(group, width, depth);
  } else {
    addChimney(
      group,
      variant === "craft_cottage" ? width * 0.3 : -width * 0.27,
      -depth * 0.18,
      h + 0.15,
      identity,
    );
  }

  if (variant === "craft_cottage") {
    box(
      group,
      width * 0.34,
      1.42,
      depth * 0.42,
      material(identity.secondaryWallTone),
      width * 0.4,
      0.71,
      -depth * 0.1,
    );
    const leanRoof = box(
      group,
      width * 0.42,
      0.12,
      depth * 0.5,
      material(identity.roofTone),
      width * 0.4,
      1.55,
      -depth * 0.1,
    );
    leanRoof.rotation.z = -0.12;
    for (let i = 0; i < 3; i += 1) {
      box(group, 0.38, 0.31, 0.38, material("timber"), -width * 0.32 + i * 0.42, 0.16, -depth * 0.55, false);
    }
  }

  if (variant === "laundry_garden") {
    addLaundry(group, width, depth);
  }

  box(
    group,
    width * 0.28,
    0.08,
    0.48,
    material("soil"),
    identity.clutterSeed % 2 === 0 ? width * 0.26 : -width * 0.26,
    0.08,
    depth * 0.54,
    false,
  );

  return finalizeBuilding(group, building, identity, 4.6);
}
