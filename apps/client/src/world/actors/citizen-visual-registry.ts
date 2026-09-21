import * as THREE from "three";
import type { CitizenPresentationRole } from "../visual-identity";
import { createCitizenVisual } from "./citizen-visual";
import { generatedCitizenFactories } from "./generated/generated-citizen-factories";

export interface CitizenVisualFactoryContext {
  worldSeed: string | number;
  presentationSlot: number;
  child: boolean;
  role: CitizenPresentationRole;
  castShadow: boolean;
}

export type CitizenVisualFactory = (
  context: CitizenVisualFactoryContext,
) => THREE.Object3D;

const generatedFactories: Partial<
  Record<CitizenPresentationRole, CitizenVisualFactory>
> = { ...generatedCitizenFactories };

export function registerGeneratedCitizenFactory(
  role: CitizenPresentationRole,
  factory: CitizenVisualFactory,
): void {
  generatedFactories[role] = factory;
}

function normalizeCitizenObject(
  object: THREE.Object3D,
  context: CitizenVisualFactoryContext,
  source: "generated_factory" | "procedural",
): THREE.Object3D {
  object.userData.visualRole = context.role;
  object.userData.visualSource = source;
  object.userData.presentationSlot = context.presentationSlot;

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = context.castShadow;
    mesh.receiveShadow = true;
  });

  return object;
}

export function createCitizenVisualFromRegistry(
  context: CitizenVisualFactoryContext,
): THREE.Object3D {
  const generated = generatedFactories[context.role];
  if (generated) {
    return normalizeCitizenObject(generated(context), context, "generated_factory");
  }

  return normalizeCitizenObject(
    createCitizenVisual(
      context.worldSeed,
      context.presentationSlot,
      context.child,
      context.role,
      context.castShadow,
    ),
    context,
    "procedural",
  );
}
