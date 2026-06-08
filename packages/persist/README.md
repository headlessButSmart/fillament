# @fillament/persist

Draft persistence for [Fillament](https://github.com/headlessButSmart/fillament). Auto-save and restore form values across page reloads, tabs, or whole sessions — with sensitive-field exclusion, debounced writes, version migration, and an optional button-driven manual mode.

```bash
pnpm add @fillament/persist
```

Tree-shakeable, side-effect-free, no top-level work. Costs nothing in your bundle until you import it.

---

## Quick start

```ts
import { useForm } from "@fillament/react";
import { createStoragePersistPlugin } from "@fillament/persist";

const form = useForm({
  schema,
  defaultValues,
  plugins: [
    createStoragePersistPlugin({
      key: "checkout-form",
      version: 1,
      debounceMs: 500,
      restoreOnMount: true,
      clearOnSubmit: true,
    }),
  ],
});
```

That's the entire wiring. The plugin restores values from `localStorage` on mount, debounces saves while the user types, and clears the entry once submit succeeds.

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `createStoragePersistPlugin(options)` | factory | Returns a `PersistPluginHandle` — a `FillamentPlugin` with extra `save()` / `clear()` / `restore()` methods. |
| `createLocalStorageStore()` | factory | A `StorageLike` backed by `window.localStorage`. Safe in SSR (returns no-op store when `window` is undefined). |
| `createSessionStorageStore()` | factory | Same, but per-tab. |
| `createMemoryDraftStore()` | factory | In-memory `StorageLike`. Useful in SSR and tests. |
| `isSensitivePath(path, patterns?)` | helper | True when `path` matches any of the default (or supplied) sensitive substrings, case-insensitive. |
| `DEFAULT_SENSITIVE_PATTERNS` | const | The built-in substring list (see below). |
| `PersistOptions<TValues>` | type | Options accepted by the factory. |
| `PersistedPayload<TValues>` | type | Envelope written to storage. |
| `PersistPluginHandle<TValues>` | type | Return type of the factory. |
| `PersistContext<TValues>` | type | Passed to `shouldPersist`. |
| `StorageLike` | type | Minimal store contract — `getItem` / `setItem` / `removeItem`. |

---

## `createStoragePersistPlugin(options)`

### `PersistOptions<TValues>`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `key` | `string` | **required** | Storage key. |
| `version` | `number` | `1` | Bump when the persisted shape changes. Pair with `migrate`. |
| `debounceMs` | `number` | `400` | Coalesce writes during heavy typing. `0` = synchronous. |
| `autoSave` | `boolean` | `true` | Save on every value change. `false` disables auto-save — call `handle.save()` manually. |
| `restoreOnMount` | `boolean` | `true` | Read from storage and `setValues` once during `onInit`. |
| `clearOnSubmit` | `boolean` | `true` | Remove the entry after a successful submit. |
| `clearOnReset` | `boolean` | `true` | Remove the entry when `form.reset()` is called. |
| `storage` | `StorageLike` | `createLocalStorageStore()` | Where to read/write. |
| `include` | `string[]` | — | Whitelist of path prefixes (`["address", "billing.line1"]`). Other paths are skipped. |
| `exclude` | `string[]` | — | Blacklist of path prefixes. Runs after `include`. |
| `excludeSensitive` | `boolean \| (path) => boolean` | `true` | Default sensitive-field guard. Pass `false` to opt out (NOT recommended). Pass a function for custom rules. |
| `migrate` | `(values, fromVersion, toVersion) => Partial<TValues>` | — | Called when the stored `version` differs from the configured `version`. Return the migrated values. Throwing falls back to dropping the draft. |
| `shouldPersist` | `(ctx: PersistContext) => boolean` | — | Predicate called before every write. Return `false` to skip. |
| `serialize` | `(payload) => string` | `JSON.stringify` | Override for custom envelopes (compression, encryption, etc.). |
| `deserialize` | `(raw) => PersistedPayload` | `JSON.parse` | Inverse of `serialize`. Throws are caught and the entry is dropped. |
| `onRestoreError` | `(err: unknown) => void` | — | Observe restore failures (parse, migrate). Write failures are silent by design. |
| `onAfterSave` | `(savedAt: Date) => void` | — | Observe successful writes — auto or manual. Useful for "Saved 2 sec ago" UIs. |

### Returned `PersistPluginHandle<TValues>`

A `FillamentPlugin` augmented with methods you can call from anywhere (typically a button click).

| Member | Signature | Notes |
| --- | --- | --- |
| `save()` | `() => void` | Flush current values to storage now. Cancels any pending debounced write. No-op before `onInit` runs (warns to `console.warn`). |
| `clear()` | `() => void` | Remove the persisted entry. Resets `lastSavedAt` to `null`. Safe to call before `onInit`. |
| `restore()` | `() => void` | Re-read from storage and apply via `form.setValues`. Useful for a "Restore last saved" button. No-op before `onInit` runs. |
| `isReady` | `boolean` | `true` once attached to a form via `onInit`. |
| `lastSavedAt` | `Date \| null` | Timestamp of the most recent successful write. |
| `name` | `"@fillament/persist"` | Identifier used in plugin error logs. |
| _(lifecycle hooks)_ | `FillamentPlugin<TValues>` | Implements `onInit`, `onValuesChange`, `onSubmitSuccess`, `onReset`. |

---

## `PersistedPayload<TValues>`

The envelope written to storage:

```ts
interface PersistedPayload<TValues> {
  version: number;       // matches PersistOptions.version
  savedAt: string;       // ISO timestamp
  values: Partial<TValues>;
}
```

If you provide a custom `serialize` / `deserialize`, you own the on-disk format.

---

## `StorageLike`

The contract every store satisfies:

```ts
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

The three built-in stores are:

- `createLocalStorageStore()` — `window.localStorage`-backed. Returns `null` from `getItem` and no-ops `setItem` when `window` is undefined (SSR) or storage throws (private browsing, quota).
- `createSessionStorageStore()` — same, scoped to the tab.
- `createMemoryDraftStore()` — `Map`-based. Lives for the lifetime of the JS process; great in tests.

Bring your own store (IndexedDB, OPFS, cookies, encrypted wrapper, etc.) by implementing the interface.

---

## Sensitive fields are excluded by default

`DEFAULT_SENSITIVE_PATTERNS` (case-insensitive substring match against each leaf path):

```
password · passcode · token · secret · ssn · socialSecurity ·
creditCard · cardNumber · cardCvc · cvc · cvv · otp · mfa · twoFactor
```

Override:

```ts
createStoragePersistPlugin({
  key: "k",
  excludeSensitive: (path) => path.startsWith("internal.") || path === "answer",
});
```

`excludeSensitive: false` removes the guard entirely. **Don't.** Use `include` to narrow what gets written instead.

`isSensitivePath(path, patterns?)` is exported so you can reuse the same logic elsewhere (e.g. in your analytics redaction).

---

## Manual mode — button-driven save

Pass `autoSave: false` and drive saves yourself:

```tsx
const persist = createStoragePersistPlugin({
  key: "checkout",
  autoSave: false,        // ← no save-on-change
  restoreOnMount: true,   // still restore on mount
  clearOnSubmit: true,    // still clear on submit
});

function CheckoutForm() {
  const form = useForm({ schema, defaultValues, plugins: [persist] });
  return (
    <Form form={form} onSubmit={confirm}>
      {/* …fields… */}
      <button type="button" onClick={() => persist.save()}>Save as draft</button>
      <button type="button" onClick={() => persist.restore()}>Restore last saved</button>
      <button type="button" onClick={() => persist.clear()}>Discard draft</button>
      <button type="submit">Place order</button>
    </Form>
  );
}
```

`save()` cancels any pending debounce, so it's also useful in auto-save mode as a "flush before navigation" call.

---

## Shared drafts (multi-form, same key)

Two or more forms reading and writing the same draft — e.g. a wizard split across pages — disable both clear hooks:

```ts
const sharedDraft = createStoragePersistPlugin({
  key: "checkout-draft",
  clearOnSubmit: false,   // submitting one page doesn't wipe the other's data
  clearOnReset: false,    // reset doesn't either
  restoreOnMount: true,
});

// page-1.tsx
useForm({ defaultValues, plugins: [sharedDraft] });

// page-2.tsx — different form, same plugin instance (or a fresh one with the same key)
useForm({ defaultValues, plugins: [sharedDraft] });

// On the confirmation page:
sharedDraft.clear();
```

Notes:

- Each `useForm` only restores values that match its own `defaultValues` shape — extras in the persisted payload pass through harmlessly.
- Last writer wins on field collisions. Design the shape so forms own disjoint slices.
- For one-way sharing, call `sharedDraft.save()` manually on the writer and let `restoreOnMount` rehydrate the reader.

---

## Schema migrations

When the stored `version` differs from `options.version`:

- If you provided `migrate`, it runs and the migrated values are restored.
- If you didn't, the old draft is dropped and the form mounts with `defaultValues`.

```ts
migrate: (raw, from, to) => {
  if (from === 1 && to === 2) {
    const v = raw as { fullName?: string };
    const [first, ...rest] = (v.fullName ?? "").split(" ");
    return { firstName: first ?? "", lastName: rest.join(" ") };
  }
  return {};
},
```

Throws are caught — restore falls back to defaults and `onRestoreError` fires.

---

## Storage failure behavior

Quota exceeded, private-browsing mode, missing `window` (SSR), corrupted JSON — none of these crash the form:

- Writes silently drop.
- Bad reads remove the offending entry and the form mounts cleanly.
- Use `onRestoreError` if you want to observe restore failures.

---

## Testing

Swap the store for an in-memory one and assert on its contents:

```ts
import { createMemoryDraftStore } from "@fillament/persist";

const storage = createMemoryDraftStore();
const form = createForm({
  defaultValues: { name: "" },
  plugins: [createStoragePersistPlugin({ key: "k", storage, debounceMs: 0 })],
});
form.setValue("name", "Ana");
expect(JSON.parse(storage.getItem("k")!).values.name).toBe("Ana");
```

For debounce assertions, pair with `vi.useFakeTimers()`.

---

## License

MIT © headlessButSmart
