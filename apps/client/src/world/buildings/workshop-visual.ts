import * as THREE from "three";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addFamilyDoor,
  addFamilyFoundation,
  addFamilyWindow,
  familyBox,
  familyMaterial,
  familyMesh,
} from "./building-family-helpers";

function addWorkshopShell(
  group: THREE.Group,
  width: number,
  depth: number,
  doorX = width * 0.2,
): number {
  const h = 3.25;
  addFamilyFoundation(group, width, depth);
  familyBox(group, width * 0.9, h, depth * 0.86, familyMaterial("brick"), 0, h / 2 + 0.34, 0);
  familyBox(group, width * 0.76, 0.22, depth * 0.98, familyMaterial("roof"), 0, h + 0.52, 0);
  addFamilyDoor(group, doorX, depth * 0.43 + 0.08, 1.35, 1.85);
  addFamilyWindow(group, -width * 0.25, 1.72, depth * 0.43 + 0.09);
  return h;
}

function addCrates(group: THREE.Group, x: number, z: number, rows = 2): void {
  for (let i = 0; i < rows * 2; i += 1) {
    familyBox(
      group,
      0.56,
      0.36,
      0.52,
      i % 3 === 0 ? familyMaterial("timberDark") : familyMaterial("timber"),
      x + (i % 2) * 0.58,
      0.18 + Math.floor(i / 2) * 0.37,
      z,
      false,
    );
  }
}

function addFlywheel(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius = 0.68,
): void {
  const wheel = familyMesh(
    new THREE.TorusGeometry(radius, 0.12, 8, 18),
    familyMaterial("metal", 0.55, 0.35),
    x,
    y,
    z,
    false,
  );
  group.add(wheel);
  for (const angle of [0, Math.PI / 2]) {
    const spoke = familyBox(
      group,
      radius * 1.65,
      0.08,
      0.09,
      familyMaterial("copper", 0.52, 0.3),
      x,
      y,
      z + 0.01,
      false,
    );
    spoke.rotation.z = angle;
  }
}

function addWheelYard(group: THREE.Group, width: number, depth: number): void {
  const h = addWorkshopShell(group, width, depth);
  const awning = familyBox(
    group,
    width * 0.42,
    0.13,
    0.95,
    familyMaterial("copper", 0.65, 0.18),
    width * 0.2,
    h * 0.62,
    depth * 0.49 + 0.4,
  );
  awning.rotation.x = -0.12;
  addFlywheel(group, -width * 0.3, 1.32, depth * 0.46 + 0.13);
  addCrates(group, -width * 0.38, -depth * 0.57, 1);
}

function addForgeStack(group: THREE.Group, width: number, depth: number): void {
  const h = addWorkshopShell(group, width, depth, -width * 0.12);
  familyBox(group, width * 0.3, 2.15, depth * 0.48, familyMaterial("stoneDark"), width * 0.31, 1.42, -depth * 0.1);
  const stack = familyMesh(
    new THREE.CylinderGeometry(0.34, 0.44, 3.25, 10),
    familyMaterial("metal", 0.7, 0.26),
    width * 0.31,
    h + 1.18,
    -depth * 0.08,
  );
  group.add(stack);
  familyBox(group, 0.9, 0.18, 0.9, familyMaterial("copper", 0.5, 0.3), width * 0.31, h + 2.8, -depth * 0.08, false);
  const forge = familyBox(group, 1.35, 0.82, 0.92, familyMaterial("stoneDark"), -width * 0.28, 0.53, depth * 0.56, false);
  forge.userData.buildingGlow = true;
  addCrates(group, width * 0.16, -depth * 0.58, 1);
}

function addLoadingShed(group: THREE.Group, width: number, depth: number): void {
  addWorkshopShell(group, width, depth, width * 0.02);
  familyBox(group, width * 0.42, 2.35, depth * 0.72, familyMaterial("timber"), width * 0.36, 1.34, -depth * 0.04);
  const shedRoof = familyBox(
    group,
    width * 0.48,
    0.16,
    depth * 0.82,
    familyMaterial("roofWarm"),
    width * 0.36,
    2.62,
    -depth * 0.04,
  );
  shedRoof.rotation.z = -0.08;
  familyBox(group, 1.7, 1.65, 0.1, familyMaterial("timberDark"), width * 0.22, 1.2, depth * 0.43 + 0.1, false);
  addCrates(group, -width * 0.4, -depth * 0.57, 2);
}

function addSawCourt(group: THREE.Group, width: number, depth: number): void {
  addWorkshopShell(group, width, depth, -width * 0.17);
  const canopy = familyBox(
    group,
    width * 0.62,
    0.15,
    depth * 0.42,
    familyMaterial("roof"),
    0,
    2.42,
    depth * 0.55,
  );
  canopy.rotation.x = -0.08;
  for (const x of [-width * 0.25, width * 0.25]) {
    familyBox(group, 0.1, 2.1, 0.1, familyMaterial("timberDark"), x, 1.25, depth * 0.53, false);
  }
  const saw = familyMesh(
    new THREE.CylinderGeometry(0.58, 0.58, 0.07, 16),
    familyMaterial("metal", 0.48, 0.38),
    0,
    0.78,
    depth * 0.58,
    false,
  );
  saw.rotation.x = Math.PI / 2;
  group.add(saw);
  for (let i = 0; i < 4; i += 1) {
    familyBox(group, 0.4, 0.18, 1.65, familyMaterial("timber"), -width * 0.34 + i * 0.42, 0.12, -depth * 0.58, false);
  }
}

export function addWorkshopVisual(
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  switch (identity?.variant) {
    case "forge_stack":
      addForgeStack(group, width, depth);
      break;
    case "loading_shed":
      addLoadingShed(group, width, depth);
      break;
    case "saw_court":
      addSawCourt(group, width, depth);
      break;
    default:
      addWheelYard(group, width, depth);
      break;
  }
}
