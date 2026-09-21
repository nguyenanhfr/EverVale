import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BlockerInstance } from "@evervale/domain/world.types";

const materials = {
  bark: new THREE.MeshStandardMaterial({ color: 0x72543a, roughness: 1, flatShading: true }),
  barkDark: new THREE.MeshStandardMaterial({ color: 0x563f2f, roughness: 1, flatShading: true }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x526f49, roughness: 1, flatShading: true }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x68825a, roughness: 1, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x77776e, roughness: 1, flatShading: true }),
  rockLight: new THREE.MeshStandardMaterial({ color: 0x929084, roughness: 1, flatShading: true }),
  dust: new THREE.MeshStandardMaterial({ color: 0xa68f70, roughness: 1 }),
  marker: new THREE.MeshBasicMaterial({ color: 0xd7aa54 }),
};
Object.values(materials).forEach((material) => {
  material.userData.sharedMaterial = true;
});

const transform = new THREE.Object3D();

function geo(
  geometry: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.BufferGeometry {
  transform.position.set(x, y, z);
  transform.rotation.set(rx, ry, rz);
  transform.scale.set(sx, sy, sz);
  transform.updateMatrix();
  const result = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  geometry.dispose();
  result.applyMatrix4(transform.matrix);
  return result;
}

function combined(
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
  castShadow = true,
): THREE.Mesh {
  const geometry = geometries.length === 1 ? geometries[0]! : mergeGeometries(geometries, false);
  if (!geometry) throw new Error("BLOCKER_GEOMETRY_MERGE_FAILED");
  if (geometries.length > 1) geometries.forEach((item) => item.dispose());
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function fallenTree(): THREE.Group {
  const group = new THREE.Group();
  const bark = [
    geo(new THREE.CylinderGeometry(0.42, 0.58, 6.2, 9), 0, 0.55, 0, 0, 0, Math.PI / 2),
    geo(new THREE.CylinderGeometry(0.12, 0.18, 2.4, 7), -1.35, 0.9, 0, 0.22, 0.3, Math.PI / 3),
    geo(new THREE.CylinderGeometry(0.10, 0.16, 2.0, 7), 1.5, 0.95, 0.1, -0.18, -0.25, -Math.PI / 3),
  ];
  group.add(combined(bark, materials.bark));

  const roots: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    roots.push(
      geo(
        new THREE.ConeGeometry(0.18, 1.15, 5),
        -3.05,
        0.38,
        0,
        Math.PI / 2,
        a,
        0,
        0.9,
        1,
        0.65,
      ),
    );
  }
  group.add(combined(roots, materials.barkDark, false));

  const leaves: THREE.BufferGeometry[] = [];
  const leavesLight: THREE.BufferGeometry[] = [];
  const crowns = [
    [-2.45, 1.32, 0.05, 1.0],
    [-2.05, 1.55, 0.55, 0.78],
    [2.5, 1.25, -0.08, 0.92],
    [2.08, 1.58, -0.52, 0.74],
  ] as const;
  crowns.forEach(([x,y,z,s],i) => {
    (i % 2 === 0 ? leaves : leavesLight).push(
      geo(new THREE.DodecahedronGeometry(0.95,0),x,y,z,0,i*0.47,0,s,0.82*s,s),
    );
  });
  group.add(combined(leaves, materials.leaf));
  group.add(combined(leavesLight, materials.leafLight, false));
  return group;
}

function rubble(): THREE.Group {
  const group = new THREE.Group();
  const dark: THREE.BufferGeometry[] = [];
  const light: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i += 1) {
    const x = (i % 3) * 1.02 - 1.02;
    const z = Math.floor(i / 3) * 0.84 - 0.84;
    const s = 0.52 + (i % 4) * 0.12;
    (i % 3 === 0 ? light : dark).push(
      geo(
        new THREE.DodecahedronGeometry(s,0),
        x,
        0.34 + (i % 2) * 0.15,
        z,
        i*0.21,
        i*0.67,
        i*0.13,
        1,
        0.65,
        0.88,
      ),
    );
  }
  group.add(combined(dark, materials.rock));
  group.add(combined(light, materials.rockLight, false));

  const debris = [
    geo(new THREE.BoxGeometry(2.5,0.15,0.28),0,0.34,0.78,0,0.18,0.06),
    geo(new THREE.BoxGeometry(1.8,0.13,0.24),0.35,0.62,-0.4,0,-0.35,-0.16),
  ];
  group.add(combined(debris, materials.barkDark, false));

  const dust = new THREE.Mesh(new THREE.CircleGeometry(2.0,12),materials.dust);
  dust.rotation.x = -Math.PI/2;
  dust.position.y = 0.018;
  dust.scale.set(1.2,0.82,1);
  dust.receiveShadow = true;
  group.add(dust);
  return group;
}

export function createBlockerVisual(blocker: BlockerInstance): THREE.Group {
  const group = blocker.definitionId === "fallen_tree" ? fallenTree() : rubble();

  if (blocker.state === "CLEARING") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2,0.12,6,24),materials.marker);
    ring.rotation.x = Math.PI/2;
    ring.position.y = 0.12;
    group.add(ring);
  }

  group.position.set(blocker.position.x,0,blocker.position.z);
  group.userData.blockerId = blocker.id;
  group.userData.blockerDefinitionId = blocker.definitionId;
  return group;
}
