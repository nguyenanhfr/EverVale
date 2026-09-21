import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { resolveCitizenVisualIdentity, stableVisualHash, type CitizenPresentationRole } from "./visual-identity";

const citizenMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.92,
});
citizenMaterial.userData.sharedMaterial = true;

const animalMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.96,
});
animalMaterial.userData.sharedMaterial = true;

const palettes = [
  { coat: 0x65798b, shirt: 0xd8c89f, trouser: 0x4f5658, hair: 0x4b392f, skin: 0xc99572, accent: 0xa66c58 },
  { coat: 0x6b805e, shirt: 0xe2d5b7, trouser: 0x5f5146, hair: 0x5a4735, skin: 0xd1a17d, accent: 0xb8834f },
  { coat: 0x8a655f, shirt: 0xd9c9b5, trouser: 0x4e5562, hair: 0x3f342d, skin: 0xb98262, accent: 0x637f77 },
  { coat: 0x7b7259, shirt: 0xe7dcc3, trouser: 0x515d50, hair: 0x67503e, skin: 0xd4a27b, accent: 0x985f56 },
  { coat: 0x536d6b, shirt: 0xd6d0bc, trouser: 0x414b4e, hair: 0x382f2b, skin: 0xc68e68, accent: 0xb18d54 },
  { coat: 0x7f6354, shirt: 0xe0cfae, trouser: 0x59615a, hair: 0x59412f, skin: 0xd6aa86, accent: 0x657e91 },
  { coat: 0x5d667d, shirt: 0xd8cbb2, trouser: 0x4d4a4b, hair: 0x2f2a27, skin: 0x9f6d50, accent: 0xb2725a },
  { coat: 0x6d7758, shirt: 0xe8dcc1, trouser: 0x554c42, hair: 0x74604b, skin: 0xe0b08a, accent: 0x8b6f55 },
  { coat: 0x845f62, shirt: 0xd8d5c5, trouser: 0x4c5960, hair: 0x4a352e, skin: 0xb7795a, accent: 0x55776d },
  { coat: 0x586f82, shirt: 0xe4d7bd, trouser: 0x4b554f, hair: 0x5b493c, skin: 0xc98f6c, accent: 0x9d7e4f },
] as const;

const roleAccent: Record<CitizenPresentationRole, number> = {
  school_child: 0xd08c62,
  casual_resident: 0x9a795a,
  workshop_worker: 0x9d6f47,
  utility_technician: 0x4f6f76,
  teacher: 0x806b5d,
  guard: 0x4b5f55,
  builder: 0xc59a51,
  farmer: 0x7d7a4d,
  cafe_worker: 0xb66f55,
  service_crew: 0x65736a,
};

function colorGeometry(
  geometry: THREE.BufferGeometry,
  color: number,
  matrix: THREE.Matrix4,
): THREE.BufferGeometry {
  const value = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  value.applyMatrix4(matrix);
  const count = value.getAttribute("position").count;
  const c = new THREE.Color(color);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  value.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return value;
}

function part(
  geometry: THREE.BufferGeometry,
  color: number,
  position: THREE.Vector3,
  rotation = new THREE.Euler(),
  scale = new THREE.Vector3(1, 1, 1),
): THREE.BufferGeometry {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(rotation);
  matrix.compose(position, quaternion, scale);
  return colorGeometry(geometry, color, matrix);
}

export function createCitizenVisual(
  worldSeed: string,
  index: number,
  child: boolean,
  role: CitizenPresentationRole,
  castShadow: boolean,
): THREE.Mesh {
  const identity = resolveCitizenVisualIdentity(worldSeed, index, role);
  const base = palettes[identity.paletteIndex % palettes.length]!;
  const accent = roleAccent[role];
  const s = child ? 0.78 : 1;
  const bodyScale = 0.94 + (identity.bodyVariant % 4) * 0.025;
  const pieces: THREE.BufferGeometry[] = [];

  const coat =
    role === "guard" ? 0x4b5f55 :
    role === "utility_technician" ? 0x536a70 :
    role === "builder" ? 0x7d7258 :
    role === "farmer" ? 0x6f7653 :
    role === "cafe_worker" ? 0x765e58 :
    base.coat;

  pieces.push(part(
    new THREE.CapsuleGeometry(0.27 * s * bodyScale, 0.58 * s, 4, 7),
    coat,
    new THREE.Vector3(0, 0.9 * s, 0),
  ));

  pieces.push(part(
    new THREE.SphereGeometry(0.245 * s, 9, 7),
    base.skin,
    new THREE.Vector3(0, 1.55 * s, 0),
  ));

  const hairScaleX = 0.9 + (identity.hairVariant % 4) * 0.045;
  const hairScaleY = 0.82 + ((identity.hairVariant >> 2) % 3) * 0.06;
  pieces.push(part(
    new THREE.SphereGeometry(0.255 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55),
    base.hair,
    new THREE.Vector3(0, 1.65 * s, -0.015 * s),
    new THREE.Euler(0, (identity.hairVariant % 3 - 1) * 0.12, 0),
    new THREE.Vector3(hairScaleX, hairScaleY, 1),
  ));

  for (const side of [-1, 1] as const) {
    pieces.push(part(
      new THREE.CapsuleGeometry(0.075 * s, 0.48 * s, 3, 5),
      role === "teacher" ? base.coat : base.shirt,
      new THREE.Vector3(side * 0.34 * s, 0.94 * s, 0),
      new THREE.Euler(0, 0, side * (0.08 + (identity.bodyVariant % 3) * 0.025)),
    ));
    pieces.push(part(
      new THREE.CapsuleGeometry(0.085 * s, 0.44 * s, 3, 5),
      base.trouser,
      new THREE.Vector3(side * 0.13 * s, 0.32 * s, 0),
      new THREE.Euler(0, 0, side * 0.04),
    ));
  }

  if (role === "school_child") {
    pieces.push(part(
      new THREE.BoxGeometry(0.38 * s, 0.48 * s, 0.17 * s),
      accent,
      new THREE.Vector3(0, 0.88 * s, -0.28 * s),
    ));
    if (identity.headwearVariant % 2 === 0) {
      pieces.push(part(
        new THREE.CylinderGeometry(0.27 * s, 0.31 * s, 0.1 * s, 9),
        base.accent,
        new THREE.Vector3(0, 1.82 * s, 0),
      ));
    }
  } else if (role === "workshop_worker") {
    pieces.push(part(
      new THREE.BoxGeometry(0.43 * s, 0.62 * s, 0.055 * s),
      0x9b7955,
      new THREE.Vector3(0, 0.88 * s, 0.25 * s),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.18 * s, 0.2 * s, 0.12 * s),
      accent,
      new THREE.Vector3(0.3 * s, 0.64 * s, 0.05 * s),
    ));
  } else if (role === "utility_technician") {
    pieces.push(part(
      new THREE.CylinderGeometry(0.28 * s, 0.33 * s, 0.13 * s, 9),
      accent,
      new THREE.Vector3(0, 1.82 * s, 0),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.26 * s, 0.4 * s, 0.13 * s),
      0x434c4d,
      new THREE.Vector3(0.33 * s, 0.74 * s, -0.08 * s),
      new THREE.Euler(0, 0, -0.12),
    ));
  } else if (role === "teacher") {
    pieces.push(part(
      new THREE.BoxGeometry(0.34 * s, 0.44 * s, 0.07 * s),
      0xc3ad82,
      new THREE.Vector3(0.32 * s, 0.83 * s, 0.18 * s),
      new THREE.Euler(0, 0, -0.18),
    ));
  } else if (role === "guard") {
    pieces.push(part(
      new THREE.BoxGeometry(0.48 * s, 0.48 * s, 0.16 * s),
      0x3f5149,
      new THREE.Vector3(0, 0.98 * s, 0.16 * s),
    ));
    pieces.push(part(
      new THREE.CylinderGeometry(0.28 * s, 0.31 * s, 0.14 * s, 9),
      0x485b52,
      new THREE.Vector3(0, 1.82 * s, 0),
    ));
  } else if (role === "builder") {
    pieces.push(part(
      new THREE.CylinderGeometry(0.29 * s, 0.36 * s, 0.12 * s, 9),
      accent,
      new THREE.Vector3(0, 1.83 * s, 0),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.5 * s, 0.12 * s, 0.16 * s),
      0x5c4937,
      new THREE.Vector3(0, 0.68 * s, 0.03 * s),
    ));
  } else if (role === "farmer") {
    pieces.push(part(
      new THREE.CylinderGeometry(0.38 * s, 0.38 * s, 0.07 * s, 10),
      0x9b8252,
      new THREE.Vector3(0, 1.82 * s, 0),
    ));
    pieces.push(part(
      new THREE.CylinderGeometry(0.25 * s, 0.3 * s, 0.14 * s, 9),
      0x846b45,
      new THREE.Vector3(0, 1.88 * s, 0),
    ));
  } else if (role === "cafe_worker") {
    pieces.push(part(
      new THREE.BoxGeometry(0.44 * s, 0.6 * s, 0.05 * s),
      0xd8c5a2,
      new THREE.Vector3(0, 0.86 * s, 0.26 * s),
    ));
    if (identity.accessoryVariant % 2 === 0) {
      pieces.push(part(
        new THREE.CylinderGeometry(0.26 * s, 0.26 * s, 0.035 * s, 10),
        0xb18d54,
        new THREE.Vector3(0.4 * s, 0.96 * s, 0.08 * s),
        new THREE.Euler(0, 0, Math.PI / 2),
      ));
    }
  } else if (role === "service_crew") {
    pieces.push(part(
      new THREE.BoxGeometry(0.3 * s, 0.32 * s, 0.15 * s),
      accent,
      new THREE.Vector3(0.33 * s, 0.67 * s, 0),
    ));
  } else {
    if (identity.headwearVariant === 0) {
      pieces.push(part(
        new THREE.CylinderGeometry(0.29 * s, 0.35 * s, 0.13 * s, 10),
        base.accent,
        new THREE.Vector3(0, 1.83 * s, 0),
      ));
    }
    if (identity.accessoryVariant <= 1) {
      pieces.push(part(
        new THREE.BoxGeometry(0.24 * s, 0.38 * s, 0.12 * s),
        accent,
        new THREE.Vector3(0.31 * s, 0.78 * s, -0.12 * s),
        new THREE.Euler(0, 0, -0.16),
      ));
    }
  }

  const geometry = mergeGeometries(pieces, false);
  pieces.forEach((value) => value.dispose());
  if (!geometry) throw new Error("CITIZEN_VISUAL_MERGE_FAILED");

  const mesh = new THREE.Mesh(geometry, citizenMaterial);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.userData.visualBaseY = 0;
  mesh.userData.visualScale = s;
  mesh.userData.visualRole = role;
  mesh.userData.visualPalette = identity.paletteIndex;
  return mesh;
}

export function animateCitizenVisual(
  citizen: THREE.Mesh,
  time: number,
  moving: boolean,
  index: number,
): void {
  const phase = time / (moving ? 145 : 420) + index * 0.73;
  const bob = moving ? Math.abs(Math.sin(phase)) * 0.055 : Math.sin(phase) * 0.012;
  citizen.position.y = bob;
  citizen.rotation.z = moving ? Math.sin(phase) * 0.025 : 0;
}

export function createDogVisual(worldSeed = "evervale"): THREE.Mesh {
  const dogVariants = [
    [0x9b704d, 0x5c4333, 0xd9c39f],
    [0x7f684f, 0x443a32, 0xc9b48f],
    [0xb08a62, 0x6d5038, 0xe0c9a4],
    [0x5f5b55, 0x343331, 0xcab99d],
  ] as const;
  const variant = dogVariants[stableVisualHash(`${worldSeed}:dog`) % dogVariants.length]!;
  const [fur, furDark, cream] = variant;
  const pieces: THREE.BufferGeometry[] = [];

  pieces.push(part(
    new THREE.CapsuleGeometry(0.23, 0.62, 4, 7),
    fur,
    new THREE.Vector3(0, 0.44, 0),
    new THREE.Euler(0, 0, Math.PI / 2),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.27, 8, 6),
    fur,
    new THREE.Vector3(0.47, 0.62, 0),
  ));
  pieces.push(part(
    new THREE.ConeGeometry(0.12, 0.28, 5),
    furDark,
    new THREE.Vector3(0.45, 0.91, -0.16),
    new THREE.Euler(-0.18, 0, -0.3),
  ));
  pieces.push(part(
    new THREE.ConeGeometry(0.12, 0.28, 5),
    furDark,
    new THREE.Vector3(0.45, 0.91, 0.16),
    new THREE.Euler(0.18, 0, -0.3),
  ));
  pieces.push(part(
    new THREE.CylinderGeometry(0.055, 0.075, 0.62, 6),
    furDark,
    new THREE.Vector3(-0.56, 0.67, 0),
    new THREE.Euler(0, 0, -0.86),
  ));

  for (const x of [-0.3, 0.28]) {
    for (const z of [-0.16, 0.16]) {
      pieces.push(part(
        new THREE.CylinderGeometry(0.055, 0.065, 0.38, 6),
        z < 0 ? fur : cream,
        new THREE.Vector3(x, 0.2, z),
      ));
    }
  }

  const geometry = mergeGeometries(pieces, false);
  pieces.forEach((value) => value.dispose());
  if (!geometry) throw new Error("DOG_VISUAL_MERGE_FAILED");
  const dog = new THREE.Mesh(geometry, animalMaterial);
  dog.castShadow = true;
  dog.receiveShadow = true;
  return dog;
}
