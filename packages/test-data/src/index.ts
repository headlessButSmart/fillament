export { generateTestValues } from "./generate.js";
export type { GenerateOptions, JsonSchemaLike } from "./generate.js";

export { fillFormWithTestData } from "./fill.js";
export type { FillOptions } from "./fill.js";

export { createRng } from "./random.js";
export type { Rng } from "./random.js";

export {
  generateFromName,
  fakeEmail,
  fakeFullName,
  fakeFirstName,
  fakeLastName,
  fakePhone,
  fakeUrl,
  fakeUuid,
  fakeSentence,
  fakeEpochMs,
  fakeIsoDate,
  fakeIsoDateTime,
} from "./heuristics.js";
