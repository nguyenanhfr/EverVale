import * as THREE from "three";
import type { WorldState } from "@evervale/domain/world.types";
import type { BuildCatalogEntryDto } from "@evervale/protocol/world";

export interface AmbientVisualRig {
  group: THREE.Group;
  fireflies: THREE.Points;
}

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x68875d, roughness: 1, flatShading: true }),
  grassLight: new THREE.MeshStandardMaterial({ color: 0x7d9a69, roughness: 1, flatShading: true }),
  flower: new THREE.MeshStandardMaterial({ color: 0xd7a56d, roughness: 0.95 }),
  flowerPink: new THREE.MeshStandardMaterial({ color: 0xc98782, roughness: 0.95 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x7a7d70, roughness: 1, flatShading: true }),
  shrub: new THREE.MeshStandardMaterial({ color: 0x557250, roughness: 1, flatShading: true }),
};
Object.values(materials).forEach((material) => {
  material.userData.sharedMaterial = true;
});

const fireflyMaterial = new THREE.PointsMaterial({
  color: 0xffdf8a,
  size: 0.18,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
fireflyMaterial.userData.sharedMaterial = true;

function hash(seed: number, salt: number): number {
  let a = (seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  a ^= a << 13;
  a ^= a >>> 17;
  a ^= a << 5;
  return (a >>> 0) / 4294967296;
}

function pointSegmentDistance(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz;
  const t = len2 <= 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wz * vz) / len2));
  return Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
}

function positionIsClear(
  x: number,
  z: number,
  world: WorldState,
  buildCatalog: BuildCatalogEntryDto[],
): boolean {
  if ((world.roads ?? []).some((road) =>
    pointSegmentDistance(x, z, road.from.x, road.from.z, road.to.x, road.to.z) < 3.7
  )) return false;

  return !world.buildings.some((building) => {
    const meta = buildCatalog.find((item) => item.id === building.definitionId);
    const width = meta ? meta.footprintCellsX * meta.gridCellMeters : 6;
    const depth = meta ? meta.footprintCellsZ * meta.gridCellMeters : 5;
    const radius = Math.max(width, depth) * 0.62 + 1.6;
    return Math.hypot(x - building.position.x, z - building.position.z) < radius;
  });
}

function fillInstances(
  mesh: THREE.InstancedMesh,
  world: WorldState,
  buildCatalog: BuildCatalogEntryDto[],
  seed: number,
  count: number,
  salt: number,
  scaleRange: readonly [number, number],
): void {
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let i = 0; i < count * 10 && placed < count; i += 1) {
    const x = -43 + hash(seed, salt + i * 3) * 86;
    const z = -43 + hash(seed, salt + i * 3 + 1) * 86;
    if (!positionIsClear(x, z, world, buildCatalog)) continue;
    const s = scaleRange[0] + hash(seed, salt + i * 3 + 2) * (scaleRange[1] - scaleRange[0]);
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, hash(seed, salt + i + 800) * Math.PI * 2, 0);
    dummy.scale.set(s, 0.8 + s * 0.25, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
}

export function createAmbientWorldVisual(
  world: WorldState,
  buildCatalog: BuildCatalogEntryDto[],
): AmbientVisualRig {
  const group = new THREE.Group();
  group.userData.ambientVisual = true;

  const grassGeometry = new THREE.ConeGeometry(0.12, 0.48, 3);
  grassGeometry.translate(0, 0.24, 0);
  const grass = new THREE.InstancedMesh(grassGeometry, materials.grass, 110);
  fillInstances(grass, world, buildCatalog, world.seed, 110, 1000, [0.65, 1.25]);
  grass.receiveShadow = true;
  group.add(grass);

  const grassLightGeometry = new THREE.ConeGeometry(0.09, 0.38, 3);
  grassLightGeometry.translate(0, 0.19, 0);
  const grassLight = new THREE.InstancedMesh(grassLightGeometry, materials.grassLight, 65);
  fillInstances(grassLight, world, buildCatalog, world.seed, 65, 3000, [0.55, 1.15]);
  group.add(grassLight);

  const shrubGeometry = new THREE.DodecahedronGeometry(0.38, 0);
  shrubGeometry.translate(0, 0.34, 0);
  const shrubs = new THREE.InstancedMesh(shrubGeometry, materials.shrub, 26);
  fillInstances(shrubs, world, buildCatalog, world.seed, 26, 5000, [0.72, 1.5]);
  shrubs.receiveShadow = true;
  group.add(shrubs);

  const rockGeometry = new THREE.DodecahedronGeometry(0.22, 0);
  rockGeometry.translate(0, 0.15, 0);
  const rocks = new THREE.InstancedMesh(rockGeometry, materials.rock, 32);
  fillInstances(rocks, world, buildCatalog, world.seed, 32, 7000, [0.55, 1.35]);
  rocks.receiveShadow = true;
  group.add(rocks);

  const flowerGeometry = new THREE.OctahedronGeometry(0.085, 0);
  flowerGeometry.translate(0, 0.24, 0);
  const flowers = new THREE.InstancedMesh(flowerGeometry, materials.flower, 30);
  fillInstances(flowers, world, buildCatalog, world.seed, 30, 9000, [0.7, 1.2]);
  group.add(flowers);

  const flowersPink = new THREE.InstancedMesh(flowerGeometry.clone(), materials.flowerPink, 22);
  fillInstances(flowersPink, world, buildCatalog, world.seed, 22, 11000, [0.65, 1.1]);
  group.add(flowersPink);

  const fireflyPositions: number[] = [];
  for (let i = 0; i < 24; i += 1) {
    const angle = hash(world.seed, 13000 + i) * Math.PI * 2;
    const radius = 7 + hash(world.seed, 14000 + i) * 24;
    fireflyPositions.push(
      Math.cos(angle) * radius,
      0.8 + hash(world.seed, 15000 + i) * 2.1,
      Math.sin(angle) * radius,
    );
  }
  const fireflyGeometry = new THREE.BufferGeometry();
  fireflyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(fireflyPositions, 3));
  const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
  fireflies.visible = false;
  group.add(fireflies);

  return { group, fireflies };
}

export function updateAmbientVisuals(
  rig: AmbientVisualRig,
  time: number,
  nightFactor: number,
): void {
  const opacity = Math.max(0, Math.min(0.72, (nightFactor - 0.28) * 1.05));
  fireflyMaterial.opacity = opacity;
  rig.fireflies.visible = opacity > 0.02;
  rig.fireflies.rotation.y = time * 0.000025;
  rig.fireflies.position.y = Math.sin(time / 1150) * 0.18;
}
