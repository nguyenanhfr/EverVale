import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CitizenVisualFactoryContext } from "../citizen-visual-registry";
import { citizenMaterial, part } from "../shared-actor-visual";

export type HeadwearKind =
  | "none"
  | "flat_cap"
  | "guard_cap"
  | "hard_hat"
  | "wide_hat"
  | "service_cap";

export type AccessoryKind =
  | "none"
  | "book"
  | "shield"
  | "hammer"
  | "basket"
  | "tray"
  | "toolbox"
  | "satchel";

export interface AuthoredRoleSpec {
  name: string;
  referenceCell: string;
  coat: number;
  shirt: number;
  trouser: number;
  skin: number;
  hair: number;
  accent: number;
  shoe: number;
  scale?: number;
  headwear: HeadwearKind;
  accessory: AccessoryKind;
  apron?: boolean;
  vest?: boolean;
  crossBody?: boolean;
  bodyWidth?: number;
}

function merged(parts: THREE.BufferGeometry[], code: string): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts, false);
  parts.forEach((item) => item.dispose());
  if (!geometry) throw new Error(code);
  return geometry;
}

function addHeadwear(
  parts: THREE.BufferGeometry[],
  kind: HeadwearKind,
  color: number,
): void {
  if (kind === "none") return;

  if (kind === "hard_hat") {
    parts.push(part(
      new THREE.CylinderGeometry(0.28, 0.35, 0.13, 10),
      color,
      new THREE.Vector3(0, 1.84, 0),
    ));
    parts.push(part(
      new THREE.BoxGeometry(0.43, 0.055, 0.2),
      color,
      new THREE.Vector3(0, 1.8, 0.14),
    ));
    return;
  }

  if (kind === "wide_hat") {
    parts.push(part(
      new THREE.CylinderGeometry(0.4, 0.4, 0.065, 12),
      color,
      new THREE.Vector3(0, 1.82, 0),
    ));
    parts.push(part(
      new THREE.CylinderGeometry(0.245, 0.3, 0.16, 10),
      color,
      new THREE.Vector3(0, 1.9, 0),
    ));
    return;
  }

  const crown =
    kind === "guard_cap" ? 0.16 :
    kind === "service_cap" ? 0.12 :
    0.1;
  parts.push(part(
    new THREE.CylinderGeometry(0.27, 0.32, crown, 10),
    color,
    new THREE.Vector3(0, 1.82, 0),
  ));
  parts.push(part(
    new THREE.BoxGeometry(0.31, 0.04, 0.15),
    color,
    new THREE.Vector3(0, 1.8, 0.17),
  ));
}

function bodyGeometry(spec: AuthoredRoleSpec): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const bodyWidth = spec.bodyWidth ?? 1;

  pieces.push(part(
    new THREE.CapsuleGeometry(0.275 * bodyWidth, 0.6, 4, 7),
    spec.coat,
    new THREE.Vector3(0, 0.92, 0),
  ));

  if (spec.vest) {
    pieces.push(part(
      new THREE.BoxGeometry(0.48 * bodyWidth, 0.48, 0.09),
      spec.accent,
      new THREE.Vector3(0, 0.96, 0.27),
    ));
  }

  if (spec.apron) {
    pieces.push(part(
      new THREE.BoxGeometry(0.43, 0.62, 0.055),
      spec.shirt,
      new THREE.Vector3(0, 0.86, 0.28),
    ));
  }

  if (spec.crossBody) {
    pieces.push(part(
      new THREE.BoxGeometry(0.07, 0.92, 0.045),
      spec.accent,
      new THREE.Vector3(0.02, 1.03, 0.3),
      new THREE.Euler(0, 0, -0.46),
    ));
  }

  pieces.push(part(
    new THREE.SphereGeometry(0.245, 9, 7),
    spec.skin,
    new THREE.Vector3(0, 1.57, 0),
  ));

  pieces.push(part(
    new THREE.SphereGeometry(0.252, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.53),
    spec.hair,
    new THREE.Vector3(0, 1.68, -0.01),
  ));

  addHeadwear(pieces, spec.headwear, spec.accent);

  for (const side of [-1, 1] as const) {
    pieces.push(part(
      new THREE.CapsuleGeometry(0.086, 0.46, 3, 6),
      spec.trouser,
      new THREE.Vector3(side * 0.13, 0.33, 0),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.21, 0.12, 0.3),
      spec.shoe,
      new THREE.Vector3(side * 0.13, 0.075, 0.06),
    ));
  }

  if (spec.accessory === "satchel") {
    pieces.push(part(
      new THREE.BoxGeometry(0.3, 0.36, 0.15),
      spec.accent,
      new THREE.Vector3(0.32, 0.7, 0.02),
    ));
  }

  return merged(pieces, `${spec.name.toUpperCase()}_BODY_MERGE_FAILED`);
}

function accessoryParts(
  pieces: THREE.BufferGeometry[],
  spec: AuthoredRoleSpec,
  side: -1 | 1,
): void {
  const x = 0;

  if (spec.accessory === "book" && side > 0) {
    pieces.push(part(
      new THREE.BoxGeometry(0.24, 0.32, 0.06),
      0xc8b184,
      new THREE.Vector3(x + 0.03, -0.62, 0.08),
      new THREE.Euler(0, 0, -0.16),
    ));
  }

  if (spec.accessory === "shield" && side < 0) {
    pieces.push(part(
      new THREE.CylinderGeometry(0.26, 0.3, 0.06, 8),
      spec.accent,
      new THREE.Vector3(-0.02, -0.6, 0.08),
      new THREE.Euler(Math.PI / 2, 0, 0),
    ));
  }

  if (spec.accessory === "hammer" && side > 0) {
    pieces.push(part(
      new THREE.CylinderGeometry(0.035, 0.035, 0.56, 6),
      0x654a35,
      new THREE.Vector3(0, -0.7, 0.02),
      new THREE.Euler(0, 0, -0.32),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.23, 0.09, 0.09),
      0x5c6362,
      new THREE.Vector3(0.12, -0.93, 0.02),
      new THREE.Euler(0, 0, -0.32),
    ));
  }

  if (spec.accessory === "basket" && side > 0) {
    pieces.push(part(
      new THREE.CylinderGeometry(0.23, 0.18, 0.28, 9),
      0x987046,
      new THREE.Vector3(0.02, -0.62, 0.05),
    ));
    pieces.push(part(
      new THREE.TorusGeometry(0.18, 0.025, 5, 10, Math.PI),
      0x725239,
      new THREE.Vector3(0.02, -0.45, 0.05),
      new THREE.Euler(0, 0, Math.PI),
    ));
  }

  if (spec.accessory === "tray" && side > 0) {
    pieces.push(part(
      new THREE.CylinderGeometry(0.27, 0.27, 0.035, 12),
      0xb2935d,
      new THREE.Vector3(0.04, -0.56, 0.1),
      new THREE.Euler(0, 0, Math.PI / 2),
    ));
    pieces.push(part(
      new THREE.CylinderGeometry(0.06, 0.05, 0.18, 8),
      0xe8dfc8,
      new THREE.Vector3(0.07, -0.42, 0.1),
    ));
  }

  if (spec.accessory === "toolbox" && side > 0) {
    pieces.push(part(
      new THREE.BoxGeometry(0.34, 0.26, 0.18),
      spec.accent,
      new THREE.Vector3(0.04, -0.64, 0.04),
    ));
    pieces.push(part(
      new THREE.TorusGeometry(0.12, 0.022, 5, 9, Math.PI),
      0x4f5555,
      new THREE.Vector3(0.04, -0.46, 0.04),
      new THREE.Euler(0, 0, Math.PI),
    ));
  }
}

function armGeometry(
  spec: AuthoredRoleSpec,
  side: -1 | 1,
): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  pieces.push(part(
    new THREE.CapsuleGeometry(0.073, 0.43, 3, 5),
    spec.shirt,
    new THREE.Vector3(0, -0.17, 0),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.085, 7, 5),
    spec.skin,
    new THREE.Vector3(0, -0.45, 0.02),
  ));
  accessoryParts(pieces, spec, side);
  return merged(pieces, `${spec.name.toUpperCase()}_ARM_MERGE_FAILED`);
}

export function createAuthoredRoleFactory(
  spec: AuthoredRoleSpec,
  context: CitizenVisualFactoryContext,
): THREE.Group {
  const root = new THREE.Group();
  root.name = `char_${spec.name}_reference_v1`;
  root.scale.setScalar(spec.scale ?? 1);

  const body = new THREE.Mesh(bodyGeometry(spec), citizenMaterial);
  body.name = "body";
  root.add(body);

  const leftPivot = new THREE.Group();
  leftPivot.name = "pivot_arm_left";
  leftPivot.position.set(-0.33, 1.17, 0);
  leftPivot.add(new THREE.Mesh(armGeometry(spec, -1), citizenMaterial));
  root.add(leftPivot);

  const rightPivot = new THREE.Group();
  rightPivot.name = "pivot_arm_right";
  rightPivot.position.set(0.33, 1.17, 0);
  rightPivot.add(new THREE.Mesh(armGeometry(spec, 1), citizenMaterial));
  root.add(rightPivot);

  const headSocket = new THREE.Object3D();
  headSocket.name = "socket_head";
  headSocket.position.set(0, 1.8, 0);
  root.add(headSocket);

  const rightHandSocket = new THREE.Object3D();
  rightHandSocket.name = "socket_hand_r";
  rightHandSocket.position.set(0.41, 0.48, 0.03);
  root.add(rightHandSocket);

  root.userData.visualFactory = "authored_role_factory_v1";
  root.userData.referenceCell = spec.referenceCell;
  root.userData.tick = (_dt: number, elapsed: number) => {
    const base =
      spec.name === "guard" ? 4.1 :
      spec.name === "farmer" ? 4.4 :
      spec.name === "teacher" ? 4.8 :
      5.2;
    const swing = Math.sin(elapsed * base + context.presentationSlot * 0.68);
    leftPivot.rotation.z = -0.08 + swing * 0.08;
    rightPivot.rotation.z = 0.08 - swing * 0.1;
  };

  return root;
}
