import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CitizenVisualFactoryContext } from "../citizen-visual-registry";

export type SculptedHeadwear = "none" | "hard_hat" | "utility_cap";
export type SculptedRole = "builder" | "teacher" | "utility_technician";

export interface SculptedChibiSpec {
  role: SculptedRole;
  referenceCell: string;
  coat: number;
  inner: number;
  lower: number;
  skin: number;
  hair: number;
  accent: number;
  shoe: number;
  headwear: SculptedHeadwear;
  glasses?: boolean;
  skirt?: boolean;
  vest?: boolean;
  crossBodyBag?: boolean;
  hammer?: boolean;
  wrench?: boolean;
  books?: boolean;
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

const sculptedVertexMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.82,
  metalness: 0,
});
sculptedVertexMaterial.userData.sharedMaterial = true;

function mergeColoredMeshes(
  group: THREE.Group,
  name: string,
): THREE.Mesh | null {
  const geometries: THREE.BufferGeometry[] = [];
  const meshes = group.children.filter(
    (child): child is THREE.Mesh => (child as THREE.Mesh).isMesh,
  );

  for (const source of meshes) {
    source.updateMatrix();
    const geometry = source.geometry.index
      ? source.geometry.toNonIndexed()
      : source.geometry.clone();
    geometry.applyMatrix4(source.matrix);

    const sourceMaterial = Array.isArray(source.material)
      ? source.material[0]!
      : source.material;
    const sourceColor =
      sourceMaterial instanceof THREE.MeshStandardMaterial ||
      sourceMaterial instanceof THREE.MeshBasicMaterial
        ? sourceMaterial.color
        : new THREE.Color(0xffffff);

    const count = geometry.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      colors[i * 3] = sourceColor.r;
      colors[i * 3 + 1] = sourceColor.g;
      colors[i * 3 + 2] = sourceColor.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometries.push(geometry);

    group.remove(source);
    source.geometry.dispose();
  }

  if (geometries.length === 0) return null;
  const merged =
    geometries.length === 1
      ? geometries[0]!
      : mergeGeometries(geometries, false);
  if (!merged) {
    geometries.forEach((geometry) => geometry.dispose());
    return null;
  }
  if (geometries.length > 1) {
    geometries.forEach((geometry) => geometry.dispose());
  }

  const mesh = new THREE.Mesh(merged, sculptedVertexMaterial);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function mat(color: number, roughness = 0.82): THREE.MeshStandardMaterial {
  const key = `${color.toString(16)}:${roughness}`;
  let value = materialCache.get(key);
  if (!value) {
    value = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
    });
    value.userData.sharedMaterial = true;
    materialCache.set(key, value);
  }
  return value;
}

function ellipsoid(
  name: string,
  radii: [number, number, number],
  position: [number, number, number],
  color: number,
  segments = 12,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, segments, Math.max(8, Math.floor(segments * 0.7))),
    mat(color),
  );
  mesh.name = name;
  mesh.scale.set(...radii);
  mesh.position.set(...position);
  return mesh;
}

function taperedBetween(
  name: string,
  start: THREE.Vector3,
  end: THREE.Vector3,
  startRadius: number,
  endRadius: number,
  color: number,
  radialSegments = 8,
): THREE.Mesh {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(endRadius, startRadius, length, radialSegments, 1),
    mat(color),
  );
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return mesh;
}

function torsoGeometry(
  shoulder: number,
  waist: number,
  hip: number,
  height: number,
): THREE.LatheGeometry {
  const points = [
    new THREE.Vector2(hip * 0.94, 0),
    new THREE.Vector2(hip, height * 0.18),
    new THREE.Vector2(waist, height * 0.48),
    new THREE.Vector2(shoulder, height * 0.82),
    new THREE.Vector2(shoulder * 0.82, height),
  ];
  return new THREE.LatheGeometry(points, 12);
}

function addFace(root: THREE.Group, spec: SculptedChibiSpec): void {
  const faceZ = 0.345;
  for (const x of [-0.125, 0.125]) {
    const eye = ellipsoid(
      x < 0 ? "eye_l" : "eye_r",
      [0.036, 0.06, 0.018],
      [x, 1.79, faceZ],
      0x2f2b29,
      8,
    );
    root.add(eye);

    const brow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.095, 3, 5),
      mat(spec.hair, 0.92),
    );
    brow.name = x < 0 ? "brow_l" : "brow_r";
    brow.position.set(x, 1.895, faceZ + 0.003);
    brow.rotation.z = Math.PI / 2 + (x < 0 ? -0.08 : 0.08);
    root.add(brow);
  }

  const nose = ellipsoid(
    "nose",
    [0.022, 0.032, 0.024],
    [0, 1.72, faceZ + 0.018],
    new THREE.Color(spec.skin).multiplyScalar(0.93).getHex(),
    8,
  );
  root.add(nose);

  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.055, 1.655, faceZ + 0.025),
    new THREE.Vector3(0, 1.635, faceZ + 0.03),
    new THREE.Vector3(0.055, 1.655, faceZ + 0.025),
  ]);
  const mouth = new THREE.Mesh(
    new THREE.TubeGeometry(mouthCurve, 8, 0.008, 5, false),
    mat(0x704438, 0.8),
  );
  mouth.name = "mouth";
  root.add(mouth);

  if (spec.glasses) {
    for (const x of [-0.125, 0.125]) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.082, 0.009, 5, 14),
        mat(0x5a4438, 0.55),
      );
      rim.name = x < 0 ? "glasses_l" : "glasses_r";
      rim.position.set(x, 1.79, faceZ + 0.03);
      root.add(rim);
    }
    const bridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.085, 6),
      mat(0x5a4438, 0.55),
    );
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 1.79, faceZ + 0.03);
    root.add(bridge);
  }
}

function addHair(root: THREE.Group, spec: SculptedChibiSpec): void {
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(1, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.56),
    mat(spec.hair, 0.96),
  );
  cap.name = "hair_mass";
  cap.scale.set(0.345, 0.31, 0.335);
  cap.position.set(0, 1.94, -0.015);
  root.add(cap);

  if (spec.role === "teacher") {
    const bun = ellipsoid(
      "hair_bun",
      [0.14, 0.14, 0.13],
      [0.08, 2.2, -0.08],
      spec.hair,
      10,
    );
    root.add(bun);
    for (const side of [-1, 1] as const) {
      const strand = ellipsoid(
        side < 0 ? "hair_side_l" : "hair_side_r",
        [0.065, 0.17, 0.055],
        [side * 0.26, 1.83, 0.02],
        spec.hair,
        8,
      );
      strand.rotation.z = side * 0.16;
      root.add(strand);
    }
  } else {
    for (const side of [-1, 1] as const) {
      const tuft = ellipsoid(
        side < 0 ? "hair_tuft_l" : "hair_tuft_r",
        [0.075, 0.12, 0.06],
        [side * 0.24, 1.86, 0.16],
        spec.hair,
        8,
      );
      tuft.rotation.z = side * 0.18;
      root.add(tuft);
    }
  }
}

function addHeadwear(root: THREE.Group, spec: SculptedChibiSpec): void {
  if (spec.headwear === "none") return;

  if (spec.headwear === "hard_hat") {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      mat(spec.accent, 0.68),
    );
    dome.name = "hard_hat_dome";
    dome.scale.set(0.39, 0.25, 0.36);
    dome.position.set(0, 2.06, 0);
    root.add(dome);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.055, 16),
      mat(spec.accent, 0.68),
    );
    brim.name = "hard_hat_brim";
    brim.position.set(0, 1.99, 0.04);
    root.add(brim);

    for (const x of [-0.13, 0, 0.13]) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.18, 0.025),
        mat(new THREE.Color(spec.accent).multiplyScalar(0.88).getHex(), 0.7),
      );
      rib.position.set(x, 2.13, 0.08);
      rib.rotation.x = -0.18;
      root.add(rib);
    }
    return;
  }

  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.36, 0.18, 12),
    mat(spec.accent, 0.8),
  );
  crown.name = "utility_cap_crown";
  crown.position.set(0, 2.04, 0);
  crown.rotation.z = -0.04;
  root.add(crown);

  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 0.035, 12, 1, false, 0, Math.PI),
    mat(spec.accent, 0.8),
  );
  brim.name = "utility_cap_brim";
  brim.position.set(0.08, 1.985, 0.22);
  brim.rotation.x = Math.PI / 2;
  brim.rotation.z = -0.05;
  root.add(brim);

  const patch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.07),
    mat(0xdfd5bd, 0.92),
  );
  patch.position.set(0, 2.09, 0.35);
  root.add(patch);
}

function addTorso(root: THREE.Group, spec: SculptedChibiSpec): void {
  const torso = new THREE.Mesh(
    torsoGeometry(
      spec.role === "builder" ? 0.34 : 0.32,
      spec.role === "teacher" ? 0.25 : 0.27,
      spec.role === "teacher" ? 0.31 : 0.3,
      0.62,
    ),
    mat(spec.coat),
  );
  torso.name = "torso";
  torso.position.set(0, 0.89, 0);
  root.add(torso);

  if (spec.vest) {
    const vest = new THREE.Mesh(
      torsoGeometry(0.345, 0.277, 0.302, 0.5),
      mat(spec.accent, 0.76),
    );
    vest.name = "safety_vest";
    vest.scale.set(1.015, 1, 1.015);
    vest.position.set(0, 0.99, 0);
    root.add(vest);

    for (const y of [1.08, 1.23]) {
      const stripe = new THREE.Mesh(
        new THREE.TorusGeometry(0.305, 0.018, 5, 20, Math.PI),
        mat(0xb9b9a8, 0.68),
      );
      stripe.name = "reflective_stripe";
      stripe.position.set(0, y, 0.025);
      stripe.rotation.x = Math.PI / 2;
      root.add(stripe);
    }
  }

  if (spec.skirt) {
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.46, 0.72, 14),
      mat(spec.lower),
    );
    skirt.name = "skirt";
    skirt.position.set(0, 0.61, 0);
    root.add(skirt);
  }

  if (spec.crossBodyBag) {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, 1.34, 0.25),
      new THREE.Vector3(0, 1.02, 0.32),
      new THREE.Vector3(0.25, 0.73, 0.24),
    ]);
    const strap = new THREE.Mesh(
      new THREE.TubeGeometry(strapCurve, 8, 0.018, 5, false),
      mat(0x6b4d35),
    );
    strap.name = "bag_strap";
    root.add(strap);
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.34, 0.14),
      mat(0x76563d),
    );
    bag.name = "tool_bag";
    bag.position.set(0.31, 0.7, 0.02);
    bag.rotation.z = -0.06;
    root.add(bag);
  }
}

function addLegs(root: THREE.Group, spec: SculptedChibiSpec): void {
  if (spec.skirt) {
    for (const side of [-1, 1] as const) {
      const leg = taperedBetween(
        side < 0 ? "leg_l" : "leg_r",
        new THREE.Vector3(side * 0.13, 0.42, 0),
        new THREE.Vector3(side * 0.13, 0.16, 0),
        0.095,
        0.085,
        0xd3b29a,
      );
      root.add(leg);

      const shoe = ellipsoid(
        side < 0 ? "shoe_l" : "shoe_r",
        [0.13, 0.075, 0.19],
        [side * 0.13, 0.07, 0.07],
        spec.shoe,
        8,
      );
      root.add(shoe);
    }
    return;
  }

  for (const side of [-1, 1] as const) {
    const leg = taperedBetween(
      side < 0 ? "leg_l" : "leg_r",
      new THREE.Vector3(side * 0.14, 0.63, 0),
      new THREE.Vector3(side * 0.14, 0.18, 0),
      0.12,
      0.1,
      spec.lower,
    );
    root.add(leg);

    const boot = ellipsoid(
      side < 0 ? "boot_l" : "boot_r",
      [0.16, 0.105, 0.22],
      [side * 0.14, 0.09, 0.08],
      spec.shoe,
      8,
    );
    boot.rotation.x = -0.04;
    root.add(boot);
  }
}

function buildArm(
  spec: SculptedChibiSpec,
  side: -1 | 1,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = side < 0 ? "pivot_arm_left" : "pivot_arm_right";
  pivot.position.set(side * 0.34, 1.32, 0);

  const elbow = new THREE.Vector3(side * 0.035, -0.31, 0.015);
  const wrist = new THREE.Vector3(side * 0.02, -0.59, 0.055);

  pivot.add(
    taperedBetween(
      side < 0 ? "upper_arm_l" : "upper_arm_r",
      new THREE.Vector3(0, 0, 0),
      elbow,
      0.105,
      0.09,
      spec.inner,
    ),
  );
  pivot.add(
    taperedBetween(
      side < 0 ? "forearm_l" : "forearm_r",
      elbow,
      wrist,
      0.09,
      0.075,
      spec.skin,
    ),
  );

  const hand = ellipsoid(
    side < 0 ? "hand_l" : "hand_r",
    [0.09, 0.11, 0.085],
    [wrist.x, wrist.y - 0.075, wrist.z],
    spec.skin,
    8,
  );
  pivot.add(hand);

  if (spec.hammer && side < 0) {
    const handle = taperedBetween(
      "hammer_handle",
      new THREE.Vector3(wrist.x - 0.01, wrist.y - 0.08, 0.06),
      new THREE.Vector3(wrist.x - 0.02, wrist.y + 0.48, 0.08),
      0.025,
      0.025,
      0x6b4b32,
      6,
    );
    pivot.add(handle);
    const head = ellipsoid(
      "hammer_head",
      [0.18, 0.075, 0.09],
      [wrist.x - 0.02, wrist.y + 0.51, 0.08],
      0x696a67,
      8,
    );
    pivot.add(head);
  }

  if (spec.wrench && side > 0) {
    const handle = taperedBetween(
      "wrench_handle",
      new THREE.Vector3(wrist.x, wrist.y - 0.05, 0.05),
      new THREE.Vector3(wrist.x + 0.02, wrist.y + 0.42, 0.06),
      0.04,
      0.035,
      0x777a75,
      8,
    );
    pivot.add(handle);
    const jaw = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.032, 5, 10, Math.PI * 1.45),
      mat(0x777a75, 0.5),
    );
    jaw.name = "wrench_jaw";
    jaw.position.set(wrist.x + 0.02, wrist.y + 0.52, 0.06);
    jaw.rotation.z = 0.45;
    pivot.add(jaw);
  }

  if (spec.books && side > 0) {
    const bookColors = [0x4c5f54, 0x536377, 0xd7d0ba];
    bookColors.forEach((color, index) => {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.34, 0.055),
        mat(color, 0.92),
      );
      book.name = `book_${index}`;
      book.position.set(
        wrist.x - index * 0.018,
        wrist.y + 0.05 + index * 0.015,
        0.09 + index * 0.045,
      );
      book.rotation.z = -0.18;
      pivot.add(book);
    });
  }

  mergeColoredMeshes(
    pivot,
    side < 0 ? "arm_left_sculpted" : "arm_right_sculpted",
  );
  return pivot;
}

export function createSculptedChibiCharacter(
  spec: SculptedChibiSpec,
  context: CitizenVisualFactoryContext,
): THREE.Group {
  const root = new THREE.Group();
  root.name = `char_${spec.role}_img2threejs_v1`;

  addTorso(root, spec);
  addLegs(root, spec);

  const neck = ellipsoid(
    "neck",
    [0.1, 0.11, 0.095],
    [0, 1.48, 0],
    spec.skin,
    8,
  );
  root.add(neck);

  const head = ellipsoid(
    "head",
    [0.35, 0.39, 0.335],
    [0, 1.83, 0],
    spec.skin,
    14,
  );
  root.add(head);

  for (const side of [-1, 1] as const) {
    root.add(
      ellipsoid(
        side < 0 ? "ear_l" : "ear_r",
        [0.055, 0.085, 0.035],
        [side * 0.345, 1.82, 0],
        spec.skin,
        8,
      ),
    );
  }

  addHair(root, spec);
  addFace(root, spec);
  addHeadwear(root, spec);

  mergeColoredMeshes(root, "body_sculpted");

  const leftArm = buildArm(spec, -1);
  const rightArm = buildArm(spec, 1);
  root.add(leftArm, rightArm);

  const headSocket = new THREE.Object3D();
  headSocket.name = "socket_head";
  headSocket.position.set(0, 2.12, 0);
  root.add(headSocket);

  const rightHandSocket = new THREE.Object3D();
  rightHandSocket.name = "socket_hand_r";
  rightHandSocket.position.set(0.36, 0.66, 0.06);
  root.add(rightHandSocket);

  root.userData.visualFactory = "img2threejs_sculpted_v1";
  root.userData.referenceCell = spec.referenceCell;
  root.userData.referenceBoard = "cozy_town_character_lineup.png";
  root.userData.tick = (_dt: number, elapsed: number) => {
    const phase = elapsed * 4.7 + context.presentationSlot * 0.71;
    leftArm.rotation.z = -0.04 + Math.sin(phase) * 0.07;
    rightArm.rotation.z = 0.04 - Math.sin(phase) * 0.07;
    root.rotation.z = Math.sin(phase * 0.5) * 0.008;
  };

  return root;
}
