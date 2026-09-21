import * as THREE from "three";
import type { EnvironmentDialectPalette } from "./environment-dialect";
import { stableVisualHash } from "../visual-identity";

interface TreePlacement {
  x: number;
  z: number;
  scale: number;
  yaw: number;
}

function pseudo(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildPlacements(
  worldSeed: string | number,
  palette: EnvironmentDialectPalette,
): {
  broadleaf: TreePlacement[];
  conifer: TreePlacement[];
  birch: TreePlacement[];
} {
  const seed = stableVisualHash(String(worldSeed)) % 100000;
  const result = {
    broadleaf: [] as TreePlacement[],
    conifer: [] as TreePlacement[],
    birch: [] as TreePlacement[],
  };

  const totalWeight =
    palette.composition.broadleafWeight +
    palette.composition.coniferWeight +
    palette.composition.birchWeight;

  for (let i = 0; i < palette.composition.treeCount; i += 1) {
    const selector = pseudo(seed + i * 61) * totalWeight;
    const inner =
      pseudo(seed + i * 79 + 11) < palette.composition.innerGroveBias;
    const angle =
      (i / Math.max(1, palette.composition.treeCount)) * Math.PI * 2 +
      (pseudo(seed + i * 83 + 17) - 0.5) * 0.34;
    const radius = inner
      ? 31 + pseudo(seed + i * 97 + 23) * 8
      : 43 + pseudo(seed + i * 101 + 29) * 8;
    const placement: TreePlacement = {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale: 0.78 + pseudo(seed + i * 107 + 31) * 0.72,
      yaw: pseudo(seed + i * 109 + 37) * Math.PI * 2,
    };

    if (selector < palette.composition.broadleafWeight) {
      result.broadleaf.push(placement);
    } else if (
      selector <
      palette.composition.broadleafWeight + palette.composition.coniferWeight
    ) {
      result.conifer.push(placement);
    } else {
      result.birch.push(placement);
    }
  }

  return result;
}

function addBroadleaf(
  group: THREE.Group,
  placements: readonly TreePlacement[],
  palette: EnvironmentDialectPalette,
): void {
  if (placements.length === 0) return;

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: palette.trunk,
    roughness: 1,
  });
  const crownMaterial = new THREE.MeshStandardMaterial({
    color: palette.crown,
    roughness: 1,
    flatShading: true,
  });
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.16, 0.24, 2.15, 6),
    trunkMaterial,
    placements.length,
  );
  const crowns = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.78, 0),
    crownMaterial,
    placements.length * 2,
  );

  const dummy = new THREE.Object3D();
  placements.forEach((placement, index) => {
    const s = placement.scale;
    dummy.position.set(placement.x, 1.05 * s, placement.z);
    dummy.rotation.set(0, placement.yaw, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunk.setMatrixAt(index, dummy.matrix);

    for (let lobe = 0; lobe < 2; lobe += 1) {
      dummy.position.set(
        placement.x + (lobe === 0 ? -0.24 : 0.26) * s,
        (2.45 + lobe * 0.28) * s,
        placement.z + (lobe === 0 ? 0.08 : -0.12) * s,
      );
      dummy.rotation.set(0, placement.yaw + lobe * 0.7, (lobe ? 1 : -1) * 0.08);
      dummy.scale.set(1.05 * s, (0.86 + lobe * 0.08) * s, 1.02 * s);
      dummy.updateMatrix();
      crowns.setMatrixAt(index * 2 + lobe, dummy.matrix);
    }
  });

  trunk.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  trunk.castShadow = false;
  crowns.castShadow = false;
  trunk.receiveShadow = true;
  crowns.receiveShadow = true;
  group.add(trunk, crowns);
}

function addConifers(
  group: THREE.Group,
  placements: readonly TreePlacement[],
  palette: EnvironmentDialectPalette,
): void {
  if (placements.length === 0) return;

  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.19, 2.35, 6),
    new THREE.MeshStandardMaterial({ color: palette.trunk, roughness: 1 }),
    placements.length,
  );
  const needles = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.9, 1.6, 8),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.crown).multiplyScalar(0.82),
      roughness: 1,
      flatShading: true,
    }),
    placements.length * 2,
  );

  const dummy = new THREE.Object3D();
  placements.forEach((placement, index) => {
    const s = placement.scale;
    dummy.position.set(placement.x, 1.1 * s, placement.z);
    dummy.rotation.set(0, placement.yaw, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunk.setMatrixAt(index, dummy.matrix);

    for (let tier = 0; tier < 2; tier += 1) {
      dummy.position.set(
        placement.x,
        (2.25 + tier * 0.72) * s,
        placement.z,
      );
      dummy.rotation.set(0, placement.yaw + tier * 0.4, 0);
      const tierScale = (1 - tier * 0.18) * s;
      dummy.scale.set(tierScale, tierScale, tierScale);
      dummy.updateMatrix();
      needles.setMatrixAt(index * 2 + tier, dummy.matrix);
    }
  });

  trunk.instanceMatrix.needsUpdate = true;
  needles.instanceMatrix.needsUpdate = true;
  trunk.castShadow = false;
  needles.castShadow = false;
  trunk.receiveShadow = true;
  needles.receiveShadow = true;
  group.add(trunk, needles);
}

function addBirches(
  group: THREE.Group,
  placements: readonly TreePlacement[],
  palette: EnvironmentDialectPalette,
): void {
  if (placements.length === 0) return;

  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.16, 2.5, 6),
    new THREE.MeshStandardMaterial({ color: 0xc8c0ab, roughness: 1 }),
    placements.length,
  );
  const crowns = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.66, 0),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.crown).lerp(new THREE.Color(0x87936c), 0.28),
      roughness: 1,
      flatShading: true,
    }),
    placements.length * 2,
  );

  const dummy = new THREE.Object3D();
  placements.forEach((placement, index) => {
    const s = placement.scale * 0.92;
    dummy.position.set(placement.x, 1.2 * s, placement.z);
    dummy.rotation.set(0, placement.yaw, 0);
    dummy.scale.set(0.86 * s, 1.08 * s, 0.86 * s);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);

    for (let lobe = 0; lobe < 2; lobe += 1) {
      dummy.position.set(
        placement.x + (lobe === 0 ? -0.15 : 0.18) * s,
        (2.62 + lobe * 0.3) * s,
        placement.z,
      );
      dummy.rotation.set(0, placement.yaw + lobe * 0.6, 0);
      dummy.scale.set(0.88 * s, 0.72 * s, 0.88 * s);
      dummy.updateMatrix();
      crowns.setMatrixAt(index * 2 + lobe, dummy.matrix);
    }
  });

  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  trunks.castShadow = false;
  crowns.castShadow = false;
  trunks.receiveShadow = true;
  crowns.receiveShadow = true;
  group.add(trunks, crowns);
}

export function createDialectVegetation(
  worldSeed: string | number,
  palette: EnvironmentDialectPalette,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "environment_dialect_vegetation";
  group.userData.environmentDialectVegetation = true;

  const placements = buildPlacements(worldSeed, palette);
  addBroadleaf(group, placements.broadleaf, palette);
  addConifers(group, placements.conifer, palette);
  addBirches(group, placements.birch, palette);

  group.userData.broadleafCount = placements.broadleaf.length;
  group.userData.coniferCount = placements.conifer.length;
  group.userData.birchCount = placements.birch.length;
  return group;
}
