import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { stableVisualHash } from "../visual-identity";
import { animalMaterial, part } from "./shared-actor-visual";

export function createDogVisual(worldSeed: string | number): THREE.Mesh {
  const variants = [
    [0x9b704d, 0x5c4333, 0xd9c39f],
    [0x7f684f, 0x443a32, 0xc9b48f],
    [0xb08a62, 0x6d5038, 0xe0c9a4],
    [0x5f5b55, 0x343331, 0xcab99d],
  ] as const;
  const [fur, furDark, cream] =
    variants[stableVisualHash(`${String(worldSeed)}:dog`) % variants.length]!;
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

  for (const z of [-0.16, 0.16]) {
    pieces.push(part(
      new THREE.ConeGeometry(0.12, 0.28, 5),
      furDark,
      new THREE.Vector3(0.45, 0.91, z),
      new THREE.Euler(z < 0 ? -0.18 : 0.18, 0, -0.3),
    ));
  }

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
