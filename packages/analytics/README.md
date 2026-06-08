# @fillament/analytics

Privacy-safe analytics for [Fillament](https://github.com/headlessButSmart/fillament) forms. Free, opt-in. **No field values are ever sent**, and sensitive field names are auto-redacted to non-cryptographic alias hashes so you can still group events without leaking PII.

```bash
pnpm add @fillament/analytics
```

```ts
import { createAnalyticsPlugin, posthogAnalyticsAdapter } from "@fillament/analytics";
import { useEffect } from "react";

const plugin = createAnalyticsPlugin({
  adapter: posthogAnalyticsAdapter(posthog),
  redact: ["couponCode"],  // extra sensitive fields beyond the built-in list
});

// in a React component:
useEffect(() => plugin.attach(form), [form]);
```

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `createAnalyticsPlugin(options)` | factory | Returns `{ attach(form) }`. Subscribes to `form.subscribeAnalytics`, sanitizes events, forwards to adapter(s). |
| `consoleAnalyticsAdapter(prefix?)` | adapter | Logs events with `console.log`. Useful in dev. |
| `customAnalyticsAdapter(track, name?)` | adapter | Wrap your own `(event) => void` function. |
| `segmentAnalyticsAdapter(analytics)` | adapter | Send to Segment's `analytics.track`. No `analytics-node` peer dep — bring your own instance. |
| `posthogAnalyticsAdapter(posthog)` | adapter | Send to PostHog's `posthog.capture`. Same — bring your instance. |
| `aliasHash(input)` | helper | Fast non-cryptographic hash used internally for `fieldHash`. Exported so you can pre-hash fields elsewhere. |
| `isSensitiveFieldName(name, extra?)` | helper | True if any path segment matches the sensitive list. |
| `DEFAULT_SENSITIVE_FIELDS` | const | The built-in sensitive name list. |
| `AnalyticsAdapter`, `AnalyticsPlugin`, `AnalyticsPluginOptions`, `AnalyticsEvent` | types | Full type surface (`AnalyticsEvent` re-exported from core). |

---

## `createAnalyticsPlugin(options)`

### `AnalyticsPluginOptions`
| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `adapter` | `AnalyticsAdapter \| AnalyticsAdapter[]` | **required** | Fan-out to one or many destinations. |
| `enabled` | `boolean` | `true` | When `false`, `attach()` returns a no-op unsubscribe. Useful for feature flags. |
| `redact` | `ReadonlyArray<string>` | `[]` | Additional sensitive field names (added on top of `DEFAULT_SENSITIVE_FIELDS`). Matches per dot-segment, case-insensitive. |
| `includeFieldNames` | `boolean` | `true` | When `false`, **all** field names are replaced with `fieldHash` aliases — useful in regulated environments. |
| `includeValues` | `boolean` | `false` (no effect in v0.1) | Reserved. Values are NEVER sent in v0.1 even if you flip this. |
| `formId` | `string` | — | Currently informational. |

### Returned `AnalyticsPlugin`

```ts
interface AnalyticsPlugin {
  attach(form: FormApi<any>): Unsubscribe;
}
```

`attach(form)` subscribes the plugin to the form's analytics stream and returns an unsubscribe. Call it inside `useEffect` so it tears down on unmount.

### What gets sanitized

For every event:

- If `event.field` matches the sensitive list (or `includeFieldNames` is `false`), the field name is removed and replaced with `event.fieldHash = aliasHash(name)`.
- `event.meta.value` and `event.meta.values` are stripped if present (defense-in-depth — core never emits them today).
- Adapter exceptions are caught — bad adapters never break form behavior.

---

## `AnalyticsEvent` (re-exported from core)

```ts
interface AnalyticsEvent {
  type: AnalyticsEventType;
  formId: string;
  field?: string;             // present only for non-sensitive fields with includeFieldNames: true
  fieldHash?: string;         // alias hash — always present for field-level events
  stepId?: string;
  errorCode?: string;
  durationMs?: number;
  timestamp: number;
  meta?: Record<string, unknown>;
}
```

### `AnalyticsEventType`

| Event | Fires when |
| --- | --- |
| `form_started` | The form initializes. |
| `form_submitted` | `submit()` succeeds. `durationMs` reports submit time. |
| `form_submit_failed` | `submit()` failed (invalid or threw). `errorCode` is `"submit_threw"` or the first failed field's code. |
| `form_abandoned` | (Reserved — emit it yourself via `form.emitAnalytics` if you track it.) |
| `field_focused` | Field gained focus. |
| `field_blurred` | Field lost focus (touched=true). |
| `field_changed` | Field value changed. |
| `field_error` | A validation error was set on a field. `errorCode` is the first error's `code`. |
| `field_error_resolved` | All errors cleared on a field that previously had errors. |
| `step_viewed` / `step_completed` | Multi-step forms — emit via `form.emitAnalytics` from your wizard logic. |
| `server_validation_started` / `server_validation_failed` / `server_validation_succeeded` | Lifecycle of `serverValidation` options. |

---

## Sensitive name list

`DEFAULT_SENSITIVE_FIELDS`:

```
password, passcode, token, secret, ssn, socialSecurityNumber, cardNumber,
creditCard, cvv, cvc, iban, routingNumber, accountNumber, dob, dateOfBirth,
phone, email, address
```

`isSensitiveFieldName(name, extra?)` splits on `.` and checks every segment, case-insensitive — so `"user.address.line1"` is sensitive (the `address` segment matches), as is `"PaymentCardNumber"`.

`aliasHash(input)` returns `"h_<base36>"` — a 32-bit FNV-1a hash. Stable across runs, not cryptographic.

---

## Adapters

### `consoleAnalyticsAdapter(prefix?)`
```ts
createAnalyticsPlugin({ adapter: consoleAnalyticsAdapter("[fillament]") });
// → console.log("[fillament]", "field_blurred", { type, formId, fieldHash, … })
```

### `customAnalyticsAdapter(track, name?)`
```ts
createAnalyticsPlugin({
  adapter: customAnalyticsAdapter(async (event) => {
    await fetch("/_/analytics", { method: "POST", body: JSON.stringify(event) });
  }),
});
```

Async adapters: errors in the returned promise are swallowed so they can't break the form. Surface them in your own error tracking.

### `segmentAnalyticsAdapter(analytics)`
```ts
import AnalyticsBrowser from "@segment/analytics-next";
const analytics = AnalyticsBrowser.load({ writeKey: "…" });
createAnalyticsPlugin({ adapter: segmentAnalyticsAdapter(analytics) });
// → analytics.track("form.field_blurred", { formId, fieldHash, … })
```

The adapter only depends on the structural shape `{ track(event: string, props: Record<string, unknown>): void }`. Segment is **not** a peer dependency — bring whichever Segment library you use.

### `posthogAnalyticsAdapter(posthog)`
```ts
import posthog from "posthog-js";
createAnalyticsPlugin({ adapter: posthogAnalyticsAdapter(posthog) });
// → posthog.capture("form_field_blurred", { formId, fieldHash, … })
```

Same idea — structural typing, no peer dep.

### Fan-out
```ts
createAnalyticsPlugin({
  adapter: [
    posthogAnalyticsAdapter(posthog),
    customAnalyticsAdapter(sendToInternalPipeline),
  ],
});
```

### Custom adapters
Implement the `AnalyticsAdapter` interface:

```ts
interface AnalyticsAdapter {
  name: string;
  track: (event: AnalyticsEvent) => void | Promise<void>;
  flush?: () => void | Promise<void>;
}
```

`flush?` is reserved for batched adapters — Fillament does not currently call it automatically; expose it on your adapter and call it from your app on navigation / unload.

---

## Manually emitting events

`FormApi.emitAnalytics` lets you push custom events into the same pipeline — useful for wizard step transitions, server validation, or anything else outside the field lifecycle:

```ts
form.emitAnalytics({
  type: "step_viewed",
  stepId: "shipping",
  meta: { wizardId: "checkout" },
});
```

`type`, `field`, `fieldHash`, `stepId`, `errorCode`, `durationMs`, `meta` are all optional; `formId` and `timestamp` are filled in automatically.

---

## License

MIT © headlessButSmart
