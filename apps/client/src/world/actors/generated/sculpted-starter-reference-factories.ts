import type { CitizenVisualFactory } from "../citizen-visual-registry";
import {
  createSculptedChibiCharacter,
  type SculptedChibiSpec,
} from "./sculpted-chibi-factory";

const builder: SculptedChibiSpec = {
  role: "builder",
  referenceCell: "cozy_row1_col0",
  coat: 0x54514a,
  inner: 0x55534d,
  lower: 0x3f403d,
  skin: 0xc88e67,
  hair: 0x45332a,
  accent: 0xf0a12d,
  shoe: 0x4b3c31,
  headwear: "hard_hat",
  vest: true,
  hammer: true,
};

const teacher: SculptedChibiSpec = {
  role: "teacher",
  referenceCell: "cozy_row1_col2",
  coat: 0xb97943,
  inner: 0xe5d6b9,
  lower: 0x4a5b50,
  skin: 0xc9936f,
  hair: 0x4b352d,
  accent: 0x6a4b3b,
  shoe: 0x40352e,
  headwear: "none",
  glasses: true,
  skirt: true,
  books: true,
};

const utility: SculptedChibiSpec = {
  role: "utility_technician",
  referenceCell: "cozy_row1_col5",
  coat: 0x4f6f93,
  inner: 0x4f6f93,
  lower: 0x476789,
  skin: 0xca956e,
  hair: 0x40322c,
  accent: 0x31506f,
  shoe: 0x4a392f,
  headwear: "utility_cap",
  crossBodyBag: true,
  wrench: true,
};

export const createSculptedBuilder: CitizenVisualFactory = (context) =>
  createSculptedChibiCharacter(builder, context);

export const createSculptedTeacher: CitizenVisualFactory = (context) =>
  createSculptedChibiCharacter(teacher, context);

export const createSculptedUtilityTechnician: CitizenVisualFactory = (context) =>
  createSculptedChibiCharacter(utility, context);
