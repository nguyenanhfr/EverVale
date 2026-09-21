import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CitizenVisualFactoryContext } from "../citizen-visual-registry";
import { citizenMaterial, part } from "../shared-actor-visual";

function merge(parts: THREE.BufferGeometry[], code: string): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts, false);
  parts.forEach((item) => item.dispose());
  if (!geometry) throw new Error(code);
  return geometry;
}

function bodyGeometry(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const overall = 0x8b6f50;
  const overallDark = 0x654f3c;
  const shirt = 0x4d5657;
  const skin = 0xc58f6a;
  const hair = 0x3d332e;
  const leather = 0x70513c;
  const metal = 0x626a6b;
  const boot = 0x333637;

  pieces.push(part(
    new THREE.CapsuleGeometry(0.28, 0.6, 4, 7),
    overall,
    new THREE.Vector3(0, 0.91, 0),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.46, 0.46, 0.075),
    overallDark,
    new THREE.Vector3(0, 0.93, 0.28),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.11, 0.56, 0.055),
    shirt,
    new THREE.Vector3(-0.14, 1.02, 0.31),
    new THREE.Euler(0, 0, 0.03),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.11, 0.56, 0.055),
    shirt,
    new THREE.Vector3(0.14, 1.02, 0.31),
    new THREE.Euler(0, 0, -0.03),
  ));

  pieces.push(part(
    new THREE.SphereGeometry(0.245, 9, 7),
    skin,
    new THREE.Vector3(0, 1.57, 0),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.25, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hair,
    new THREE.Vector3(0, 1.67, -0.01),
  ));

  // Goggles from board reference.
  for (const x of [-0.11, 0.11]) {
    const lens = new THREE.TorusGeometry(0.09, 0.025, 5, 10);
    pieces.push(part(
      lens,
      metal,
      new THREE.Vector3(x, 1.78, 0.13),
      new THREE.Euler(Math.PI / 2, 0, 0),
    ));
  }
  pieces.push(part(
    new THREE.BoxGeometry(0.12, 0.035, 0.035),
    leather,
    new THREE.Vector3(0, 1.78, 0.14),
  ));

  for (const side of [-1, 1] as const) {
    pieces.push(part(
      new THREE.CapsuleGeometry(0.085, 0.45, 3, 5),
      overallDark,
      new THREE.Vector3(side * 0.13, 0.32, 0),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.21, 0.12, 0.31),
      boot,
      new THREE.Vector3(side * 0.13, 0.07, 0.06),
    ));
  }

  // Tool belt.
  pieces.push(part(
    new THREE.BoxGeometry(0.5, 0.11, 0.14),
    leather,
    new THREE.Vector3(0, 0.68, 0.04),
  ));
  for (const x of [-0.2, 0.22]) {
    pieces.push(part(
      new THREE.BoxGeometry(0.15, 0.21, 0.12),
      leather,
      new THREE.Vector3(x, 0.56, 0.04),
    ));
  }

  return merge(pieces, "WORKSHOP_WORKER_BODY_MERGE_FAILED");
}

function armGeometry(side: -1 | 1): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  pieces.push(part(
    new THREE.CapsuleGeometry(0.075, 0.45, 3, 5),
    0x4d5657,
    new THREE.Vector3(0, -0.17, 0),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.09, 7, 5),
    0x34383a,
    new THREE.Vector3(0, -0.46, 0.02),
  ));

  if (side < 0) {
    // Plank carried in the reference.
    pieces.push(part(
      new THREE.BoxGeometry(0.18, 1.02, 0.22),
      0x936b45,
      new THREE.Vector3(-0.02, -0.75, 0.05),
      new THREE.Euler(0, 0, -0.22),
    ));
  } else {
    pieces.push(part(
      new THREE.CylinderGeometry(0.035, 0.035, 0.5, 5),
      0x6b4f37,
      new THREE.Vector3(0, -0.66, 0.02),
      new THREE.Euler(0, 0, 0.24),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.2, 0.08, 0.08),
      0x626a6b,
      new THREE.Vector3(0.1, -0.87, 0.02),
      new THREE.Euler(0, 0, 0.24),
    ));
  }

  return merge(pieces, "WORKSHOP_WORKER_ARM_MERGE_FAILED");
}

export function createWorkshopWorkerReferenceFactory(
  context: CitizenVisualFactoryContext,
): THREE.Group {
  const root = new THREE.Group();
  root.name = "char_workshop_worker_reference_v1";

  const body = new THREE.Mesh(bodyGeometry(), citizenMaterial);
  body.name = "body";
  root.add(body);

  const leftPivot = new THREE.Group();
  leftPivot.name = "pivot_arm_left";
  leftPivot.position.set(-0.34, 1.18, 0);
  leftPivot.add(new THREE.Mesh(armGeometry(-1), citizenMaterial));
  root.add(leftPivot);

  const rightPivot = new THREE.Group();
  rightPivot.name = "pivot_arm_right";
  rightPivot.position.set(0.34, 1.18, 0);
  rightPivot.add(new THREE.Mesh(armGeometry(1), citizenMaterial));
  root.add(rightPivot);

  const headSocket = new THREE.Object3D();
  headSocket.name = "socket_head";
  headSocket.position.set(0, 1.78, 0);
  root.add(headSocket);

  root.userData.visualFactory = "reference_factory_v1";
  root.userData.referenceCell = "row2_col0";
  root.userData.tick = (_dt: number, elapsed: number) => {
    const swing = Math.sin(elapsed * 4.6 + context.presentationSlot * 0.62);
    leftPivot.rotation.z = -0.12 + swing * 0.055;
    rightPivot.rotation.z = 0.1 - swing * 0.08;
  };

  return root;
}
