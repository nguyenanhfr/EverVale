import { resolveWorldVisualDialect, type VisualDialectId } from "../visual-identity";

export interface EnvironmentDialectPalette {
  id: VisualDialectId;
  ground: number;
  skirt: number;
  moundA: number;
  moundB: number;
  rock: number;
  bush: number;
  patch: number;
  grass: number;
  flower: number;
  trunk: number;
  crown: number;
  daySky: number;
  duskSky: number;
  nightSky: number;
}

const palettes: Record<VisualDialectId, EnvironmentDialectPalette> = {
  hearthstone: {
    id: "hearthstone",
    ground: 0x809d70,
    skirt: 0x5e7457,
    moundA: 0x667f60,
    moundB: 0x718b66,
    rock: 0x777b70,
    bush: 0x536f50,
    patch: 0x718d63,
    grass: 0x5f7d55,
    flower: 0xd8b76f,
    trunk: 0x70553e,
    crown: 0x4f6d4b,
    daySky: 0xbfd4c4,
    duskSky: 0xd5ad8a,
    nightSky: 0x52677a,
  },
  willowbrook: {
    id: "willowbrook",
    ground: 0x789777,
    skirt: 0x536b59,
    moundA: 0x5f7d65,
    moundB: 0x6d8a70,
    rock: 0x737c73,
    bush: 0x496c54,
    patch: 0x6f8f70,
    grass: 0x557854,
    flower: 0xcabf78,
    trunk: 0x6b5442,
    crown: 0x486b51,
    daySky: 0xb9d1c7,
    duskSky: 0xcfae91,
    nightSky: 0x4e6571,
  },
  amberfield: {
    id: "amberfield",
    ground: 0x8e9c70,
    skirt: 0x687054,
    moundA: 0x727f5e,
    moundB: 0x818c65,
    rock: 0x827c6d,
    bush: 0x66734e,
    patch: 0x87966d,
    grass: 0x6f7f4f,
    flower: 0xd1a55e,
    trunk: 0x78583d,
    crown: 0x5f7049,
    daySky: 0xc9d2ad,
    duskSky: 0xd7a773,
    nightSky: 0x5a6170,
  },
  bluebell: {
    id: "bluebell",
    ground: 0x7e9a86,
    skirt: 0x5b7064,
    moundA: 0x657f72,
    moundB: 0x728b7b,
    rock: 0x757d7a,
    bush: 0x526f60,
    patch: 0x76927d,
    grass: 0x5d7d68,
    flower: 0xaebfca,
    trunk: 0x6d5543,
    crown: 0x506f5d,
    daySky: 0xb8d2d1,
    duskSky: 0xc8a8a2,
    nightSky: 0x4c6178,
  },
};

export function environmentDialectForSeed(
  seed: string | number,
): EnvironmentDialectPalette {
  return palettes[resolveWorldVisualDialect(seed).id];
}
