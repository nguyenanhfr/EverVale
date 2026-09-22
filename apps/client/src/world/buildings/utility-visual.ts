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

function addStack(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  height: number,
  radius = 0.38,
): void {
  group.add(
    familyMesh(
      new THREE.CylinderGeometry(radius * 0.82, radius, height, 10),
      familyMaterial("metal", 0.68, 0.28),
      x,
      y,
      z,
    ),
  );
  familyBox(group, radius * 2.05, 0.12, radius * 2.05, familyMaterial("copper", 0.5, 0.3), x, y + height / 2 + 0.08, z, false);
}

function addPowerBase(group: THREE.Group, width: number, depth: number, taller = false): number {
  const h = taller ? 4.45 : 3.8;
  addFamilyFoundation(group, width, depth);
  familyBox(group, width * 0.9, h, depth * 0.82, familyMaterial("brick"), 0, h / 2 + 0.34, 0);
  familyBox(group, width * 0.94, 0.28, depth * 0.9, familyMaterial("metal", 0.72, 0.25), 0, h + 0.45, 0);
  for (const x of [-width * 0.24, width * 0.24]) {
    addFamilyWindow(group, x, 1.75, depth * 0.41 + 0.08);
  }
  return h;
}

function addTurbine(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius = 0.78,
): void {
  const wheel = familyMesh(
    new THREE.TorusGeometry(radius, 0.14, 8, 20),
    familyMaterial("copper", 0.55, 0.28),
    x,
    y,
    z,
    false,
  );
  wheel.userData.buildingGlow = true;
  group.add(wheel);
  for (const angle of [0, Math.PI / 2]) {
    const spoke = familyBox(group, radius * 1.6, 0.09, 0.08, familyMaterial("metal"), x, y, z + 0.01, false);
    spoke.rotation.z = angle;
  }
}

function addTwinStack(group: THREE.Group, width: number, depth: number): void {
  const h = addPowerBase(group, width, depth);
  for (const x of [-width * 0.24, width * 0.24]) {
    addStack(group, x, h + 1.22, -depth * 0.18, 2.45);
  }
  addTurbine(group, 0, 1.45, depth * 0.43 + 0.13, 0.75);
}

function addTurbineHall(group: THREE.Group, width: number, depth: number): void {
  const h = addPowerBase(group, width, depth, true);
  addStack(group, width * 0.27, h + 1.45, -depth * 0.14, 2.9, 0.46);
  familyBox(group, width * 0.48, 1.15, depth * 0.68, familyMaterial("metal", 0.62, 0.24), -width * 0.18, 3.15, 0);
  addTurbine(group, -width * 0.18, 2.05, depth * 0.43 + 0.13, 0.92);
}

function addGeneratorAnnex(group: THREE.Group, width: number, depth: number): void {
  const h = addPowerBase(group, width, depth);
  familyBox(group, width * 0.42, 2.45, depth * 0.68, familyMaterial("metal", 0.68, 0.28), width * 0.36, 1.57, -depth * 0.03);
  familyBox(group, width * 0.48, 0.2, depth * 0.76, familyMaterial("roofWarm"), width * 0.36, 2.88, -depth * 0.03);
  for (let i = 0; i < 3; i += 1) {
    const module = familyBox(group, 0.62, 0.82, 0.7, familyMaterial("copper", 0.56, 0.24), -width * 0.28 + i * 0.72, 0.52, depth * 0.58, false);
    if (i === 1) module.userData.buildingGlow = true;
  }
  addStack(group, -width * 0.31, h + 1.02, -depth * 0.18, 2.1, 0.32);
}

function addWaterBase(group: THREE.Group, width: number, depth: number): number {
  const h = 3.15;
  addFamilyFoundation(group, width, depth);
  familyBox(group, width * 0.82, h, depth * 0.76, familyMaterial("plaster"), 0, h / 2 + 0.34, 0);
  addFamilyGabledRoof(group, width * 0.9, depth * 0.82, h + 0.34, familyMaterial("roof"), 0.8);
  addFamilyDoor(group, 0, depth * 0.38 + 0.08);
  return h;
}

function addCistern(
  group: THREE.Group,
  x: number,
  z: number,
  radius = 0.78,
  height = 1.55,
): void {
  const tank = familyMesh(
    new THREE.CylinderGeometry(radius * 0.88, radius, height, 14),
    familyMaterial("water", 0.42, 0.08),
    x,
    height / 2 + 0.16,
    z,
    false,
  );
  tank.userData.propWater = true;
  group.add(tank);
  const rim = familyMesh(
    new THREE.TorusGeometry(radius * 0.92, 0.06, 6, 16),
    familyMaterial("metal", 0.62, 0.22),
    x,
    height + 0.12,
    z,
    false,
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
}

function addTwinCistern(group: THREE.Group, width: number, depth: number): void {
  addWaterBase(group, width, depth);
  for (const x of [-width * 0.3, width * 0.3]) {
    addCistern(group, x, -depth * 0.48);
  }
  familyBox(group, width * 0.48, 0.16, 0.16, familyMaterial("metal"), 0, 0.9, -depth * 0.48, false);
}

function addPumpCourt(group: THREE.Group, width: number, depth: number): void {
  addWaterBase(group, width, depth);
  const pump = familyMesh(
    new THREE.CylinderGeometry(0.44, 0.52, 1.15, 10),
    familyMaterial("metal", 0.58, 0.26),
    width * 0.24,
    0.72,
    depth * 0.52,
    false,
  );
  group.add(pump);
  for (let i = 0; i < 3; i += 1) {
    const gauge = familyMesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12),
      i === 1 ? familyMaterial("copper") : familyMaterial("cream"),
      -width * 0.28 + i * 0.48,
      1.18 + (i % 2) * 0.22,
      depth * 0.39 + 0.12,
      false,
    );
    gauge.rotation.x = Math.PI / 2;
    group.add(gauge);
  }
  familyBox(group, width * 0.62, 0.12, 0.12, familyMaterial("metal"), 0, 0.62, depth * 0.57, false);
}

function addFilterHouse(group: THREE.Group, width: number, depth: number): void {
  addWaterBase(group, width, depth);
  familyBox(group, width * 0.36, 2.2, depth * 0.58, familyMaterial("stone"), width * 0.37, 1.28, -depth * 0.04);
  familyBox(group, width * 0.42, 0.18, depth * 0.66, familyMaterial("roofWarm"), width * 0.37, 2.45, -depth * 0.04);
  for (const x of [-width * 0.25, width * 0.06]) {
    const basin = familyBox(group, width * 0.22, 0.2, depth * 0.54, familyMaterial("stoneDark"), x, 0.18, -depth * 0.53, false);
    basin.userData.propWater = true;
    familyBox(group, width * 0.18, 0.05, depth * 0.48, familyMaterial("water", 0.36, 0.04), x, 0.31, -depth * 0.53, false).userData.propWater = true;
  }
}

export function addPowerPlantVisual(
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  switch (identity?.variant) {
    case "turbine_hall":
      addTurbineHall(group, width, depth);
      break;
    case "generator_annex":
      addGeneratorAnnex(group, width, depth);
      break;
    default:
      addTwinStack(group, width, depth);
      break;
  }
}

export function addWaterPlantVisual(
  group: THREE.Group,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  switch (identity?.variant) {
    case "pump_court":
      addPumpCourt(group, width, depth);
      break;
    case "filter_house":
      addFilterHouse(group, width, depth);
      break;
    default:
      addTwinCistern(group, width, depth);
      break;
  }
}
