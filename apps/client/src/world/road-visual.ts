import * as THREE from "three";
import type { RoadSegment } from "@evervale/domain/world.types";

const materials = {
  dirt: new THREE.MeshStandardMaterial({ color: 0x9a8165, roughness: 1 }),
  rut: new THREE.MeshStandardMaterial({ color: 0x6f5d4c, roughness: 1 }),
  verge: new THREE.MeshStandardMaterial({ color: 0x6f865e, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8c897c, roughness: 1, flatShading: true }),
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

function random(seed: string, salt: number): number {
  let x = (hash(seed) + salt * 0x9e3779b9) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

export function createRoadVisual(road: RoadSegment): THREE.Group {
  const group = new THREE.Group();
  const dx = road.to.x - road.from.x;
  const dz = road.to.z - road.from.z;
  const length = Math.max(0.1, Math.hypot(dx, dz));
  const yaw = Math.atan2(dx, dz);

  const shoulder = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.028, length + 0.18),
    materials.verge,
  );
  shoulder.position.y = 0.016;
  shoulder.receiveShadow = true;
  group.add(shoulder);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.62, 0.055, length),
    materials.dirt,
  );
  base.position.y = 0.043;
  base.receiveShadow = true;
  group.add(base);

  for (const x of [-0.58, 0.58]) {
    const rut = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.035, Math.max(0.5, length - 0.4)),
      materials.rut,
    );
    rut.position.set(x, 0.073, 0);
    rut.receiveShadow = true;
    group.add(rut);
  }

  const stoneCount = Math.max(2, Math.min(10, Math.floor(length / 4)));
  const stoneGeometry = new THREE.DodecahedronGeometry(0.18, 0);
  const stones = new THREE.InstancedMesh(stoneGeometry, materials.stone, stoneCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < stoneCount; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -length / 2 + (i + 0.5) * (length / stoneCount);
    dummy.position.set(
      side * (1.58 + random(road.id, i) * 0.18),
      0.13,
      z + (random(road.id, i + 31) - 0.5) * 0.7,
    );
    dummy.rotation.set(
      random(road.id, i + 61) * 0.6,
      random(road.id, i + 91) * Math.PI,
      random(road.id, i + 121) * 0.5,
    );
    const scale = 0.72 + random(road.id, i + 151) * 0.7;
    dummy.scale.set(scale, 0.62 * scale, 0.82 * scale);
    dummy.updateMatrix();
    stones.setMatrixAt(i, dummy.matrix);
  }
  stones.instanceMatrix.needsUpdate = true;
  stones.receiveShadow = true;
  stones.castShadow = false;
  group.add(stones);

  group.position.set(
    (road.from.x + road.to.x) / 2,
    0,
    (road.from.z + road.to.z) / 2,
  );
  group.rotation.y = yaw;
  group.userData.roadId = road.id;
  return group;
}
