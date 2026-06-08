# @fillament/remote

Async options, dependent lookups, remote validation, and remote default values for [Fillament](https://github.com/headlessButSmart/fillament) — without forcing React Query, SWR, or Redux on your app.

```bash
pnpm add @fillament/remote
```

Framework-agnostic. Each factory returns a subscribable handle (`getSnapshot` + `subscribe`) you can wire to React via `useSyncExternalStore`, to any other framework, or use bare in a vanilla script.

---

## Quick start

```ts
import { remoteOptions, remoteValidation } from "@fillament/remote";

const createCountries = remoteOptions({
  key: ["countries"],
  fetcher: async ({ signal }) => (await fetch("/api/countries", { signal })).json(),
  mapOption: (c) => ({ label: c.name, value: c.code }),
});

const handle = createCountries({});  // start fetching with these form values
handle.subscribe(() => render());
handle.getSnapshot();                // { status, data, error, isStale }
```

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `remoteOptions(config)` | factory | Async option list keyed by form values. Returns a function `(initialValues) => RemoteResultHandle<RemoteOption[]>`. |
| `remoteValidation(config)` | factory | Single-field async validator with debounce + stale-protection. Returns a `RemoteValidator`. |
| `remoteDefaultValue(config)` | factory | Fetch a value once enabled — e.g. a user's saved address. Returns `(initialValues) => RemoteResultHandle<TResult>`. |
| `remoteSuggestions(config)` | factory | Alias for `remoteOptions` — same shape, semantically different (autocomplete). |
| `createFetchRemoteClient(options?)` | factory | A small typed `fetch` wrapper. Optional helper. |
| Types | see below | All public types are exported. |

---

## `remoteOptions(config)`

Build a handle that fetches an option list keyed by form values.

```ts
const createCities = remoteOptions<{ country: string | null }, CityDTO[]>({
  key: (ctx) => ["cities", ctx.values.country],
  enabled: (ctx) => Boolean(ctx.values.country),
  fetcher: async ({ values, signal }) => {
    const res = await fetch(`/api/cities?country=${values.country}`, { signal });
    return res.json();
  },
  mapOption: (c) => ({ label: c.name, value: c.code, disabled: c.deprecated }),
  debounceMs: 200,
  staleTimeMs: 60_000,
  onError: (err) => console.error(err),
});

const handle = createCities({ country: null });
```

### `RemoteOptionsConfig<TValues, TResult>`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `key` | `unknown[] \| ((ctx) => unknown[])` | **required** | Cache key. When it changes, in-flight fetches are aborted and a new one fires. |
| `fetcher` | `(ctx: RemoteContext<TValues>) => Promise<TResult>` | **required** | Your fetch function. Receives `{ values, signal }`. |
| `enabled` | `boolean \| ((ctx) => boolean)` | `true` | When `false`, skips the fetch and keeps status `"idle"`. |
| `debounceMs` | `number` | `0` | Debounce key changes. Useful for typeahead. |
| `cacheTimeMs` | `number` | — | Reserved — currently `staleTimeMs` is enforced. |
| `staleTimeMs` | `number` | — | If set, results are cached by key; cache hits inside this window return immediately with `isStale: false`. |
| `mapOption` | `(item: any) => RemoteOption` | smart default | Map a raw API item to `{ label, value, disabled? }`. The default looks at `value/id/code` and `label/name/title`. |
| `onError` | `(err: unknown) => void` | — | Observe failures. Snapshot also exposes `error`. |

### Returned `RemoteResultHandle<RemoteOption[]>`

| Member | Signature | Notes |
| --- | --- | --- |
| `getSnapshot()` | `() => RemoteResultSnapshot` | Read the current state synchronously. |
| `subscribe(listener)` | `(() => void) => () => void` | Subscribe to snapshot changes; returns an unsubscribe. |
| `refetch(values)` | `(values) => Promise<void>` | Force a refetch with the given values, bypassing cache/staleness. |
| `update(values)` | `(values) => void` | Forward new values from the host form. Triggers a refetch only if the key changed and `enabled` is `true`. |
| `dispose()` | `() => void` | Abort any in-flight fetch and clear listeners. |

### `RemoteResultSnapshot<T>`

```ts
interface RemoteResultSnapshot<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | undefined;
  error: unknown;
  isStale: boolean;     // true when served from cache outside staleTimeMs
}
```

### Stale-response protection

Every handle tracks an internal generation counter:

- When `key` changes or `refetch()` is called, all earlier in-flight requests are aborted via `AbortController` **and** their resolutions are discarded.
- Slow responses from earlier calls can never overwrite faster responses from newer calls.

---

## `remoteValidation(config)`

Debounced, cancellation-safe async validator for a single field.

```ts
const validateEmail = remoteValidation({
  debounceMs: 400,
  fetcher: async ({ value, signal }) => {
    const res = await fetch(`/api/email-check?email=${value}`, { signal });
    return (await res.json()).available ? undefined : "Email is already taken";
  },
  onError: () => "Could not validate email",
});

const message = await validateEmail.validate("email", value, form.getValues());
if (message) form.setFieldError("email", { type: "server", message });
else form.clearFieldErrors("email");

validateEmail.dispose();   // when the form unmounts
```

### `RemoteValidationConfig<TValues>`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `fetcher` | `(ctx: RemoteValidationContext<TValues>) => Promise<string \| undefined \| null \| boolean>` | **required** | Return the error message (`string`), `undefined`/`null` for valid, or `false` for a generic "Invalid" message. |
| `debounceMs` | `number` | `0` | Wait this long after the latest call before firing. |
| `onError` | `(err: unknown) => string \| undefined` | — | Map network errors to a user-facing message. Return `undefined` to treat the error as "valid for now". |

### `RemoteValidator`

| Member | Signature | Notes |
| --- | --- | --- |
| `validate(field, value, values)` | `(string, unknown, unknown) => Promise<string \| undefined>` | Returns the error message or `undefined`. **Superseded calls resolve to `undefined`** so consumers awaiting earlier calls never hang. |
| `dispose()` | `() => void` | Cancel any pending validation and release internals. |

`RemoteValidationContext<TValues>`:

```ts
{
  field: string;
  value: unknown;
  values: TValues;
  signal: AbortSignal;
}
```

---

## `remoteDefaultValue(config)`

Fetch a value once, hand it to your form as a default. Useful for "load the current user's saved shipping address" patterns.

```ts
const create = remoteDefaultValue<{ userId: string }, ShippingAddress>({
  key: (ctx) => ["default-shipping", ctx.values.userId],
  fetcher: async ({ values, signal }) =>
    (await fetch(`/api/me/${values.userId}/shipping`, { signal })).json(),
});

const handle = create({ userId: currentUserId });
handle.subscribe(() => {
  const snap = handle.getSnapshot();
  if (snap.status === "success" && snap.data) form.setValues(snap.data);
});
```

### `RemoteDefaultValueConfig<TValues, TResult>`

| Option | Type | Notes |
| --- | --- | --- |
| `key` | `unknown[] \| ((ctx) => unknown[])` | Dedupes by key — re-fetches only when it changes. |
| `fetcher` | `(ctx: RemoteContext<TValues>) => Promise<TResult>` | Your fetcher. |
| `enabled` | `boolean \| ((ctx) => boolean)` | Defaults to `true`. |
| `onError` | `(err: unknown) => void` | Observe failures. |

Returns a `RemoteResultHandle<TResult>` (same shape as `remoteOptions`).

---

## `remoteSuggestions(config)`

Re-export of `remoteOptions` under a clearer name for autocomplete / typeahead UIs. Same signature, same return type.

---

## `createFetchRemoteClient(options?)`

A small typed `fetch` wrapper. Use it if you want consistent JSON parsing, error throwing, and a base URL across all your remote calls. **Optional** — the factories above take a bare `fetcher`, so most projects won't need this.

```ts
const api = createFetchRemoteClient({
  baseUrl: "/api",
  headers: { "x-tenant-id": "acme" },
});

await api.get<User[]>("/users");
await api.post<Order>("/orders", { items: [...] });
```

### `FetchRemoteClientOptions`

| Option | Type | Notes |
| --- | --- | --- |
| `baseUrl` | `string` | Prepended to relative URLs. Ignored for absolute (`http://…`) URLs. |
| `headers` | `HeadersInit` | Default headers merged into every request. |
| `fetch` | `typeof fetch` | Inject a custom fetch (e.g. for tests or Node < 18). Defaults to global `fetch`; throws if neither is available. |

Returns:

```ts
interface FetchRemoteClient {
  get<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T>;
  post<T = unknown>(input: RequestInfo | URL, body?: unknown, init?: RequestInit): Promise<T>;
}
```

Both methods throw on non-2xx responses with the response status and body in the error message.

---

## Wiring to React

`useSyncExternalStore` is the cleanest path:

```tsx
function useRemoteHandle<T>(handle: RemoteResultHandle<T>) {
  return useSyncExternalStore(
    (cb) => handle.subscribe(cb),
    () => handle.getSnapshot(),
    () => handle.getSnapshot()
  );
}

function CountrySelect({ form }) {
  const [handle] = useState(() => createCountries(form.getValues()));
  useEffect(() => form.subscribeFormState((s) => handle.update(s.values)), [form, handle]);
  useEffect(() => () => handle.dispose(), [handle]);
  const snap = useRemoteHandle(handle);
  // …
}
```

---

## Adapters (not bundled)

The package deliberately ships no React Query, SWR, or Redux dependency. Build adapters in user code if your stack already pulls those libraries:

```ts
// pseudo-adapter — wrap a React Query result in the RemoteResultHandle contract
function reactQueryHandle<T>(query) {
  return {
    getSnapshot: () => ({ status: query.status, data: query.data, error: query.error, isStale: query.isStale }),
    subscribe: (cb) => query.subscribe(cb),
    // …
  };
}
```

---

## Testing

```ts
import { vi } from "vitest";

vi.useFakeTimers();
const fetcher = vi.fn(async () => [{ id: "PT", name: "Portugal" }]);
const handle = remoteOptions({ key: ["countries"], fetcher, mapOption: (c) => ({ label: c.name, value: c.id }) })({});
await vi.runAllTimersAsync();
expect(handle.getSnapshot().data).toEqual([{ label: "Portugal", value: "PT" }]);
```

Debounce tests should use `vi.advanceTimersByTimeAsync` (drives microtasks under fake timers).

---

## License

MIT © headlessButSmart
