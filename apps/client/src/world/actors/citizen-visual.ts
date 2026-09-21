import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  resolveCitizenVisualIdentity,
  type CitizenPresentationRole,
} from "../visual-identity";
import {
  citizenMaterial,
  citizenPalettes,
  part,
} from "./shared-actor-visual";

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

function addHat(
  pieces: THREE.BufferGeometry[],
  role: CitizenPresentationRole,
  color: number,
  s: number,
): void {
  if (role === "builder") {
    pieces.push(part(
      new THREE.CylinderGeometry(0.29 * s, 0.36 * s, 0.12 * s, 9),
      color,
      new THREE.Vector3(0, 1.83 * s, 0),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.44 * s, 0.055 * s, 0.18 * s),
      color,
      new THREE.Vector3(0, 1.79 * s, 0.13 * s),
    ));
    return;
  }

  if (role === "farmer") {
    pieces.push(part(
      new THREE.CylinderGeometry(0.39 * s, 0.39 * s, 0.07 * s, 10),
      color,
      new THREE.Vector3(0, 1.82 * s, 0),
    ));
    pieces.push(part(
      new THREE.CylinderGeometry(0.25 * s, 0.3 * s, 0.14 * s, 9),
      color,
      new THREE.Vector3(0, 1.89 * s, 0),
    ));
    return;
  }

  if (role === "guard" || role === "utility_technician") {
    pieces.push(part(
      new THREE.CylinderGeometry(0.28 * s, 0.33 * s, 0.13 * s, 9),
      color,
      new THREE.Vector3(0, 1.82 * s, 0),
    ));
    return;
  }

  pieces.push(part(
    new THREE.CylinderGeometry(0.29 * s, 0.35 * s, 0.12 * s, 10),
    color,
    new THREE.Vector3(0, 1.82 * s, 0),
  ));
}

function addRoleDetails(
  pieces: THREE.BufferGeometry[],
  role: CitizenPresentationRole,
  palette: (typeof citizenPalettes)[number],
  accent: number,
  s: number,
  headwearVariant: number,
  accessoryVariant: number,
): void {
  if (role === "school_child") {
    pieces.push(part(
      new THREE.BoxGeometry(0.38 * s, 0.48 * s, 0.17 * s),
      accent,
      new THREE.Vector3(0, 0.88 * s, -0.28 * s),
    ));
    if (headwearVariant % 2 === 0) addHat(pieces, role, palette.accent, s);
    return;
  }

  if (role === "workshop_worker") {
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
    if (accessoryVariant % 2 === 0) {
      pieces.push(part(
        new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.52 * s, 6),
        0x4b4f4d,
        new THREE.Vector3(-0.32 * s, 0.63 * s, 0.04 * s),
        new THREE.Euler(0, 0, 0.35),
      ));
    }
    return;
  }

  if (role === "utility_technician") {
    addHat(pieces, role, accent, s);
    pieces.push(part(
      new THREE.BoxGeometry(0.27 * s, 0.42 * s, 0.14 * s),
      0x434c4d,
      new THREE.Vector3(0.33 * s, 0.74 * s, -0.08 * s),
      new THREE.Euler(0, 0, -0.12),
    ));
    return;
  }

  if (role === "teacher") {
    pieces.push(part(
      new THREE.BoxGeometry(0.34 * s, 0.44 * s, 0.07 * s),
      0xc3ad82,
      new THREE.Vector3(0.31 * s, 0.83 * s, 0.18 * s),
      new THREE.Euler(0, 0, -0.18),
    ));
    return;
  }

  if (role === "guard") {
    pieces.push(part(
      new THREE.BoxGeometry(0.48 * s, 0.5 * s, 0.16 * s),
      0x3f5149,
      new THREE.Vector3(0, 0.98 * s, 0.16 * s),
    ));
    addHat(pieces, role, 0x485b52, s);
    if (accessoryVariant % 2 === 0) {
      pieces.push(part(
        new THREE.BoxGeometry(0.2 * s, 0.52 * s, 0.09 * s),
        0x5c4937,
        new THREE.Vector3(0.36 * s, 0.73 * s, 0.03 * s),
      ));
    }
    return;
  }

  if (role === "builder") {
    addHat(pieces, role, accent, s);
    pieces.push(part(
      new THREE.BoxGeometry(0.5 * s, 0.12 * s, 0.16 * s),
      0x5c4937,
      new THREE.Vector3(0, 0.68 * s, 0.03 * s),
    ));
    pieces.push(part(
      new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.48 * s, 5),
      0x5b4634,
      new THREE.Vector3(0.34 * s, 0.65 * s, 0.03 * s),
      new THREE.Euler(0, 0, -0.45),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.22 * s, 0.08 * s, 0.08 * s),
      0x4b4f4d,
      new THREE.Vector3(0.45 * s, 0.81 * s, 0.03 * s),
      new THREE.Euler(0, 0, -0.45),
    ));
    return;
  }

  if (role === "farmer") {
    addHat(pieces, role, 0x9b8252, s);
    if (accessoryVariant % 2 === 0) {
      pieces.push(part(
        new THREE.CylinderGeometry(0.24 * s, 0.18 * s, 0.26 * s, 8),
        0x9a7048,
        new THREE.Vector3(0.34 * s, 0.58 * s, 0.02 * s),
      ));
    }
    return;
  }

  if (role === "cafe_worker") {
    pieces.push(part(
      new THREE.BoxGeometry(0.44 * s, 0.6 * s, 0.05 * s),
      0xd8c5a2,
      new THREE.Vector3(0, 0.86 * s, 0.26 * s),
    ));
    if (accessoryVariant % 2 === 0) {
      pieces.push(part(
        new THREE.CylinderGeometry(0.27 * s, 0.27 * s, 0.035 * s, 10),
        0xb18d54,
        new THREE.Vector3(0.4 * s, 0.96 * s, 0.08 * s),
        new THREE.Euler(0, 0, Math.PI / 2),
      ));
    }
    return;
  }

  if (role === "service_crew") {
    pieces.push(part(
      new THREE.BoxGeometry(0.3 * s, 0.32 * s, 0.15 * s),
      accent,
      new THREE.Vector3(0.33 * s, 0.67 * s, 0),
    ));
    return;
  }

  if (headwearVariant === 0) addHat(pieces, role, palette.accent, s);
  if (accessoryVariant <= 1) {
    pieces.push(part(
      new THREE.BoxGeometry(0.24 * s, 0.38 * s, 0.12 * s),
      accent,
      new THREE.Vector3(0.31 * s, 0.78 * s, -0.12 * s),
      new THREE.Euler(0, 0, -0.16),
    ));
  }
}

export function createCitizenVisual(
  worldSeed: string | number,
  presentationSlot: number,
  child: boolean,
  role: CitizenPresentationRole,
  castShadow: boolean,
): THREE.Mesh {
  const identity = resolveCitizenVisualIdentity(worldSeed, presentationSlot, role);
  const palette = citizenPalettes[identity.paletteIndex % citizenPalettes.length]!;
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
    palette.coat;

  pieces.push(part(
    new THREE.CapsuleGeometry(0.27 * s * bodyScale, 0.58 * s, 4, 7),
    coat,
    new THREE.Vector3(0, 0.9 * s, 0),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.245 * s, 9, 7),
    palette.skin,
    new THREE.Vector3(0, 1.55 * s, 0),
  ));

  const hairScaleX = 0.9 + (identity.hairVariant % 4) * 0.045;
  const hairScaleY = 0.82 + ((identity.hairVariant >> 2) % 3) * 0.06;
  pieces.push(part(
    new THREE.SphereGeometry(0.255 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55),
    palette.hair,
    new THREE.Vector3(0, 1.65 * s, -0.015 * s),
    new THREE.Euler(0, (identity.hairVariant % 3 - 1) * 0.12, 0),
    new THREE.Vector3(hairScaleX, hairScaleY, 1),
  ));

  for (const side of [-1, 1] as const) {
    pieces.push(part(
      new THREE.CapsuleGeometry(0.075 * s, 0.48 * s, 3, 5),
      role === "teacher" ? palette.coat : palette.shirt,
      new THREE.Vector3(side * 0.34 * s, 0.94 * s, 0),
      new THREE.Euler(0, 0, side * (0.08 + (identity.bodyVariant % 3) * 0.025)),
    ));
    pieces.push(part(
      new THREE.CapsuleGeometry(0.085 * s, 0.44 * s, 3, 5),
      palette.trouser,
      new THREE.Vector3(side * 0.13 * s, 0.32 * s, 0),
      new THREE.Euler(0, 0, side * 0.04),
    ));
  }

  addRoleDetails(
    pieces,
    role,
    palette,
    accent,
    s,
    identity.headwearVariant,
    identity.accessoryVariant,
  );

  const geometry = mergeGeometries(pieces, false);
  pieces.forEach((value) => value.dispose());
  if (!geometry) throw new Error("CITIZEN_VISUAL_MERGE_FAILED");

  const citizen = new THREE.Mesh(geometry, citizenMaterial);
  citizen.castShadow = castShadow;
  citizen.receiveShadow = true;
  citizen.userData.visualRole = role;
  citizen.userData.visualPalette = identity.paletteIndex;
  citizen.userData.visualBody = identity.bodyVariant;
  citizen.userData.visualHair = identity.hairVariant;
  return citizen;
}

export function animateCitizenVisual(
  citizen: THREE.Mesh,
  time: number,
  moving: boolean,
  index: number,
): void {
  const role = citizen.userData.visualRole as CitizenPresentationRole | undefined;
  const gait =
    role === "school_child" ? 1.16 :
    role === "guard" ? 0.92 :
    role === "farmer" ? 0.9 :
    role === "builder" ? 0.95 :
    1;
  const phase = time / ((moving ? 145 : 420) / gait) + index * 0.73;
  const bob = moving
    ? Math.abs(Math.sin(phase)) * (role === "school_child" ? 0.068 : 0.052)
    : Math.sin(phase) * 0.012;
  citizen.position.y = bob;
  citizen.rotation.z = moving ? Math.sin(phase) * (role === "school_child" ? 0.034 : 0.024) : 0;
}
