import * as THREE from "three";
import type { WorldVisualDialect } from "../visual-identity";

const palette = {
  plaster: 0xe4d7bb,
  plasterWarm: 0xd7c39e,
  timber: 0x75573d,
  timberDark: 0x4f3d31,
  stone: 0x9a9685,
  stoneDark: 0x6c7068,
  brick: 0xa86f55,
  roof: 0x675a50,
  roofWarm: 0x8a5e49,
  copper: 0x9d7447,
  metal: 0x4f5958,
  water: 0x72a9ad,
  grass: 0x789a6a,
  soil: 0x806447,
  awning: 0xb86f59,
  cream: 0xf0e4c8,
  window: 0xffd89a,
};

type PaletteKey = keyof typeof palette;

const dialectPalette: Readonly<Record<WorldVisualDialect, Partial<Record<PaletteKey, number>>>> = {
  hearthstone: {},
  willowbrook: {
    plaster: 0xd9dfc8,
    plasterWarm: 0xcbd6b9,
    timber: 0x80684c,
    timberDark: 0x5f503f,
    stone: 0x929a8a,
    stoneDark: 0x687466,
    roof: 0x667269,
    roofWarm: 0x77806f,
    grass: 0x72976d,
    awning: 0x9f7764,
  },
  amberfield: {
    plaster: 0xdfcb9f,
    plasterWarm: 0xd4b57d,
    timber: 0x765039,
    timberDark: 0x4d372c,
    stone: 0x9f9078,
    stoneDark: 0x746655,
    brick: 0xb3744e,
    roof: 0x785044,
    roofWarm: 0x9a6045,
    copper: 0xa57943,
    grass: 0x87915f,
    soil: 0x8b6846,
    awning: 0xb66e4d,
  },
  bluebell: {
    plaster: 0xe3e2d4,
    plasterWarm: 0xd5d8cb,
    timber: 0x746b5f,
    timberDark: 0x514c46,
    stone: 0x969b9a,
    stoneDark: 0x687172,
    roof: 0x5d6970,
    roofWarm: 0x6c756f,
    copper: 0x927452,
    water: 0x6fa8b1,
    grass: 0x6f9180,
    awning: 0x7d7f93,
  },
};

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const dialectMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

export function familyMaterial(
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
    value.userData.paletteKey = key;
    materialCache.set(cacheKey, value);
  }
  return value;
}

function windowMaterial(): THREE.MeshStandardMaterial {
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
    value.userData.paletteKey = "window";
    materialCache.set(key, value);
  }
  return value;
}

export function applyFamilyDialect(
  group: THREE.Group,
  dialect: WorldVisualDialect | undefined,
): void {
  if (!dialect || dialect === "hearthstone") return;
  const overrides = dialectPalette[dialect];

  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const base = mesh.material as THREE.MeshStandardMaterial;
    const paletteKey = base.userData.paletteKey as PaletteKey | undefined;
    if (!paletteKey) return;
    const color = overrides[paletteKey];
    if (color === undefined) return;

    const cacheKey = `${base.uuid}:${dialect}`;
    let mapped = dialectMaterialCache.get(cacheKey);
    if (!mapped) {
      mapped = base.clone();
      mapped.color.setHex(color);
      mapped.userData.sharedMaterial = true;
      mapped.userData.paletteKey = paletteKey;
      dialectMaterialCache.set(cacheKey, mapped);
    }
    mesh.material = mapped;
  });
}

export function familyMesh(
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

export function familyBox(
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
  const value = familyMesh(
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

export function addFamilyFoundation(group: THREE.Group, width: number, depth: number): void {
  familyBox(group, width * 1.03, 0.05, depth * 1.03, familyMaterial("stoneDark"), 0, 0.025, 0, false);
  familyBox(group, width * 0.96, 0.28, depth * 0.96, familyMaterial("stoneDark"), 0, 0.14, 0);
  familyBox(group, width * 0.9, 0.12, depth * 0.9, familyMaterial("stone"), 0, 0.34, 0, false);
}

export function addFamilyWindow(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
): void {
  const value = familyBox(group, 0.72, 0.82, 0.08, windowMaterial(), x, y, z, false);
  value.userData.buildingGlow = true;
  const frame = familyMaterial("timberDark");
  familyBox(group, 0.86, 0.08, 0.1, frame, x, y + 0.45, z, false);
  familyBox(group, 0.86, 0.08, 0.1, frame, x, y - 0.45, z, false);
}

export function addFamilyDoor(
  group: THREE.Group,
  x: number,
  z: number,
  width = 0.85,
  height = 1.55,
): void {
  familyBox(group, width, height, 0.1, familyMaterial("timberDark"), x, height / 2 + 0.34, z, false);
  group.add(
    familyMesh(
      new THREE.SphereGeometry(0.055, 6, 4),
      familyMaterial("copper", 0.5, 0.25),
      x + width * 0.28,
      1.05,
      z + 0.08,
      false,
    ),
  );
}

export function addFamilyGabledRoof(
  group: THREE.Group,
  width: number,
  depth: number,
  baseY: number,
  mat: THREE.Material,
  rise = 1,
): void {
  const run = width / 2 + 0.28;
  const length = Math.hypot(run, rise);
  const angle = Math.atan2(rise, run);
  for (const side of [-1, 1] as const) {
    const slab = familyMesh(
      new THREE.BoxGeometry(length, 0.18, depth + 0.55),
      mat,
      side * run / 2,
      baseY + rise / 2,
      0,
    );
    slab.rotation.z = side < 0 ? angle : -angle;
    group.add(slab);
  }
  familyBox(
    group,
    0.16,
    0.2,
    depth + 0.58,
    familyMaterial("copper", 0.56, 0.22),
    0,
    baseY + rise + 0.03,
    0,
    false,
  );
}

export function addFamilyTimberFront(
  group: THREE.Group,
  width: number,
  depth: number,
  height: number,
): void {
  const z = depth / 2 + 0.055;
  for (const x of [-width * 0.36, 0, width * 0.36]) {
    familyBox(group, 0.11, height * 0.78, 0.11, familyMaterial("timber"), x, height * 0.48, z, false);
  }
  for (const y of [height * 0.42, height * 0.72]) {
    familyBox(group, width * 0.82, 0.1, 0.11, familyMaterial("timber"), 0, y, z, false);
  }
}

export function addFamilyStoneStep(
  group: THREE.Group,
  x: number,
  z: number,
  width = 1.25,
): void {
  familyBox(group, width * 0.96, 0.045, 0.82, familyMaterial("stone"), x, 0.035, z + 0.35, false);
  familyBox(group, width, 0.16, 0.5, familyMaterial("stone"), x, 0.12, z, false);
  familyBox(group, width * 0.78, 0.12, 0.34, familyMaterial("stoneDark"), x, 0.26, z - 0.12, false);
}

export function addFamilyFlowerBox(group: THREE.Group, x: number, y: number, z: number): void {
  familyBox(group, 0.78, 0.16, 0.22, familyMaterial("timberDark"), x, y, z, false);
  for (const dx of [-0.24, 0, 0.24]) {
    group.add(
      familyMesh(
        new THREE.OctahedronGeometry(0.09, 0),
        dx === 0 ? familyMaterial("awning") : familyMaterial("plasterWarm"),
        x + dx,
        y + 0.18 + Math.abs(dx) * 0.08,
        z + 0.02,
        false,
      ),
    );
  }
}

export function addFamilyChimney(
  group: THREE.Group,
  x: number,
  z: number,
  y: number,
): void {
  familyBox(group, 0.48, 1.35, 0.48, familyMaterial("brick"), x, y + 0.3, z);
  familyBox(group, 0.62, 0.14, 0.62, familyMaterial("stoneDark"), x, y + 0.98, z, false);
}
