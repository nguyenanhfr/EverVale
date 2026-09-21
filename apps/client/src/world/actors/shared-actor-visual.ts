import * as THREE from "three";

export const citizenMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.92,
});
citizenMaterial.userData.sharedMaterial = true;

export const animalMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.96,
});
animalMaterial.userData.sharedMaterial = true;

export const citizenPalettes = [
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

export function colorGeometry(
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

export function part(
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
