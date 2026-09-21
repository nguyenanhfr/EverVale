import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const palette = {
  skinA: 0xd7aa86,
  skinB: 0xc68f6d,
  hair: 0x46382f,
  hairSoft: 0x665044,
  clothBlue: 0x637b89,
  clothGreen: 0x687b63,
  clothRust: 0xa16e55,
  clothMustard: 0xb58d58,
  clothPlum: 0x7b6478,
  dark: 0x4b514f,
  accent: 0xd1ad68,
  fur: 0x9a6b47,
  furLight: 0xc09368,
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

function mat(key: keyof typeof palette, roughness = 0.94): THREE.MeshStandardMaterial {
  const cacheKey = `${key}:${roughness}`;
  let material = cache.get(cacheKey);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color: palette[key],
      roughness,
    });
    material.userData.sharedMaterial = true;
    cache.set(cacheKey, material);
  }
  return material;
}

const transform = new THREE.Object3D();

function transformed(
  geometry: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.BufferGeometry {
  transform.position.set(x, y, z);
  transform.rotation.set(rx, ry, rz);
  transform.scale.set(sx, sy, sz);
  transform.updateMatrix();
  const result = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  geometry.dispose();
  result.applyMatrix4(transform.matrix);
  return result;
}

function combine(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 1) return geometries[0]!;
  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error("CITIZEN_GEOMETRY_MERGE_FAILED");
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}

function combinedMesh(
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
  castShadow: boolean,
): THREE.Mesh {
  const mesh = new THREE.Mesh(combine(geometries), material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCitizenVisual(
  index: number,
  child: boolean,
  castShadow: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const model = new THREE.Group();
  const scale = child ? 0.76 : 1;
  const clothKeys = ["clothBlue", "clothGreen", "clothRust", "clothMustard", "clothPlum"] as const;
  const cloth = mat(clothKeys[index % clothKeys.length]!);
  const skin = mat(index % 4 === 0 ? "skinB" : "skinA");
  const hair = mat(index % 3 === 0 ? "hairSoft" : "hair");

  const clothGeometry = [
    transformed(new THREE.CapsuleGeometry(0.27, 0.58, 4, 7), 0, 0.94, 0),
    transformed(new THREE.CylinderGeometry(0.055, 0.07, 0.55, 6), -0.34, 0.98, 0, 0, 0, -0.1),
    transformed(new THREE.CylinderGeometry(0.055, 0.07, 0.55, 6), 0.34, 0.98, 0, 0, 0, 0.1),
  ];

  if (index % 7 === 2) {
    clothGeometry.push(
      transformed(new THREE.CylinderGeometry(0.2, 0.23, 0.18, 9), 0, 1.91, 0),
    );
  }
  model.add(combinedMesh(clothGeometry, cloth, castShadow));

  model.add(combinedMesh([
    transformed(new THREE.SphereGeometry(0.235, 9, 7), 0, 1.58, 0),
  ], skin, castShadow));

  const darkGeometry = [
    transformed(new THREE.CapsuleGeometry(0.075, 0.34, 3, 6), -0.13, 0.38, 0),
    transformed(new THREE.CapsuleGeometry(0.075, 0.34, 3, 6), 0.13, 0.38, 0),
    transformed(new THREE.BoxGeometry(0.16, 0.10, 0.27), -0.13, 0.12, 0.07),
    transformed(new THREE.BoxGeometry(0.16, 0.10, 0.27), 0.13, 0.12, 0.07),
    transformed(new THREE.SphereGeometry(0.245, 9, 6), 0, 1.69, -0.015, 0, 0, 0, 1.02, 0.54, 1.02),
  ];
  model.add(combinedMesh(darkGeometry, hair, castShadow));

  const accentGeometry: THREE.BufferGeometry[] = [];
  if (index % 5 === 1) {
    accentGeometry.push(transformed(new THREE.BoxGeometry(0.42, 0.48, 0.16), 0, 0.95, -0.28, 0.05));
  }
  if (index % 7 === 2) {
    accentGeometry.push(transformed(new THREE.CylinderGeometry(0.31, 0.31, 0.055, 9), 0, 1.82, 0));
  }
  if (accentGeometry.length > 0) {
    model.add(combinedMesh(accentGeometry, mat("accent"), false));
  }

  model.scale.setScalar(scale);
  group.add(model);
  group.userData.modelRoot = model;
  group.userData.baseModelScale = scale;
  group.userData.child = child;
  return group;
}

export function updateCitizenVisual(
  citizen: THREE.Group,
  time: number,
  moving: boolean,
  index: number,
): void {
  const model = citizen.userData.modelRoot as THREE.Group | undefined;
  const baseScale = Number(citizen.userData.baseModelScale ?? 1);
  if (!model) return;

  const phase = time / (moving ? 145 : 470) + index * 0.71;
  const step = Math.sin(phase);
  const bob = moving ? Math.abs(Math.sin(phase * 2)) * 0.04 : Math.sin(phase) * 0.012;
  const squash = moving ? Math.abs(step) * 0.018 : 0;
  model.position.y = bob;
  model.rotation.z = moving ? step * 0.022 : Math.sin(phase) * 0.008;
  model.rotation.x = moving ? Math.sin(phase * 0.5) * 0.012 : 0;
  model.scale.set(
    baseScale * (1 + squash * 0.35),
    baseScale * (1 - squash),
    baseScale * (1 + squash * 0.2),
  );
}

function part(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow: boolean,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function createDogVisual(): THREE.Group {
  const group = new THREE.Group();
  const fur = mat("fur");
  const furLight = mat("furLight");

  const darkParts = [
    transformed(new THREE.CapsuleGeometry(0.22, 0.48, 4, 7), 0, 0.45, 0, 0, 0, Math.PI / 2, 1, 1.25, 0.86),
    transformed(new THREE.SphereGeometry(0.29, 8, 7), 0.58, 0.59, 0),
    transformed(new THREE.ConeGeometry(0.105, 0.28, 5), 0.5, 0.86, -0.15, 0, 0, 0.18),
    transformed(new THREE.ConeGeometry(0.105, 0.28, 5), 0.5, 0.86, 0.15, 0, 0, -0.18),
  ];
  group.add(combinedMesh(darkParts, fur, true));

  const lightParts = [
    transformed(new THREE.SphereGeometry(0.16, 7, 5), 0.79, 0.52, 0, 0, 0, 0, 1, 0.74, 0.82),
  ];
  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.14, 0.14]) {
      lightParts.push(transformed(new THREE.CylinderGeometry(0.055, 0.065, 0.34, 6), x, 0.22, z));
    }
  }
  group.add(combinedMesh(lightParts, furLight, false));

  const tail = part(new THREE.CylinderGeometry(0.045, 0.075, 0.62, 6), fur, -0.58, 0.67, 0, false);
  tail.rotation.z = -Math.PI / 3;
  group.add(tail);
  group.userData.tail = tail;
  return group;
}

export function updateDogVisual(dog: THREE.Group, time: number): void {
  const tail = dog.userData.tail as THREE.Mesh | undefined;
  if (tail) tail.rotation.x = Math.sin(time / 90) * 0.65;
  dog.position.y = Math.abs(Math.sin(time / 175)) * 0.025;
}
