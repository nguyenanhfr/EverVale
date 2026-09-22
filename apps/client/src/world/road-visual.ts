import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
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


function addRoadPatch(
  group: THREE.Group,
  x: number,
  z: number,
  rotation: number,
  scaleX: number,
  scaleZ: number,
): void {
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 8),
    materials.verge,
  );
  patch.rotation.x = -Math.PI / 2;
  patch.rotation.z = rotation;
  patch.position.set(x, 0.026, z);
  patch.scale.set(scaleX, scaleZ, 1);
  patch.receiveShadow = true;
  group.add(patch);
}

function compactRoad(group: THREE.Group): void {
  const buckets = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();

  for (const child of [...group.children]) {
    const source = child as THREE.Mesh;
    if (!source.isMesh) continue;
    source.updateMatrix();
    const geometry = source.geometry.index
      ? source.geometry.toNonIndexed()
      : source.geometry.clone();
    geometry.applyMatrix4(source.matrix);

    const sourceMaterial = Array.isArray(source.material)
      ? source.material[0]!
      : source.material;
    let bucket = buckets.get(sourceMaterial.uuid);
    if (!bucket) {
      bucket = { material: sourceMaterial, geometries: [] };
      buckets.set(sourceMaterial.uuid, bucket);
    }
    bucket.geometries.push(geometry);
    source.geometry.dispose();
  }

  group.clear();

  for (const bucket of buckets.values()) {
    const geometry =
      bucket.geometries.length === 1
        ? bucket.geometries[0]!
        : mergeGeometries(bucket.geometries, false);
    if (!geometry) {
      bucket.geometries.forEach((value) => value.dispose());
      continue;
    }
    if (bucket.geometries.length > 1) {
      bucket.geometries.forEach((value) => value.dispose());
    }
    const combined = new THREE.Mesh(geometry, bucket.material);
    combined.receiveShadow = true;
    combined.castShadow = false;
    group.add(combined);
  }
}

export function createRoadVisual(road: RoadSegment): THREE.Group {
  const group = new THREE.Group();
  const dx = road.to.x - road.from.x;
  const dz = road.to.z - road.from.z;
  const length = Math.max(0.1, Math.hypot(dx, dz));
  const yaw = Math.atan2(dx, dz);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.72, 0.055, length),
    materials.dirt,
  );
  base.position.y = 0.032;
  base.receiveShadow = true;
  group.add(base);

  for (const x of [-0.58, 0.58]) {
    const rut = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.035, Math.max(0.5, length - 0.4)),
      materials.rut,
    );
    rut.position.set(x, 0.087, 0);
    rut.receiveShadow = true;
    group.add(rut);
  }

  for (const x of [-1.5, 1.5]) {
    const verge = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.03, length),
      materials.verge,
    );
    verge.position.set(x, 0.018, 0);
    verge.receiveShadow = true;
    group.add(verge);
  }

  const patchCount = Math.max(4, Math.min(18, Math.floor(length / 1.7)));
  for (let i = 0; i < patchCount; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -length / 2 + ((i + 0.5) / patchCount) * length;
    addRoadPatch(
      group,
      side * (1.55 + random(road.id, i + 211) * 0.32),
      z + (random(road.id, i + 241) - 0.5) * 0.9,
      random(road.id, i + 271) * Math.PI,
      0.75 + random(road.id, i + 301) * 0.65,
      0.5 + random(road.id, i + 331) * 0.55,
    );
  }

  const stoneCount = Math.max(2, Math.min(10, Math.floor(length / 4)));
  for (let i = 0; i < stoneCount; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -length / 2 + (i + 0.5) * (length / stoneCount);
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.18, 0),
      materials.stone,
    );
    stone.position.set(
      side * (1.62 + random(road.id, i) * 0.2),
      0.11,
      z + (random(road.id, i + 31) - 0.5) * 0.7,
    );
    stone.rotation.set(
      random(road.id, i + 61) * 0.6,
      random(road.id, i + 91) * Math.PI,
      random(road.id, i + 121) * 0.5,
    );
    const scale = 0.72 + random(road.id, i + 151) * 0.7;
    stone.scale.set(scale, 0.62 * scale, 0.82 * scale);
    stone.receiveShadow = true;
    group.add(stone);
  }

  compactRoad(group);

  group.position.set(
    (road.from.x + road.to.x) / 2,
    0,
    (road.from.z + road.to.z) / 2,
  );
  group.rotation.y = yaw;
  group.userData.roadId = road.id;
  return group;
}
