import type { CitizenVisualFactory } from "../citizen-visual-registry";
import {
  createAuthoredRoleFactory,
  type AuthoredRoleSpec,
} from "./authored-role-factory";

const specs: Record<string, AuthoredRoleSpec> = {
  teacher: {
    name: "teacher",
    referenceCell: "row1_col1",
    coat: 0x8a6f62,
    shirt: 0xe2d7c0,
    trouser: 0x4e5b62,
    skin: 0xc99572,
    hair: 0x4a372f,
    accent: 0x7c6658,
    shoe: 0x353637,
    headwear: "none",
    accessory: "book",
    crossBody: true,
  },
  guard: {
    name: "guard",
    referenceCell: "row3_col7",
    coat: 0x40594f,
    shirt: 0x5a6c63,
    trouser: 0x35433e,
    skin: 0xc68f6b,
    hair: 0x3f332d,
    accent: 0x31463f,
    shoe: 0x2f3332,
    headwear: "guard_cap",
    accessory: "shield",
    vest: true,
    bodyWidth: 1.06,
  },
  builder: {
    name: "builder",
    referenceCell: "row1_col6",
    coat: 0x7f7359,
    shirt: 0xd49b4f,
    trouser: 0x424b4c,
    skin: 0xcb956f,
    hair: 0x49372d,
    accent: 0xd4a64f,
    shoe: 0x353636,
    headwear: "hard_hat",
    accessory: "hammer",
    vest: true,
  },
  farmer: {
    name: "farmer",
    referenceCell: "row3_col1",
    coat: 0x6c7553,
    shirt: 0xa9684c,
    trouser: 0x48533f,
    skin: 0xc9936c,
    hair: 0x4e392d,
    accent: 0x9c8253,
    shoe: 0x3b382f,
    headwear: "wide_hat",
    accessory: "basket",
    bodyWidth: 1.04,
  },
  cafe_worker: {
    name: "cafe_worker",
    referenceCell: "row3_col4",
    coat: 0x6f5b55,
    shirt: 0xddd2ba,
    trouser: 0x3f484e,
    skin: 0xca9874,
    hair: 0x49362f,
    accent: 0x9d735e,
    shoe: 0x333536,
    headwear: "none",
    accessory: "tray",
    apron: true,
  },
  service_crew: {
    name: "service_crew",
    referenceCell: "row2_col5",
    coat: 0x5a6e5d,
    shirt: 0xc9c5ab,
    trouser: 0x3e4842,
    skin: 0xc28c68,
    hair: 0x46372f,
    accent: 0x687a68,
    shoe: 0x303433,
    headwear: "service_cap",
    accessory: "toolbox",
  },
  casual_resident: {
    name: "casual_resident",
    referenceCell: "row0_col0",
    coat: 0x667a8c,
    shirt: 0xd8cdb6,
    trouser: 0x50585a,
    skin: 0xc99572,
    hair: 0x44342e,
    accent: 0x9c7258,
    shoe: 0x343536,
    headwear: "flat_cap",
    accessory: "satchel",
    crossBody: true,
  },
};

function factoryFor(name: keyof typeof specs): CitizenVisualFactory {
  const spec = specs[name]!;
  return (context) => createAuthoredRoleFactory(spec, context);
}

export const createTeacherReferenceFactory = factoryFor("teacher");
export const createGuardReferenceFactory = factoryFor("guard");
export const createBuilderReferenceFactory = factoryFor("builder");
export const createFarmerReferenceFactory = factoryFor("farmer");
export const createCafeWorkerReferenceFactory = factoryFor("cafe_worker");
export const createServiceCrewReferenceFactory = factoryFor("service_crew");
export const createCasualResidentReferenceFactory = factoryFor("casual_resident");
