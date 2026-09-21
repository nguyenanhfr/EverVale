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
  const navy = 0x3f6185;
  const navyDark = 0x304a68;
  const cream = 0xd9d0bd;
  const skin = 0xc99370;
  const hair = 0x40342e;
  const backpack = 0x31506f;
  const shoe = 0x333638;
  const capWhite = 0xe7dfce;
  const accent = 0xb65f4e;

  pieces.push(part(
    new THREE.CapsuleGeometry(0.22, 0.46, 4, 7),
    navy,
    new THREE.Vector3(0, 0.71, 0),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.3, 0.36, 0.18),
    backpack,
    new THREE.Vector3(0, 0.72, -0.24),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.055, 0.48, 0.04),
    navyDark,
    new THREE.Vector3(-0.12, 0.78, 0.2),
    new THREE.Euler(0, 0, 0.16),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.055, 0.48, 0.04),
    navyDark,
    new THREE.Vector3(0.12, 0.78, 0.2),
    new THREE.Euler(0, 0, -0.16),
  ));

  pieces.push(part(
    new THREE.SphereGeometry(0.205, 9, 7),
    skin,
    new THREE.Vector3(0, 1.24, 0),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.21, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hair,
    new THREE.Vector3(0, 1.33, -0.01),
  ));

  pieces.push(part(
    new THREE.CylinderGeometry(0.22, 0.27, 0.1, 10),
    capWhite,
    new THREE.Vector3(0, 1.44, 0),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.26, 0.035, 0.13),
    accent,
    new THREE.Vector3(0, 1.41, 0.16),
  ));

  for (const side of [-1, 1] as const) {
    pieces.push(part(
      new THREE.CapsuleGeometry(0.07, 0.36, 3, 5),
      navyDark,
      new THREE.Vector3(side * 0.1, 0.28, 0),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.17, 0.09, 0.24),
      shoe,
      new THREE.Vector3(side * 0.1, 0.055, 0.05),
    ));
  }

  pieces.push(part(
    new THREE.BoxGeometry(0.12, 0.08, 0.04),
    cream,
    new THREE.Vector3(0, 0.91, 0.25),
  ));

  return merge(pieces, "SCHOOL_CHILD_BODY_MERGE_FAILED");
}

function armGeometry(side: -1 | 1): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  pieces.push(part(
    new THREE.CapsuleGeometry(0.06, 0.34, 3, 5),
    0x3f6185,
    new THREE.Vector3(0, -0.14, 0),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.075, 7, 5),
    0xc99370,
    new THREE.Vector3(0, -0.39, 0.015),
  ));
  if (side > 0) {
    pieces.push(part(
      new THREE.BoxGeometry(0.16, 0.2, 0.05),
      0xe3d5b4,
      new THREE.Vector3(0.02, -0.48, 0.05),
      new THREE.Euler(0, 0, -0.1),
    ));
  }
  return merge(pieces, "SCHOOL_CHILD_ARM_MERGE_FAILED");
}

export function createSchoolChildReferenceFactory(
  context: CitizenVisualFactoryContext,
): THREE.Group {
  const root = new THREE.Group();
  root.name = "char_school_child_reference_v1";
  root.scale.setScalar(1.02);

  const body = new THREE.Mesh(bodyGeometry(), citizenMaterial);
  body.name = "body";
  root.add(body);

  const leftPivot = new THREE.Group();
  leftPivot.name = "pivot_arm_left";
  leftPivot.position.set(-0.27, 0.95, 0);
  leftPivot.add(new THREE.Mesh(armGeometry(-1), citizenMaterial));
  root.add(leftPivot);

  const rightPivot = new THREE.Group();
  rightPivot.name = "pivot_arm_right";
  rightPivot.position.set(0.27, 0.95, 0);
  rightPivot.add(new THREE.Mesh(armGeometry(1), citizenMaterial));
  root.add(rightPivot);

  const headSocket = new THREE.Object3D();
  headSocket.name = "socket_head";
  headSocket.position.set(0, 1.42, 0);
  root.add(headSocket);

  root.userData.visualFactory = "reference_factory_v1";
  root.userData.referenceCell = "row0_col4";
  root.userData.tick = (_dt: number, elapsed: number) => {
    const swing = Math.sin(elapsed * 6.4 + context.presentationSlot * 0.8);
    leftPivot.rotation.z = -0.08 + swing * 0.15;
    rightPivot.rotation.z = 0.08 - swing * 0.15;
  };

  return root;
}
