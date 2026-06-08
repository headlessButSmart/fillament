# `@fillament/persist`

Auto-save and restore form drafts. Optional — your core form bundle does not pay for this module unless you import it.

```bash
pnpm add @fillament/persist
```

## Minimal example

```ts
import { useForm } from "@fillament/react";
import { createStoragePersistPlugin, createLocalStorageStore } from "@fillament/persist";

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
      storage: createLocalStorageStore(),
    }),
  ],
});
```

`storage` defaults to `createLocalStorageStore()`. Also available:

- `createSessionStorageStore()` — per-tab persistence.
- `createMemoryDraftStore()` — in-memory fallback (useful in SSR or tests).

## Options

| Option | Default | Notes |
| --- | --- | --- |
| `key` | required | Storage key. |
| `version` | `1` | Bump when the persisted shape changes. Pair with `migrate`. |
| `debounceMs` | `400` | Coalesce writes during heavy typing. |
| `autoSave` | `true` | Save on every value change. Set to `false` for button-driven saves only — see [Manual mode](#manual-mode-save-as-draft-button) below. |
| `restoreOnMount` | `true` | Read from storage and `setValues` once on init. |
| `clearOnSubmit` | `true` | Remove the entry after a successful submit. Set `false` for shared-key flows — see [Shared drafts](#shared-drafts-multiple-forms-same-key). |
| `clearOnReset` | `true` | Remove the entry when `form.reset()` is called. Set `false` for shared-key flows. |
| `include` | — | Whitelist of path prefixes. Other fields are skipped. |
| `exclude` | — | Blacklist of path prefixes. |
| `excludeSensitive` | `true` | Default sensitive-field guard (see below). Pass `false` to opt out. |
| `migrate` | — | `(values, fromVersion, toVersion) => Partial<TValues>`. |
| `shouldPersist` | — | Custom predicate. |
| `serialize` / `deserialize` | `JSON` | Override for custom envelopes / encryption. |
| `onRestoreError` | — | Observe restore failures (parse, migrate, etc.). |
| `onAfterSave` | — | `(savedAt: Date) => void` — observe successful writes. Useful for "Saved 2 sec ago" UIs. |

## Manual mode ("Save as draft" button)

Pass `autoSave: false` to disable the auto-save-on-change behavior. Use the plugin handle's `save()` / `clear()` / `restore()` methods to drive persistence yourself.

```tsx
import { useForm } from "@fillament/react";
import { createStoragePersistPlugin } from "@fillament/persist";

const persistPlugin = createStoragePersistPlugin({
  key: "checkout",
  autoSave: false,           // ← opt-in: no auto-save
  restoreOnMount: true,      // still restore on mount
  clearOnSubmit: true,       // still clear on submit
});

function CheckoutForm() {
  const form = useForm({ schema, defaultValues, plugins: [persistPlugin] });

  return (
    <Form form={form} onSubmit={save}>
      {/* … fields … */}
      <button type="button" onClick={() => persistPlugin.save()}>
        Save as draft
      </button>
      <button type="button" onClick={() => persistPlugin.clear()}>
        Discard draft
      </button>
      <button type="submit">Place order</button>
    </Form>
  );
}
```

The plugin handle exposes:

| Method / property | Notes |
| --- | --- |
| `save()` | Flush the current form values to storage (cancels any pending auto-save debounce). |
| `clear()` | Remove the persisted draft. |
| `restore()` | Re-read from storage and `setValues`. Useful for a "restore last saved" button. |
| `isReady` | `true` once `onInit` has run. `save()` / `restore()` are no-ops before then. |
| `lastSavedAt` | `Date \| null` — when the last successful save happened. |

`autoSave: false` only disables saves on value change. `restoreOnMount`, `clearOnSubmit`, and `clearOnReset` still fire unless you also disable them. This lets you mix modes — e.g. "auto-restore on mount, but only save when the user clicks the button".

## Shared drafts (multiple forms, same key)

When several forms read and write the same draft — e.g. a multi-page checkout where each page mounts a different form but they all edit the same underlying object — disable both clear hooks so submit and reset on one form don't wipe the data the others depend on:

```ts
const sharedDraft = createStoragePersistPlugin({
  key: "checkout-draft",
  clearOnSubmit: false,   // ← don't wipe on submit
  clearOnReset: false,    // ← don't wipe on reset either
  restoreOnMount: true,   // every form re-hydrates from the shared draft
});

// page-1.tsx
useForm({ defaultValues, plugins: [sharedDraft] });

// page-2.tsx — same plugin instance, or a fresh one with the same key
useForm({ defaultValues, plugins: [sharedDraft] });
```

You're now in charge of clearing the draft yourself when the whole flow completes:

```ts
// On final confirmation page:
sharedDraft.clear();
```

A few notes:

- Each `useForm` only restores values that match its own `defaultValues` shape — extra keys in the persisted payload are written to the form state via `setValues` but harmlessly ignored if no field reads them.
- If different forms write conflicting values for the same field, last writer wins. Design the shared shape so forms own disjoint slices, or coordinate via the form's `subscribeFormState` if you need finer control.
- For one-way sharing (form A writes, form B only reads), call `sharedDraft.save()` manually on A and rely on `restoreOnMount` for B.

## Sensitive fields are excluded by default

The default exclusion list contains substrings checked case-insensitively against every leaf path:

```
password · passcode · token · secret · ssn · socialSecurity · creditCard ·
cardNumber · cardCvc · cvc · cvv · otp · mfa · twoFactor
```

You can override:

```ts
createStoragePersistPlugin({
  key: "k",
  excludeSensitive: (path) => path.startsWith("internal."),
});
```

Setting `excludeSensitive: false` removes the guard entirely. **Don't.** Use `include` to narrow what gets written instead.

## Clearing a draft

The plugin clears on a successful `submit()` (when `clearOnSubmit` is true) and on `form.reset()`. You can also clear manually via the store you passed in.

## Schema migrations

When `version` differs from the stored payload:

- If `migrate` is provided, it runs and the migrated values are restored.
- If `migrate` is missing, the old draft is dropped and the form mounts with `defaultValues`.

```ts
migrate: (raw, from, to) => {
  if (from === 1 && to === 2) {
    const v = raw as { fullName?: string };
    const [first, ...rest] = (v.fullName ?? "").split(" ");
    return { firstName: first ?? "", lastName: rest.join(" ") };
  }
  return {};
}
```

## Storage failure behavior

Quota exceeded, private-browsing mode, missing `window` (SSR), corrupted JSON — none of these crash the form. Writes are silently dropped; bad reads are removed and the form mounts cleanly. Use `onRestoreError` if you want to observe restore failures.

## Testing tip

In tests, swap `storage` for `createMemoryDraftStore()` to assert exactly what was written.
