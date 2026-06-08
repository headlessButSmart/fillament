# `@fillament/remote`

Async options, dependent lookups, remote validation, remote default values — without React Query, SWR, or Redux as dependencies.

```bash
pnpm add @fillament/remote
```

The package ships a framework-agnostic handle (`getSnapshot` / `subscribe`). Wire it to React via `useSyncExternalStore`, or to any other host that can listen to a subscription.

## Async options

```ts
import { remoteOptions } from "@fillament/remote";

const createCountries = remoteOptions({
  key: ["countries"],
  fetcher: async ({ signal }) => {
    const res = await fetch("/api/countries", { signal });
    return res.json();
  },
  mapOption: (c) => ({ label: c.name, value: c.code }),
});

const handle = createCountries({});
```

## Dependent lookups

```ts
const createCities = remoteOptions<{ country: string | null }>({
  key: (ctx) => ["cities", ctx.values.country],
  enabled: (ctx) => Boolean(ctx.values.country),
  fetcher: async ({ values, signal }) => {
    const res = await fetch(`/api/cities?country=${values.country}`, { signal });
    return res.json();
  },
});
```

`enabled` short-circuits the fetch when the dependency is missing. When the key changes, the in-flight request is aborted via `AbortController` so stale responses cannot overwrite newer results.

## Remote validation

```ts
import { remoteValidation } from "@fillament/remote";

const validateEmail = remoteValidation({
  debounceMs: 400,
  fetcher: async ({ value, signal }) => {
    const res = await fetch(`/api/email-check?email=${value}`, { signal });
    const data = await res.json();
    return data.available ? undefined : "Email is already taken";
  },
  onError: () => "Could not validate email — please try again",
});

// Use with Fillament's setFieldError when result is non-undefined.
const msg = await validateEmail.validate("email", "ana@acme.dev", form.getValues());
```

The validator debounces, cancels in-flight requests, and resolves only the latest call — earlier calls resolve to `undefined` and are intentionally discarded.

## Remote default value

```ts
import { remoteDefaultValue } from "@fillament/remote";

const handle = remoteDefaultValue<{ userId: string }, ShippingAddress>({
  key: (ctx) => ["default-shipping", ctx.values.userId],
  fetcher: async ({ values, signal }) =>
    (await fetch(`/api/me/${values.userId}/shipping`, { signal })).json(),
})({ userId: currentUserId });
```

Pair the snapshot with `form.setValues` when the status flips to `"success"`.

## Stale request protection

Every handle tracks an internal generation counter. When a new fetch starts, all earlier in-flight fetchers are aborted *and* their resolutions are dropped. You will never see a slow response from an earlier call overwrite a faster one from a later call.

## Adapters

This package deliberately ships no React Query, SWR, or Redux dependency. Optional adapters (`createReactQueryRemoteClient`, `createSWRRemoteClient`) can be layered in user code or in a follow-up subpath if your project already pulls those libraries in.

## Testing tip

In tests, swap `fetcher` for a `vi.fn()` and drive `handle.update(newValues)` directly. `vi.useFakeTimers()` is your friend for debounce assertions.
