import * as THREE from "three";
import type { BuildingVisualIdentity } from "../visual-identity";
import {
  addFamilyDoor,
  addFamilyFoundation,
  addFamilyGabledRoof,
  addFamilyStoneStep,
  addFamilyTimberFront,
  addFamilyWindow,
  familyBox,
  familyMaterial,
  familyMesh,
} from "./building-family-helpers";

function addHallBase(group: THREE.Group, width: number, depth: number): number {
  const h = 4;
  addFamilyFoundation(group, width, depth);
  familyBox(group, width * 0.9, h, depth * 0.84, familyMaterial("plasterWarm"), 0, h / 2 + 0.34, 0);
  addFamilyTimberFront(group, width * 0.9, depth * 0.84, h);
  addFamilyDoor(group, 0, depth * 0.42 + 0.08, 1.2, 1.9);
  addFamilyStoneStep(group, 0, depth * 0.47 + 0.34, 1.7);
  for (const x of [-width * 0.28, width * 0.28]) {
    addFamilyWindow(group, x, 1.75, depth * 0.42 + 0.09);
    addFamilyWindow(group, x, 3.05, depth * 0.42 + 0.09);
  }
  return h;
}

function addClockHall(group: THREE.Group, width: number, depth: number): void {
  const h = addHallBase(group, width, depth);
  addFamilyGabledRoof(group, width * 0.98, depth * 0.9, h + 0.34, familyMaterial("roof"), 1.35);
  familyBox(group, 1.75, 2.15, 1.75, familyMaterial("stone"), 0, h + 1.2, 0);
  addFamilyGabledRoof(group, 2.1, 2.1, h + 2.28, familyMaterial("copper", 0.52, 0.18), 0.85);
  const clock = familyMesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.08, 18),
    familyMaterial("cream"),
    0,
    h + 1.45,
    0.91,
    false,
  );
  clock.rotation.x = Math.PI / 2;
  group.add(clock);
  familyBox(group, width * 0.32, 0.12, 0.52, familyMaterial("timberDark"), -width * 0.25, 0.55, depth * 0.5 + 0.35, false);
}

function addBellPorchHall(group: THREE.Group, width: number, depth: number): void {
  const h = addHallBase(group, width, depth);
  addFamilyGabledRoof(group, width * 0.98, depth * 0.9, h + 0.34, familyMaterial("roofWarm"), 1.2);
  const towerX = -width * 0.29;
  familyBox(group, 1.55, 2.45, 1.55, familyMaterial("stone"), towerX, h + 1.3, 0);
  addFamilyGabledRoof(group, 1.9, 1.9, h + 2.55, familyMaterial("copper", 0.52, 0.18), 0.75);
  const bell = familyMesh(
    new THREE.ConeGeometry(0.34, 0.48, 10),
    familyMaterial("copper", 0.48, 0.28),
    towerX,
    h + 1.55,
    depth * 0.39,
    false,
  );
  bell.rotation.x = Math.PI;
  group.add(bell);
  const porch = familyBox(group, width * 0.42, 0.18, 1.35, familyMaterial("roof"), width * 0.1, 2.72, depth * 0.53);
  porch.rotation.x = -0.1;
  for (const x of [-width * 0.08, width * 0.28]) {
    familyBox(group, 0.12, 2.15, 0.12, familyMaterial("timberDark"), x, 1.45, depth * 0.54, false);
  }
}

function addTwinGableHall(group: THREE.Group, width: number, depth: number): void {
  const h = addHallBase(group, width, depth);
  familyBox(group, width * 0.92, 0.28, depth * 0.86, familyMaterial("roof"), 0, h + 0.48, 0);
  for (const x of [-width * 0.24, width * 0.24]) {
    familyBox(group, width * 0.32, 1.22, depth * 0.58, familyMaterial("plasterWarm"), x, h + 0.78, 0.1);
    addFamilyGabledRoof(group, width * 0.38, depth * 0.68, h + 1.32, familyMaterial("roofWarm"), 0.72);
  }
  const lantern = familyMesh(
    new THREE.OctahedronGeometry(0.28, 0),
    familyMaterial("copper", 0.45, 0.3),
    0,
    h + 1.52,
    depth * 0.48,
    false,
  );
  lantern.userData.buildingGlow = true;
  group.add(lantern);
  for (const x of [-width * 0.34, width * 0.34]) {
    familyBox(group, 1.2, 0.12, 0.48, familyMaterial("timberDark"), x, 0.55, depth * 0.5 + 0.34, false);
  }
}

export function addTownCenterVisual(
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  switch (identity?.variant) {
    case "bell_porch_hall":
      addBellPorchHall(group, width, depth);
      break;
    case "twin_gable_hall":
      addTwinGableHall(group, width, depth);
      break;
    default:
      addClockHall(group, width, depth);
      break;
  }
}
