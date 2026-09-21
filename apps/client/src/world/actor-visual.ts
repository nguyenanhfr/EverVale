import * as THREE from "three";

const palette = {
  skinA: 0xd7aa86,
  skinB: 0xc68f6d,
  hair: 0x46382f,
  hairSoft: 0x665044,
  clothBlue: 0x637b89,
  clothGreen: 0x687b63,
  clothRust: 0xa16e55,
  clothMustard: 0xb58d58,
  clothPlum: 0x7b6478,
  pants: 0x4d5654,
  shoe: 0x453d37,
  accent: 0xd1ad68,
  fur: 0x9a6b47,
  furLight: 0xc09368,
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

function mat(key: keyof typeof palette, roughness = 0.94): THREE.MeshStandardMaterial {
  const cacheKey = `${key}:${roughness}`;
  let material = cache.get(cacheKey);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color: palette[key],
      roughness,
    });
    material.userData.sharedMaterial = true;
    cache.set(cacheKey, material);
  }
  return material;
}

function part(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow: boolean,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCitizenVisual(
  index: number,
  child: boolean,
  castShadow: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const model = new THREE.Group();
  const scale = child ? 0.76 : 1;
  const clothKeys = ["clothBlue", "clothGreen", "clothRust", "clothMustard", "clothPlum"] as const;
  const cloth = mat(clothKeys[index % clothKeys.length]!);
  const skin = mat(index % 4 === 0 ? "skinB" : "skinA");
  const hair = mat(index % 3 === 0 ? "hairSoft" : "hair");

  const torso = part(new THREE.CapsuleGeometry(0.27, 0.58, 4, 7), cloth, 0, 0.94, 0, castShadow);
  model.add(torso);

  const head = part(new THREE.SphereGeometry(0.235, 9, 7), skin, 0, 1.58, 0, castShadow);
  model.add(head);

  const hairCap = part(new THREE.SphereGeometry(0.245, 9, 6), hair, 0, 1.69, -0.015, false);
  hairCap.scale.set(1.02, 0.54, 1.02);
  model.add(hairCap);

  const leftLeg = part(new THREE.CapsuleGeometry(0.075, 0.34, 3, 6), mat("pants"), -0.13, 0.38, 0, castShadow);
  const rightLeg = part(new THREE.CapsuleGeometry(0.075, 0.34, 3, 6), mat("pants"), 0.13, 0.38, 0, castShadow);
  model.add(leftLeg, rightLeg);

  const leftArm = part(new THREE.CylinderGeometry(0.055, 0.07, 0.55, 6), cloth, -0.34, 0.98, 0, false);
  const rightArm = part(new THREE.CylinderGeometry(0.055, 0.07, 0.55, 6), cloth, 0.34, 0.98, 0, false);
  leftArm.rotation.z = -0.1;
  rightArm.rotation.z = 0.1;
  model.add(leftArm, rightArm);

  for (const x of [-0.13, 0.13]) {
    const shoe = part(new THREE.BoxGeometry(0.16, 0.10, 0.27), mat("shoe"), x, 0.12, 0.07, false);
    model.add(shoe);
  }

  if (index % 5 === 1) {
    const backpack = part(new THREE.BoxGeometry(0.42, 0.48, 0.16), mat("accent"), 0, 0.95, -0.28, false);
    backpack.rotation.x = 0.05;
    model.add(backpack);
  } else if (index % 7 === 2) {
    const brim = part(new THREE.CylinderGeometry(0.31, 0.31, 0.055, 9), mat("accent"), 0, 1.82, 0, false);
    const crown = part(new THREE.CylinderGeometry(0.2, 0.23, 0.18, 9), cloth, 0, 1.91, 0, false);
    model.add(brim, crown);
  }

  model.scale.setScalar(scale);
  group.add(model);
  group.userData.modelRoot = model;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.child = child;
  return group;
}

export function updateCitizenVisual(
  citizen: THREE.Group,
  time: number,
  moving: boolean,
  index: number,
): void {
  const model = citizen.userData.modelRoot as THREE.Group | undefined;
  const leftLeg = citizen.userData.leftLeg as THREE.Mesh | undefined;
  const rightLeg = citizen.userData.rightLeg as THREE.Mesh | undefined;
  const leftArm = citizen.userData.leftArm as THREE.Mesh | undefined;
  const rightArm = citizen.userData.rightArm as THREE.Mesh | undefined;
  if (!model || !leftLeg || !rightLeg || !leftArm || !rightArm) return;

  const phase = time / (moving ? 135 : 430) + index * 0.71;
  const swing = moving ? Math.sin(phase) * 0.55 : Math.sin(phase) * 0.05;
  leftLeg.rotation.x = swing;
  rightLeg.rotation.x = -swing;
  leftArm.rotation.x = -swing * 0.72;
  rightArm.rotation.x = swing * 0.72;
  model.position.y = moving ? Math.abs(Math.sin(phase * 2)) * 0.035 : Math.sin(phase) * 0.012;
  model.rotation.z = moving ? Math.sin(phase) * 0.018 : Math.sin(phase) * 0.008;
}

export function createDogVisual(): THREE.Group {
  const group = new THREE.Group();
  const fur = mat("fur");
  const furLight = mat("furLight");
  const body = part(new THREE.CapsuleGeometry(0.22, 0.48, 4, 7), fur, 0, 0.45, 0, true);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1.0, 1.25, 0.86);
  group.add(body);

  const head = part(new THREE.SphereGeometry(0.29, 8, 7), fur, 0.58, 0.59, 0, true);
  group.add(head);
  const muzzle = part(new THREE.SphereGeometry(0.16, 7, 5), furLight, 0.79, 0.52, 0, false);
  muzzle.scale.set(1.0, 0.74, 0.82);
  group.add(muzzle);

  for (const z of [-0.15, 0.15]) {
    const ear = part(new THREE.ConeGeometry(0.105, 0.28, 5), fur, 0.5, 0.86, z, false);
    ear.rotation.z = z < 0 ? 0.18 : -0.18;
    group.add(ear);
  }

  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.14, 0.14]) {
      const leg = part(new THREE.CylinderGeometry(0.055, 0.065, 0.34, 6), furLight, x, 0.22, z, false);
      group.add(leg);
    }
  }

  const tail = part(new THREE.CylinderGeometry(0.045, 0.075, 0.62, 6), fur, -0.58, 0.67, 0, false);
  tail.rotation.z = -Math.PI / 3;
  group.add(tail);
  group.userData.tail = tail;
  return group;
}

export function updateDogVisual(dog: THREE.Group, time: number): void {
  const tail = dog.userData.tail as THREE.Mesh | undefined;
  if (tail) tail.rotation.x = Math.sin(time / 90) * 0.65;
  dog.position.y = Math.abs(Math.sin(time / 175)) * 0.025;
}
