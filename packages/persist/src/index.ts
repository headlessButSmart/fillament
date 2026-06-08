export {
  createLocalStorageStore,
  createSessionStorageStore,
  createMemoryDraftStore,
} from "./stores.js";

export { createStoragePersistPlugin } from "./plugin.js";

export { DEFAULT_SENSITIVE_PATTERNS, isSensitivePath } from "./sensitive.js";

export type {
  PersistOptions,
  PersistedPayload,
  PersistContext,
  PersistPluginHandle,
  StorageLike,
} from "./types.js";
