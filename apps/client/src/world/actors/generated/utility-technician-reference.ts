import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CitizenVisualFactoryContext } from "../citizen-visual-registry";
import { citizenMaterial, part } from "../shared-actor-visual";

function merged(
  parts: THREE.BufferGeometry[],
  errorCode: string,
): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts, false);
  parts.forEach((item) => item.dispose());
  if (!geometry) throw new Error(errorCode);
  return geometry;
}

function bodyGeometry(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const blue = 0x4f7194;
  const blueDark = 0x36526f;
  const shirt = 0xb8c9cf;
  const skin = 0xc99672;
  const hair = 0x3e342f;
  const leather = 0x6d523d;
  const boot = 0x34383a;
  const metal = 0x747c7d;

  pieces.push(part(
    new THREE.CapsuleGeometry(0.28, 0.62, 4, 7),
    blue,
    new THREE.Vector3(0, 0.92, 0),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.42, 0.42, 0.075),
    blueDark,
    new THREE.Vector3(0, 0.93, 0.27),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.16, 0.5, 0.07),
    shirt,
    new THREE.Vector3(0, 0.96, 0.31),
  ));

  pieces.push(part(
    new THREE.SphereGeometry(0.25, 10, 8),
    skin,
    new THREE.Vector3(0, 1.58, 0),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.255, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hair,
    new THREE.Vector3(0, 1.69, -0.015),
  ));

  // Blue utility cap from the reference.
  pieces.push(part(
    new THREE.CylinderGeometry(0.28, 0.33, 0.13, 10),
    blueDark,
    new THREE.Vector3(0, 1.83, 0),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.34, 0.045, 0.17),
    blueDark,
    new THREE.Vector3(0, 1.8, 0.18),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.11, 0.065, 0.035),
    0xd8d2bd,
    new THREE.Vector3(0, 1.87, 0.305),
  ));

  // Legs and boots.
  for (const side of [-1, 1] as const) {
    pieces.push(part(
      new THREE.CapsuleGeometry(0.09, 0.47, 3, 6),
      blue,
      new THREE.Vector3(side * 0.13, 0.33, 0),
    ));
    pieces.push(part(
      new THREE.BoxGeometry(0.21, 0.12, 0.31),
      boot,
      new THREE.Vector3(side * 0.13, 0.075, 0.06),
    ));
  }

  // Cross-body strap + tool bag.
  pieces.push(part(
    new THREE.BoxGeometry(0.075, 0.92, 0.04),
    leather,
    new THREE.Vector3(0.02, 1.05, 0.3),
    new THREE.Euler(0, 0, -0.46),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.34, 0.34, 0.16),
    leather,
    new THREE.Vector3(0.34, 0.69, 0.03),
  ));
  pieces.push(part(
    new THREE.BoxGeometry(0.2, 0.08, 0.18),
    metal,
    new THREE.Vector3(0.34, 0.85, 0.03),
  ));

  return merged(pieces, "UTILITY_TECHNICIAN_BODY_MERGE_FAILED");
}

function armGeometry(side: -1 | 1, withWrench: boolean): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const blue = 0x4f7194;
  const skin = 0xc99672;
  const glove = 0x34383a;
  const metal = 0x747c7d;

  pieces.push(part(
    new THREE.CapsuleGeometry(0.078, 0.46, 3, 5),
    blue,
    new THREE.Vector3(0, -0.18, 0),
  ));
  pieces.push(part(
    new THREE.SphereGeometry(0.095, 7, 5),
    glove,
    new THREE.Vector3(0, -0.48, 0.02),
  ));

  if (withWrench) {
    pieces.push(part(
      new THREE.CylinderGeometry(0.035, 0.045, 0.62, 6),
      metal,
      new THREE.Vector3(0.03, -0.72, 0.03),
      new THREE.Euler(0, 0, 0.18 * side),
    ));
    pieces.push(part(
      new THREE.TorusGeometry(0.095, 0.03, 5, 9, Math.PI * 1.45),
      metal,
      new THREE.Vector3(0.1 * side, -1.01, 0.03),
      new THREE.Euler(0, 0, side > 0 ? 0.55 : -0.55),
    ));
  } else {
    pieces.push(part(
      new THREE.SphereGeometry(0.075, 7, 5),
      skin,
      new THREE.Vector3(0, -0.5, 0.02),
    ));
  }

  return merged(pieces, "UTILITY_TECHNICIAN_ARM_MERGE_FAILED");
}

export function createUtilityTechnicianReferenceFactory(
  context: CitizenVisualFactoryContext,
): THREE.Group {
  const root = new THREE.Group();
  root.name = "char_utility_technician_reference_v1";

  const body = new THREE.Mesh(bodyGeometry(), citizenMaterial);
  body.name = "body";
  body.castShadow = context.castShadow;
  body.receiveShadow = true;
  root.add(body);

  const leftPivot = new THREE.Group();
  leftPivot.name = "pivot_arm_left";
  leftPivot.position.set(-0.34, 1.19, 0);
  const leftArm = new THREE.Mesh(armGeometry(-1, false), citizenMaterial);
  leftArm.castShadow = context.castShadow;
  leftArm.receiveShadow = true;
  leftPivot.add(leftArm);
  root.add(leftPivot);

  const rightPivot = new THREE.Group();
  rightPivot.name = "pivot_arm_right";
  rightPivot.position.set(0.34, 1.19, 0);
  const rightArm = new THREE.Mesh(armGeometry(1, true), citizenMaterial);
  rightArm.castShadow = context.castShadow;
  rightArm.receiveShadow = true;
  rightPivot.add(rightArm);
  root.add(rightPivot);

  const headSocket = new THREE.Object3D();
  headSocket.name = "socket_head";
  headSocket.position.set(0, 1.78, 0);
  root.add(headSocket);

  const handSocket = new THREE.Object3D();
  handSocket.name = "socket_hand_r";
  handSocket.position.set(0.42, 0.48, 0.03);
  root.add(handSocket);

  root.userData.visualFactory = "reference_factory_v1";
  root.userData.referenceCell = "row1_col5";
  root.userData.tick = (_dt: number, elapsed: number) => {
    const swing = Math.sin(elapsed * 5.2 + context.presentationSlot * 0.7);
    leftPivot.rotation.z = -0.08 + swing * 0.08;
    rightPivot.rotation.z = 0.12 - swing * 0.11;
  };

  return root;
}
