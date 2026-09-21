import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BuildingInstance } from "@evervale/domain/world.types";
import type { BuildingMaterialTone, BuildingVisualIdentity } from "../visual-identity";

const palette: Record<BuildingMaterialTone | "metal" | "water" | "grass" | "soil" | "awning" | "window" | "warning" | "damaged", number> = {
  plaster: 0xe4d7bb,
  plasterWarm: 0xd7c39e,
  plasterSage: 0xc8d0b2,
  plasterOchre: 0xd6b982,
  plasterCool: 0xd7ded2,
  cream: 0xf0e4c8,
  stone: 0x9a9685,
  stoneWarm: 0xaaa087,
  brick: 0xa86f55,
  brickDark: 0x885b4b,
  timber: 0x75573d,
  timberLight: 0x927253,
  timberDark: 0x4f3d31,
  roof: 0x675a50,
  roofWarm: 0x8a5e49,
  roofGreen: 0x4e6a5d,
  roofBlue: 0x536a73,
  roofRust: 0x865948,
  copper: 0x9d7447,
  brass: 0xb18f55,
  metal: 0x4f5958,
  water: 0x72a9ad,
  grass: 0x789a6a,
  soil: 0x806447,
  awning: 0xb86f59,
  window: 0xffd89a,
  warning: 0xd56a55,
  damaged: 0xd59a4d,
};

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export function material(
  key: keyof typeof palette,
  roughness = 0.9,
  metalness = 0,
): THREE.MeshStandardMaterial {
  const cacheKey = `${key}:${roughness}:${metalness}`;
  let value = materialCache.get(cacheKey);
  if (!value) {
    value = new THREE.MeshStandardMaterial({
      color: palette[key],
      roughness,
      metalness,
    });
    value.userData.sharedMaterial = true;
    materialCache.set(cacheKey, value);
  }
  return value;
}

export function windowMaterial(): THREE.MeshStandardMaterial {
  const key = "window-glow";
  let value = materialCache.get(key);
  if (!value) {
    value = new THREE.MeshStandardMaterial({
      color: palette.window,
      emissive: 0xffb45f,
      emissiveIntensity: 0.35,
      roughness: 0.42,
    });
    value.userData.sharedMaterial = true;
    materialCache.set(key, value);
  }
  return value;
}

export function mesh(
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow = true,
): THREE.Mesh {
  const value = new THREE.Mesh(geometry, mat);
  value.position.set(x, y, z);
  value.castShadow = castShadow;
  value.receiveShadow = true;
  return value;
}

export function box(
  group: THREE.Group,
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  x = 0,
  y = height / 2,
  z = 0,
  castShadow = true,
): THREE.Mesh {
  const value = mesh(
    new THREE.BoxGeometry(width, height, depth),
    mat,
    x,
    y,
    z,
    castShadow,
  );
  group.add(value);
  return value;
}

export function addFoundation(group: THREE.Group, width: number, depth: number): void {
  box(group, width * 0.96, 0.28, depth * 0.96, material("stone"), 0, 0.14, 0);
  box(group, width * 0.9, 0.12, depth * 0.9, material("stoneWarm"), 0, 0.34, 0, false);
}

export function addWindow(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  const pane = box(group, 0.72, 0.82, 0.08, windowMaterial(), x, y, z, false);
  pane.userData.buildingGlow = true;
  const frame = material(identity.trimTone);
  box(group, 0.86, 0.08, 0.1, frame, x, y + 0.45, z, false);
  box(group, 0.86, 0.08, 0.1, frame, x, y - 0.45, z, false);
  box(group, 0.06, 0.82, 0.1, frame, x, y, z + 0.01, false);
}

export function addDoor(
  group: THREE.Group,
  x: number,
  z: number,
  identity: BuildingVisualIdentity,
  width = 0.85,
  height = 1.55,
): void {
  box(group, width, height, 0.1, material(identity.trimTone), x, height / 2 + 0.34, z, false);
  const knob = mesh(
    new THREE.SphereGeometry(0.055, 6, 4),
    material(identity.accentTone, 0.5, 0.25),
    x + width * 0.28,
    1.05,
    z + 0.08,
    false,
  );
  group.add(knob);
}

export function addGabledRoof(
  group: THREE.Group,
  width: number,
  depth: number,
  baseY: number,
  identity: BuildingVisualIdentity,
  rise = 1,
): void {
  const run = width / 2 + 0.28;
  const length = Math.hypot(run, rise);
  const angle = Math.atan2(rise, run);
  for (const side of [-1, 1] as const) {
    const slab = mesh(
      new THREE.BoxGeometry(length, 0.18, depth + 0.55),
      material(identity.roofTone),
      side * run / 2,
      baseY + rise / 2,
      0,
    );
    slab.rotation.z = side < 0 ? angle : -angle;
    group.add(slab);
  }
  box(
    group,
    0.16,
    0.2,
    depth + 0.58,
    material(identity.accentTone, 0.56, 0.22),
    0,
    baseY + rise + 0.03,
    0,
    false,
  );
}

export function addTimberFront(
  group: THREE.Group,
  width: number,
  depth: number,
  height: number,
  identity: BuildingVisualIdentity,
): void {
  const z = depth / 2 + 0.055;
  for (const x of [-width * 0.36, 0, width * 0.36]) {
    box(group, 0.11, height * 0.78, 0.11, material(identity.trimTone), x, height * 0.48, z, false);
  }
  for (const y of [height * 0.42, height * 0.72]) {
    box(group, width * 0.82, 0.1, 0.11, material(identity.trimTone), 0, y, z, false);
  }
}

export function addStoneStep(group: THREE.Group, x: number, z: number, width = 1.25): void {
  box(group, width, 0.16, 0.5, material("stoneWarm"), x, 0.12, z, false);
  box(group, width * 0.78, 0.12, 0.34, material("stone"), x, 0.26, z - 0.12, false);
}

export function addFlowerBox(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  identity: BuildingVisualIdentity,
): void {
  box(group, 0.78, 0.16, 0.22, material(identity.trimTone), x, y, z, false);
  for (const [dx, key] of [
    [-0.24, "awning"],
    [0, "plasterWarm"],
    [0.24, "plasterCool"],
  ] as const) {
    group.add(
      mesh(
        new THREE.OctahedronGeometry(0.09, 0),
        material(key),
        x + dx,
        y + 0.18 + Math.abs(dx) * 0.08,
        z + 0.02,
        false,
      ),
    );
  }
}

export function addChimney(
  group: THREE.Group,
  x: number,
  z: number,
  y: number,
  identity: BuildingVisualIdentity,
): void {
  box(group, 0.48, 1.35, 0.48, material("brick"), x, y + 0.3, z);
  box(group, 0.62, 0.14, 0.62, material(identity.accentTone), x, y + 0.98, z, false);
}

export function addDamageMarker(
  group: THREE.Group,
  state: BuildingInstance["damageState"],
  height: number,
): void {
  if (state !== "DISABLED" && state !== "DAMAGED") return;
  const marker = mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    material(state === "DISABLED" ? "warning" : "damaged", 0.58),
    0,
    height + 1.25,
    0,
    false,
  );
  marker.userData.damageMarker = true;
  group.add(marker);
}

export function compactStaticMeshes(group: THREE.Group): void {
  const buckets = new Map<string, {
    material: THREE.Material;
    geometries: THREE.BufferGeometry[];
    castShadow: boolean;
    receiveShadow: boolean;
    glow: boolean;
    water: boolean;
    damage: boolean;
  }>();

  for (const child of [...group.children]) {
    const source = child as THREE.Mesh;
    if (!source.isMesh) continue;
    source.updateMatrix();
    const transformed = source.geometry.index
      ? source.geometry.toNonIndexed()
      : source.geometry.clone();
    transformed.applyMatrix4(source.matrix);
    const mat = Array.isArray(source.material) ? source.material[0]! : source.material;
    const key = [
      mat.uuid,
      source.castShadow ? "cast" : "no-cast",
      source.receiveShadow ? "recv" : "no-recv",
      source.userData.buildingGlow ? "glow" : "",
      source.userData.propWater ? "water" : "",
      source.userData.damageMarker ? "damage" : "",
    ].join(":");

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        material: mat,
        geometries: [],
        castShadow: source.castShadow,
        receiveShadow: source.receiveShadow,
        glow: Boolean(source.userData.buildingGlow),
        water: Boolean(source.userData.propWater),
        damage: Boolean(source.userData.damageMarker),
      };
      buckets.set(key, bucket);
    }
    bucket.geometries.push(transformed);
    source.geometry.dispose();
  }

  group.clear();

  for (const bucket of buckets.values()) {
    const geometry = bucket.geometries.length === 1
      ? bucket.geometries[0]!
      : mergeGeometries(bucket.geometries, false);
    if (!geometry) {
      bucket.geometries.forEach((item) => item.dispose());
      continue;
    }
    if (bucket.geometries.length > 1) {
      bucket.geometries.forEach((item) => item.dispose());
    }
    const combined = new THREE.Mesh(geometry, bucket.material);
    combined.castShadow = bucket.castShadow;
    combined.receiveShadow = bucket.receiveShadow;
    combined.userData.buildingGlow = bucket.glow;
    combined.userData.propWater = bucket.water;
    combined.userData.damageMarker = bucket.damage;
    group.add(combined);
  }
}

export function finalizeBuilding(
  group: THREE.Group,
  building: BuildingInstance,
  identity: BuildingVisualIdentity,
  markerHeight: number,
): THREE.Group {
  addDamageMarker(group, building.damageState, markerHeight);
  compactStaticMeshes(group);
  group.position.set(building.position.x, 0, building.position.z);
  group.rotation.y = building.rotationY;
  group.userData.buildingId = building.id;
  group.userData.buildingDefinitionId = building.definitionId;
  group.userData.visualVariant = identity.variantName;
  group.userData.visualDialect = identity.dialect.id;
  return group;
}
