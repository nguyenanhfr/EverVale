import * as THREE from "three";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addFamilyChimney,
  addFamilyDoor,
  addFamilyFlowerBox,
  addFamilyFoundation,
  addFamilyGabledRoof,
  addFamilyStoneStep,
  addFamilyTimberFront,
  addFamilyWindow,
  familyBox,
  familyMaterial,
  familyMesh,
} from "./building-family-helpers";

function addBase(
  group: THREE.Group,
  width: number,
  depth: number,
  doorX: number,
  roofRise = 1.15,
): number {
  const h = 2.8;
  addFamilyFoundation(group, width, depth);
  familyBox(group, width * 0.88, h, depth * 0.86, familyMaterial("plaster"), 0, h / 2 + 0.34, 0);
  addFamilyTimberFront(group, width * 0.88, depth * 0.86, h);
  addFamilyGabledRoof(group, width * 0.96, depth * 0.92, h + 0.34, familyMaterial("roofWarm"), roofRise);
  addFamilyDoor(group, doorX, depth * 0.43 + 0.08);
  addFamilyStoneStep(group, doorX, depth * 0.48 + 0.32);
  return h;
}

function addFlowerGable(group: THREE.Group, width: number, depth: number): void {
  const h = addBase(group, width, depth, 0);
  for (const x of [-width * 0.24, width * 0.24]) {
    addFamilyWindow(group, x, 1.62, depth * 0.43 + 0.09);
    addFamilyFlowerBox(group, x, 1.13, depth * 0.45 + 0.14);
  }
  addFamilyChimney(group, -width * 0.27, -depth * 0.18, h + 0.15);
}

function addSidePorch(group: THREE.Group, width: number, depth: number): void {
  const h = addBase(group, width, depth, width * 0.2);
  addFamilyWindow(group, -width * 0.23, 1.62, depth * 0.43 + 0.09);
  const porch = familyBox(
    group,
    width * 0.46,
    0.15,
    1.1,
    familyMaterial("roof"),
    width * 0.2,
    2.25,
    depth * 0.52,
  );
  porch.rotation.x = -0.12;
  for (const x of [0.04, width * 0.37]) {
    familyBox(group, 0.1, 1.85, 0.1, familyMaterial("timberDark"), x, 1.2, depth * 0.53, false);
  }
  for (let i = 0; i < 3; i += 1) {
    familyBox(group, 0.42, 0.24, 0.36, familyMaterial("timber"), -width * 0.31, 0.16 + i * 0.2, depth * 0.38, false);
  }
  addFamilyChimney(group, -width * 0.25, -depth * 0.2, h + 0.15);
}

function addDormer(group: THREE.Group, width: number, depth: number): void {
  const h = addBase(group, width, depth, 0, 1.42);
  for (const x of [-width * 0.25, width * 0.25]) {
    addFamilyWindow(group, x, 1.52, depth * 0.43 + 0.09);
  }
  familyBox(group, width * 0.3, 0.86, 0.72, familyMaterial("plasterWarm"), 0, h + 0.68, depth * 0.23);
  addFamilyGabledRoof(group, width * 0.36, 0.82, h + 1.02, familyMaterial("roofWarm"), 0.48);
  addFamilyWindow(group, 0, h + 0.64, depth * 0.61 + 0.03);
  addFamilyChimney(group, width * 0.29, -depth * 0.18, h + 0.2);
}

function addStoneEnd(group: THREE.Group, width: number, depth: number): void {
  const h = addBase(group, width, depth, -width * 0.13);
  addFamilyWindow(group, width * 0.25, 1.62, depth * 0.43 + 0.09);
  familyBox(group, width * 0.22, h * 0.92, depth * 0.87, familyMaterial("stone"), -width * 0.34, h * 0.48 + 0.34, 0);
  addFamilyChimney(group, -width * 0.39, 0, h + 0.08);
  const wheel = familyMesh(
    new THREE.TorusGeometry(0.28, 0.045, 6, 12),
    familyMaterial("metal", 0.7, 0.2),
    width * 0.34,
    0.42,
    depth * 0.5,
    false,
  );
  wheel.rotation.y = Math.PI / 2;
  group.add(wheel);
}

function addCraft(group: THREE.Group, width: number, depth: number): void {
  const h = addBase(group, width, depth, -width * 0.12);
  addFamilyWindow(group, width * 0.24, 1.62, depth * 0.43 + 0.09);
  familyBox(group, width * 0.38, 1.7, depth * 0.58, familyMaterial("timber"), width * 0.39, 0.85, -depth * 0.08);
  const leanRoof = familyBox(group, width * 0.42, 0.14, depth * 0.68, familyMaterial("roof"), width * 0.39, 1.86, -depth * 0.08);
  leanRoof.rotation.z = -0.13;
  for (const z of [-depth * 0.35, -depth * 0.05]) {
    familyBox(group, 0.46, 0.32, 0.46, familyMaterial("timberDark"), width * 0.55, 0.18, z, false);
  }
  addFamilyChimney(group, -width * 0.3, -depth * 0.18, h + 0.15);
}

function addLaundryGarden(group: THREE.Group, width: number, depth: number): void {
  const h = addBase(group, width, depth, 0);
  for (const x of [-width * 0.24, width * 0.24]) {
    addFamilyWindow(group, x, 1.62, depth * 0.43 + 0.09);
  }
  for (const x of [-width * 0.33, width * 0.33]) {
    familyBox(group, 0.07, 1.35, 0.07, familyMaterial("timberDark"), x, 0.68, -depth * 0.54, false);
  }
  familyBox(group, width * 0.66, 0.03, 0.03, familyMaterial("metal"), 0, 1.25, -depth * 0.54, false);
  for (const [x, cloth] of [[-0.2, "awning"], [0.18, "cream"]] as const) {
    familyBox(group, width * 0.2, 0.42, 0.035, familyMaterial(cloth), x * width, 1.02, -depth * 0.52, false);
  }
  addFamilyChimney(group, width * 0.27, -depth * 0.16, h + 0.15);
}

export function addHouseSmallVisual(
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  switch (identity?.variant) {
    case "side_porch":
      addSidePorch(group, width, depth);
      break;
    case "dormer_cottage":
      addDormer(group, width, depth);
      break;
    case "stone_end_cottage":
      addStoneEnd(group, width, depth);
      break;
    case "craft_cottage":
      addCraft(group, width, depth);
      break;
    case "laundry_garden":
      addLaundryGarden(group, width, depth);
      break;
    default:
      addFlowerGable(group, width, depth);
      break;
  }
}
