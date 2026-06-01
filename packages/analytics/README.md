# @fillament/analytics

Free, privacy-safe analytics for [Fillament](https://github.com/headlessButSmart/fillament) forms.

**By default, no field values are ever sent**, and sensitive field names (`password`, `email`, `ssn`, `cardNumber`, `cvv`, `iban`, `dob`, `phone`, `address`, …) are auto-redacted to alias hashes.

```bash
pnpm add @fillament/analytics
```

```ts
import { createAnalyticsPlugin, customAnalyticsAdapter } from "@fillament/analytics";
import { useEffect } from "react";

const plugin = createAnalyticsPlugin({
  adapter: customAnalyticsAdapter((event) => sendToBackend(event)),
  // optional: extra sensitive fields beyond the defaults
  redact: ["couponCode"],
});

useEffect(() => plugin.attach(form), [form]);
```

Built-in adapters: `consoleAnalyticsAdapter`, `customAnalyticsAdapter`, `segmentAnalyticsAdapter`, `posthogAnalyticsAdapter`. The Segment / PostHog adapters do not add bundle weight unless imported.

## Event types

`form_started`, `form_submitted`, `form_submit_failed`, `form_abandoned`, `field_focused`, `field_blurred`, `field_changed`, `field_error`, `field_error_resolved`, `step_viewed`, `step_completed`, `server_validation_*`.

## License

MIT © headlessButSmart
