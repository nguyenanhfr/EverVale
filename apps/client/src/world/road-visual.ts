import * as THREE from "three";
import type { RoadSegment } from "@evervale/domain/world.types";

const materials = {
  base: new THREE.MeshStandardMaterial({ color: 0x9b8466, roughness: 1 }),
  shoulder: new THREE.MeshStandardMaterial({ color: 0xb19a78, roughness: 1 }),
  rut: new THREE.MeshStandardMaterial({ color: 0x75644f, roughness: 1 }),
  patch: new THREE.MeshStandardMaterial({ color: 0x887258, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x817d70, roughness: 1, flatShading: true }),
};
Object.values(materials).forEach((material) => {
  material.userData.sharedMaterial = true;
});

function hash(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: string, salt: number): number {
  let a = (hash(seed) + salt * 0x9e3779b9) >>> 0;
  a ^= a << 13;
  a ^= a >>> 17;
  a ^= a << 5;
  return (a >>> 0) / 4294967296;
}

function strip(
  width: number,
  height: number,
  length: number,
  material: THREE.Material,
  x: number,
  y: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, Math.max(0.1, length)),
    material,
  );
  mesh.position.set(x, y, 0);
  mesh.receiveShadow = true;
  return mesh;
}

export function createRoadVisual(road: RoadSegment, instanceSeed: string): THREE.Group {
  const group = new THREE.Group();
  const dx = road.to.x - road.from.x;
  const dz = road.to.z - road.from.z;
  const length = Math.max(0.1, Math.hypot(dx, dz));

  group.position.set((road.from.x + road.to.x) / 2, 0, (road.from.z + road.to.z) / 2);
  group.rotation.y = Math.atan2(dx, dz);
  group.userData.roadVisual = true;

  group.add(strip(2.72, 0.075, length, materials.base, 0, 0.045));
  group.add(strip(0.34, 0.035, length * 0.99, materials.shoulder, -1.48, 0.035));
  group.add(strip(0.34, 0.035, length * 0.99, materials.shoulder, 1.48, 0.035));
  group.add(strip(0.17, 0.022, length * 0.94, materials.rut, -0.56, 0.093));
  group.add(strip(0.17, 0.022, length * 0.94, materials.rut, 0.56, 0.093));

  const patchGeometry = new THREE.CircleGeometry(0.34, 7);
  const patches = new THREE.InstancedMesh(patchGeometry, materials.patch, 8);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 8; i += 1) {
    dummy.position.set(
      (seeded(instanceSeed, i) - 0.5) * 1.7,
      0.106,
      -length * 0.42 + seeded(instanceSeed, i + 19) * length * 0.84,
    );
    dummy.rotation.set(-Math.PI / 2, 0, seeded(instanceSeed, i + 43) * Math.PI);
    const s = 0.45 + seeded(instanceSeed, i + 61) * 0.75;
    dummy.scale.set(0.65 + s, 0.55 + s * 0.45, 1);
    dummy.updateMatrix();
    patches.setMatrixAt(i, dummy.matrix);
  }
  patches.instanceMatrix.needsUpdate = true;
  patches.receiveShadow = true;
  group.add(patches);

  const stoneGeometry = new THREE.DodecahedronGeometry(0.11, 0);
  const stoneCount = Math.max(8, Math.min(28, Math.round(length * 0.6)));
  const stones = new THREE.InstancedMesh(stoneGeometry, materials.stone, stoneCount);
  for (let i = 0; i < stoneCount; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    dummy.position.set(
      side * (1.47 + seeded(instanceSeed, i + 100) * 0.28),
      0.11,
      -length * 0.47 + seeded(instanceSeed, i + 140) * length * 0.94,
    );
    dummy.rotation.set(
      seeded(instanceSeed, i + 180),
      seeded(instanceSeed, i + 220) * Math.PI,
      seeded(instanceSeed, i + 260),
    );
    const s = 0.62 + seeded(instanceSeed, i + 300) * 0.85;
    dummy.scale.set(s, 0.55 * s, 0.8 * s);
    dummy.updateMatrix();
    stones.setMatrixAt(i, dummy.matrix);
  }
  stones.instanceMatrix.needsUpdate = true;
  stones.receiveShadow = true;
  group.add(stones);

  return group;
}
