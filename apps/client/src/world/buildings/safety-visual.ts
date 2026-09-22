import * as THREE from "three";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addFamilyDoor,
  addFamilyFoundation,
  addFamilyGabledRoof,
  addFamilyWindow,
  familyBox,
  familyMaterial,
  familyMesh,
} from "./building-family-helpers";

function addGuardBase(group: THREE.Group, width: number, depth: number): number {
  const h = 2.85;
  addFamilyFoundation(group, width, depth);
  familyBox(
    group,
    width * 0.86,
    1,
    depth * 0.82,
    familyMaterial("stoneDark"),
    0,
    0.84,
    0,
  );
  familyBox(
    group,
    width * 0.78,
    h - 0.7,
    depth * 0.74,
    familyMaterial("timber"),
    0,
    1.85,
    0,
  );
  addFamilyDoor(group, 0, depth * 0.37 + 0.08);
  addFamilyWindow(group, -width * 0.24, 1.78, depth * 0.37 + 0.09);
  addFamilyWindow(group, width * 0.24, 1.78, depth * 0.37 + 0.09);
  return h;
}

function addBanner(group: THREE.Group, x: number, z: number): void {
  group.add(
    familyMesh(
      new THREE.CylinderGeometry(0.035, 0.04, 2.3, 6),
      familyMaterial("metal"),
      x,
      1.35,
      z,
      false,
    ),
  );
  familyBox(
    group,
    0.7,
    0.42,
    0.04,
    familyMaterial("awning"),
    x + 0.36,
    2.1,
    z,
    false,
  );
}

function addLodgeYard(group: THREE.Group, width: number, depth: number): void {
  const h = addGuardBase(group, width, depth);
  addFamilyGabledRoof(
    group,
    width * 0.94,
    depth * 0.86,
    h + 0.34,
    familyMaterial("roof"),
    0.95,
  );
  addBanner(group, width * 0.46, 0);
  const bell = familyMesh(
    new THREE.ConeGeometry(0.18, 0.28, 8),
    familyMaterial("copper", 0.5, 0.25),
    -width * 0.36,
    2.55,
    depth * 0.25,
    false,
  );
  bell.rotation.x = Math.PI;
  group.add(bell);
  for (const x of [-0.65, 0, 0.65]) {
    familyBox(
      group,
      0.13,
      1.15,
      0.13,
      familyMaterial("timberDark"),
      x,
      0.58,
      -depth * 0.56,
      false,
    );
  }
}

function addWatchCourt(group: THREE.Group, width: number, depth: number): void {
  const h = addGuardBase(group, width, depth);
  addFamilyGabledRoof(
    group,
    width * 0.86,
    depth * 0.8,
    h + 0.34,
    familyMaterial("roof"),
    0.82,
  );
  const platformX = width * 0.37;
  familyBox(
    group,
    width * 0.28,
    0.18,
    depth * 0.4,
    familyMaterial("timberDark"),
    platformX,
    h * 0.72,
    0,
  );
  for (const x of [platformX - width * 0.1, platformX + width * 0.1]) {
    for (const z of [-depth * 0.15, depth * 0.15]) {
      familyBox(group, 0.1, h * 0.75, 0.1, familyMaterial("timberDark"), x, h * 0.38, z);
    }
  }
  const lamp = familyMesh(
    new THREE.OctahedronGeometry(0.18, 0),
    familyMaterial("copper", 0.48, 0.22),
    platformX,
    h * 0.72 + 0.42,
    depth * 0.18,
    false,
  );
  lamp.userData.buildingGlow = true;
  group.add(lamp);
  for (const y of [0.55, 1.05, 1.55]) {
    familyBox(
      group,
      0.9,
      0.08,
      0.18,
      familyMaterial("metal"),
      -width * 0.38,
      y,
      -depth * 0.4,
      false,
    );
  }
}

function addGateLodge(group: THREE.Group, width: number, depth: number): void {
  const h = addGuardBase(group, width, depth);
  familyBox(
    group,
    width * 0.88,
    0.24,
    depth * 0.8,
    familyMaterial("roof"),
    0,
    h + 0.44,
    0,
  );
  for (const x of [-width * 0.48, width * 0.48]) {
    familyBox(
      group,
      0.34,
      2.15,
      0.34,
      familyMaterial("stone"),
      x,
      1.08,
      depth * 0.45,
    );
  }
  const barrier = familyBox(
    group,
    width * 0.65,
    0.13,
    0.13,
    familyMaterial("awning"),
    0,
    0.9,
    depth * 0.52,
    false,
  );
  barrier.rotation.z = -0.12;
  addBanner(group, -width * 0.48, depth * 0.32);
  const lamp = familyMesh(
    new THREE.OctahedronGeometry(0.16, 0),
    familyMaterial("copper", 0.48, 0.22),
    width * 0.48,
    2.35,
    depth * 0.45,
    false,
  );
  lamp.userData.buildingGlow = true;
  group.add(lamp);
}

export function addGuardPostVisual(
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  switch (identity?.variant) {
    case "watch_court":
      addWatchCourt(group, width, depth);
      break;
    case "gate_lodge":
      addGateLodge(group, width, depth);
      break;
    default:
      addLodgeYard(group, width, depth);
      break;
  }
}
