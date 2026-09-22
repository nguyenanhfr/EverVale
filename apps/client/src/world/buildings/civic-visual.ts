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

function addSchoolBase(group: THREE.Group, width: number, depth: number): number {
  const h = 3.2;
  addFamilyFoundation(group, width, depth);
  familyBox(
    group,
    width * 0.9,
    h,
    depth * 0.82,
    familyMaterial("plasterWarm"),
    0,
    h / 2 + 0.34,
    0,
  );
  addFamilyTimberFront(group, width * 0.9, depth * 0.82, h);
  addFamilyDoor(group, 0, depth * 0.41 + 0.08, 1.05, 1.75);
  addFamilyStoneStep(group, 0, depth * 0.46 + 0.3, 1.45);
  for (const x of [-width * 0.3, -width * 0.1, width * 0.1, width * 0.3]) {
    addFamilyWindow(group, x, 1.65, depth * 0.41 + 0.09);
  }
  return h;
}

function addBikeRack(group: THREE.Group, x: number, z: number): void {
  for (const dx of [-0.38, 0, 0.38]) {
    const hoop = familyMesh(
      new THREE.TorusGeometry(0.23, 0.035, 6, 10, Math.PI),
      familyMaterial("metal", 0.72, 0.2),
      x + dx,
      0.24,
      z,
      false,
    );
    hoop.rotation.y = Math.PI / 2;
    group.add(hoop);
  }
}

function addBellGableSchool(group: THREE.Group, width: number, depth: number): void {
  const h = addSchoolBase(group, width, depth);
  addFamilyGabledRoof(
    group,
    width * 0.96,
    depth * 0.88,
    h + 0.34,
    familyMaterial("roofWarm"),
    1,
  );
  familyBox(group, 0.72, 1, 0.72, familyMaterial("stone"), 0, h + 0.72, 0);
  const bell = familyMesh(
    new THREE.ConeGeometry(0.24, 0.35, 10),
    familyMaterial("copper", 0.45, 0.3),
    0,
    h + 0.9,
    depth * 0.38,
    false,
  );
  bell.rotation.x = Math.PI;
  group.add(bell);
  addBikeRack(group, width * 0.28, depth * 0.54);
}

function addCourtyardSchool(group: THREE.Group, width: number, depth: number): void {
  const h = addSchoolBase(group, width, depth);
  addFamilyGabledRoof(
    group,
    width * 0.58,
    depth * 0.7,
    h + 0.34,
    familyMaterial("roofWarm"),
    0.86,
  );
  for (const side of [-1, 1] as const) {
    const x = side * width * 0.37;
    familyBox(
      group,
      width * 0.25,
      h * 0.76,
      depth * 0.62,
      familyMaterial("plaster"),
      x,
      h * 0.38 + 0.34,
      depth * 0.06,
    );
    addFamilyGabledRoof(
      group,
      width * 0.29,
      depth * 0.68,
      h * 0.76 + 0.34,
      familyMaterial("roof"),
      0.55,
    );
    addFamilyWindow(group, x, 1.42, depth * 0.37);
  }
  familyBox(
    group,
    width * 0.48,
    0.08,
    depth * 0.25,
    familyMaterial("stone"),
    0,
    0.08,
    depth * 0.55,
    false,
  );
  for (const x of [-width * 0.18, width * 0.18]) {
    familyBox(group, 1.05, 0.18, 0.34, familyMaterial("timber"), x, 0.34, depth * 0.58, false);
  }
  addBikeRack(group, width * 0.31, depth * 0.54);
}

function addClassroomAnnexSchool(group: THREE.Group, width: number, depth: number): void {
  const h = addSchoolBase(group, width, depth);
  addFamilyGabledRoof(
    group,
    width * 0.72,
    depth * 0.88,
    h + 0.34,
    familyMaterial("roofWarm"),
    0.95,
  );
  const annexX = width * 0.36;
  const annexH = h * 0.74;
  familyBox(
    group,
    width * 0.34,
    annexH,
    depth * 0.72,
    familyMaterial("plaster"),
    annexX,
    annexH / 2 + 0.34,
    -depth * 0.04,
  );
  addFamilyGabledRoof(
    group,
    width * 0.38,
    depth * 0.78,
    annexH + 0.34,
    familyMaterial("roof"),
    0.62,
  );
  for (const x of [annexX - width * 0.09, annexX + width * 0.09]) {
    addFamilyWindow(group, x, 1.45, depth * 0.33);
  }
  familyBox(
    group,
    1.1,
    0.7,
    0.08,
    familyMaterial("timberDark"),
    -width * 0.28,
    1.05,
    depth * 0.46,
    false,
  );
  addBikeRack(group, -width * 0.31, depth * 0.54);
}

export function addSchoolVisual(
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  switch (identity?.variant) {
    case "courtyard_school":
      addCourtyardSchool(group, width, depth);
      break;
    case "classroom_annex":
      addClassroomAnnexSchool(group, width, depth);
      break;
    default:
      addBellGableSchool(group, width, depth);
      break;
  }
}

function addParkBase(group: THREE.Group, width: number, depth: number): void {
  familyBox(
    group,
    width * 0.96,
    0.12,
    depth * 0.96,
    familyMaterial("grass"),
    0,
    0.06,
    0,
    false,
  );
}

function addTree(group: THREE.Group, x: number, z: number, scale = 1): void {
  group.add(
    familyMesh(
      new THREE.CylinderGeometry(0.14 * scale, 0.2 * scale, 1.65 * scale, 6),
      familyMaterial("timber"),
      x,
      0.86 * scale,
      z,
      false,
    ),
    familyMesh(
      new THREE.DodecahedronGeometry(0.72 * scale, 0),
      familyMaterial("grass"),
      x,
      2.05 * scale,
      z,
      false,
    ),
  );
}

function addBench(group: THREE.Group, x: number, z: number, rotation = 0): void {
  const seat = familyBox(
    group,
    1.2,
    0.12,
    0.4,
    familyMaterial("timber"),
    x,
    0.5,
    z,
    false,
  );
  seat.rotation.y = rotation;
  for (const dx of [-0.42, 0.42]) {
    const leg = familyBox(
      group,
      0.1,
      0.46,
      0.1,
      familyMaterial("metal"),
      x + Math.cos(rotation) * dx,
      0.26,
      z - Math.sin(rotation) * dx,
      false,
    );
    leg.rotation.y = rotation;
  }
}

function addFountainGrove(group: THREE.Group, width: number, depth: number): void {
  addParkBase(group, width, depth);
  familyBox(group, width * 0.14, 0.05, depth * 0.9, familyMaterial("stone"), 0, 0.14, 0, false);
  familyBox(group, width * 0.82, 0.05, depth * 0.12, familyMaterial("stone"), 0, 0.14, 0, false);
  const basin = familyMesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.22, 14),
    familyMaterial("stone"),
    0,
    0.2,
    0,
    false,
  );
  const water = familyMesh(
    new THREE.CylinderGeometry(0.72, 0.72, 0.04, 16),
    familyMaterial("water", 0.3),
    0,
    0.34,
    0,
    false,
  );
  water.userData.propWater = true;
  group.add(basin, water);
  addBench(group, width * 0.26, depth * 0.22, -0.55);
  addBench(group, -width * 0.26, -depth * 0.22, -0.55);
  addTree(group, -width * 0.34, depth * 0.3, 0.88);
  addTree(group, width * 0.34, -depth * 0.28, 0.92);
}

function addDuckPond(group: THREE.Group, width: number, depth: number): void {
  addParkBase(group, width, depth);
  const bank = familyMesh(
    new THREE.CylinderGeometry(width * 0.3, width * 0.34, 0.13, 16),
    familyMaterial("soil"),
    -width * 0.08,
    0.1,
    0,
    false,
  );
  const pond = familyMesh(
    new THREE.CylinderGeometry(width * 0.25, width * 0.25, 0.035, 18),
    familyMaterial("water", 0.28),
    -width * 0.08,
    0.18,
    0,
    false,
  );
  pond.userData.propWater = true;
  group.add(bank, pond);
  for (const z of [-depth * 0.2, 0, depth * 0.18]) {
    familyBox(group, 0.08, 0.8, 0.08, familyMaterial("grass"), width * 0.26, 0.4, z, false);
  }
  familyBox(
    group,
    0.75,
    0.55,
    0.7,
    familyMaterial("timber"),
    width * 0.2,
    0.3,
    -depth * 0.24,
    false,
  );
  addBench(group, width * 0.28, depth * 0.28, 0.45);
  addTree(group, -width * 0.34, -depth * 0.28, 0.9);
}

function addPlayLawn(group: THREE.Group, width: number, depth: number): void {
  addParkBase(group, width, depth);
  familyBox(group, width * 0.12, 0.045, depth * 0.88, familyMaterial("stone"), -width * 0.34, 0.13, 0, false);
  const frameMat = familyMaterial("timberDark");
  for (const x of [-0.72, 0.72]) {
    familyBox(group, 0.11, 2.05, 0.11, frameMat, x, 1.03, -depth * 0.06, false);
  }
  familyBox(group, 1.58, 0.11, 0.11, frameMat, 0, 2.02, -depth * 0.06, false);
  for (const x of [-0.38, 0.38]) {
    familyBox(group, 0.035, 1, 0.035, familyMaterial("metal"), x, 1.45, -depth * 0.06, false);
    familyBox(group, 0.5, 0.08, 0.3, familyMaterial("awning"), x, 0.94, -depth * 0.06, false);
  }
  const slide = familyBox(
    group,
    0.72,
    0.12,
    2.05,
    familyMaterial("copper", 0.7, 0.12),
    width * 0.22,
    0.72,
    depth * 0.04,
    false,
  );
  slide.rotation.x = -0.42;
  addBench(group, -width * 0.22, depth * 0.3, 0);
  addTree(group, width * 0.34, -depth * 0.3, 0.86);
}

function addReadingGarden(group: THREE.Group, width: number, depth: number): void {
  addParkBase(group, width, depth);
  const radius = Math.min(width, depth) * 0.18;
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    familyBox(
      group,
      0.1,
      2,
      0.1,
      familyMaterial("timberDark"),
      Math.cos(angle) * radius,
      1,
      Math.sin(angle) * radius,
      false,
    );
  }
  const roof = familyMesh(
    new THREE.CylinderGeometry(radius * 1.25, radius * 0.92, 0.32, 6),
    familyMaterial("roofWarm"),
    0,
    2.18,
    0,
    false,
  );
  group.add(roof);
  addBench(group, 0, depth * 0.28, 0);
  addBench(group, -width * 0.28, 0, Math.PI / 2);
  for (const [x, z, s] of [
    [-width * 0.35, -depth * 0.31, 0.85],
    [width * 0.34, depth * 0.31, 0.9],
    [width * 0.35, -depth * 0.3, 0.78],
  ] as const) {
    addTree(group, x, z, s);
  }
}

export function addParkVisual(
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  switch (identity?.variant) {
    case "duck_pond":
      addDuckPond(group, width, depth);
      break;
    case "play_lawn":
      addPlayLawn(group, width, depth);
      break;
    case "reading_garden":
      addReadingGarden(group, width, depth);
      break;
    default:
      addFountainGrove(group, width, depth);
      break;
  }
}
