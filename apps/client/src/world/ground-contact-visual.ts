import * as THREE from "three";
import type { BuildingVisualIdentity } from "./visual-identity";
import { familyMaterial } from "./buildings/building-family-helpers";

type ContactKind = "civic" | "residential" | "industrial" | "rural" | "green";

function kindFor(definitionId: string): ContactKind {
  if (["town_center", "school", "guard_post"].includes(definitionId)) return "civic";
  if (["house_small", "restaurant"].includes(definitionId)) return "residential";
  if (["workshop", "power_plant", "water_plant", "builders_yard"].includes(definitionId)) {
    return "industrial";
  }
  if (definitionId === "farm") return "rural";
  return "green";
}

function pseudo(seed: number, salt: number): number {
  let x = (seed + Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

function addFlatPatch(
  group: THREE.Group,
  radius: number,
  x: number,
  z: number,
  rotation: number,
  scaleX: number,
  scaleZ: number,
  material: THREE.Material,
): void {
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 9),
    material,
  );
  patch.rotation.x = -Math.PI / 2;
  patch.rotation.z = rotation;
  patch.position.set(x, 0.028, z);
  patch.scale.set(scaleX, scaleZ, 1);
  patch.receiveShadow = true;
  patch.userData.groundContact = true;
  group.add(patch);
}

/**
 * Adds presentation-only terrain contact around a completed building.
 * Geometry remains inside the building group so compactBuilding() merges it
 * with the family mesh instead of adding persistent per-detail draw calls.
 */
export function addBuildingGroundContact(
  group: THREE.Group,
  definitionId: string,
  width: number,
  depth: number,
  identity?: BuildingVisualIdentity,
): void {
  const kind = kindFor(definitionId);
  const seed = identity?.seed ?? 1;

  const surface =
    kind === "industrial"
      ? familyMaterial("stoneDark")
      : kind === "civic"
        ? familyMaterial("stone")
        : kind === "rural"
          ? familyMaterial("soil")
          : familyMaterial("grass");

  const apronWidth = width + (kind === "industrial" ? 1.2 : 0.8);
  const apronDepth = depth + (kind === "industrial" ? 1.15 : 0.8);
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(apronWidth, 0.045, apronDepth),
    surface,
  );
  apron.position.y = 0.018;
  apron.receiveShadow = true;
  apron.userData.groundContact = true;
  group.add(apron);

  const fringe =
    kind === "industrial" || kind === "civic"
      ? familyMaterial("soil")
      : familyMaterial("grass");

  const patchCount = kind === "green" ? 4 : 8;
  for (let i = 0; i < patchCount; i += 1) {
    const side = i % 4;
    const along = pseudo(seed, i + 11) - 0.5;
    const spread = pseudo(seed, i + 37);
    const edgeX = apronWidth / 2 + 0.18 + spread * 0.22;
    const edgeZ = apronDepth / 2 + 0.18 + spread * 0.22;
    const x =
      side === 0 ? -edgeX
      : side === 1 ? edgeX
      : along * apronWidth * 0.8;
    const z =
      side === 2 ? -edgeZ
      : side === 3 ? edgeZ
      : along * apronDepth * 0.8;

    addFlatPatch(
      group,
      0.42 + pseudo(seed, i + 71) * 0.28,
      x,
      z,
      pseudo(seed, i + 101) * Math.PI,
      0.8 + pseudo(seed, i + 131) * 0.55,
      0.55 + pseudo(seed, i + 151) * 0.45,
      fringe,
    );
  }

  if (kind === "residential" || kind === "civic") {
    const stepMat = familyMaterial("stone");
    const front = depth / 2 + 0.55;
    for (let i = 0; i < 3; i += 1) {
      const step = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 + i * 0.035, 0.3 + i * 0.035, 0.055, 8),
        stepMat,
      );
      step.position.set(
        (pseudo(seed, i + 211) - 0.5) * 0.18,
        0.045,
        front + i * 0.42,
      );
      step.rotation.y = pseudo(seed, i + 241) * 0.4;
      step.receiveShadow = true;
      step.userData.groundContact = true;
      group.add(step);
    }
  }
}
