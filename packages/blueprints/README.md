# @fillament/blueprints

Production-oriented starter form blueprints for [Fillament](https://github.com/headlessButSmart/fillament) — login, signup, contact, surveys, commerce, onboarding. Plain composable data; not locked-down UI components.

```bash
pnpm add @fillament/blueprints
```

Each blueprint returns `{ schema, defaultValues, labels, metadata }`. You feed that to your design system, `FieldsRenderer`, or a custom renderer. Every option is overridable; sensitive fields (raw card numbers, CVCs) are intentionally absent.

---

## Quick start

```ts
import { loginBlueprint } from "@fillament/blueprints/auth";
import { useForm } from "@fillament/react";

const login = loginBlueprint({ rememberMe: true, forgotPassword: true });

const form = useForm({
  defaultValues: login.defaultValues,
});
// then render `login.schema.fields` with your renderer, using `login.labels`.
```

---

## Subpath imports

Each category is tree-shakeable:

```ts
import { loginBlueprint, signupBlueprint } from "@fillament/blueprints/auth";
import { contactBlueprint } from "@fillament/blueprints/contact";
import { satisfactionSurveyBlueprint } from "@fillament/blueprints/survey";
import { addressBlueprint, orderBlueprint } from "@fillament/blueprints/commerce";
import { profileOnboardingBlueprint } from "@fillament/blueprints/onboarding";
```

Or import everything from the root:

```ts
import { loginBlueprint, orderBlueprint, npsSurveyBlueprint } from "@fillament/blueprints";
```

---

## The blueprint shape

Every blueprint returns:

```ts
interface FillamentBlueprint<TValues> {
  schema: BlueprintSchema;                         // { type: "object", fields: BlueprintFieldSchema[] }
  defaultValues: Partial<TValues>;
  labels?: Record<string, FillamentMessage>;       // keyed by field name + "submit"
  metadata?: Record<string, unknown>;              // blueprint kind, steps, payment notes…
  steps?: FillamentBlueprintStep[];                // optional multi-step layout hint
}
```

`BlueprintFieldSchema`:

```ts
interface BlueprintFieldSchema {
  name: string;
  type: "text" | "email" | "password" | "number" | "checkbox" | "select" |
        "textarea" | "date" | "tel" | "url" | "hidden";
  label?: FillamentMessage;
  placeholder?: FillamentMessage;
  description?: FillamentMessage;
  required?: boolean;
  options?: Array<{ label: FillamentMessage; value: string }>;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}
```

Labels accept `FillamentMessage` (plain string or `{ key, fallback }`), so blueprints play nicely with `@fillament/i18n`.

---

## Common options (every blueprint)

```ts
interface BlueprintBaseOptions<TValues> {
  labels?: Record<string, FillamentMessage>;   // override any label by field name (and "submit")
  defaultValues?: Partial<TValues>;            // shallow-merged over the built-in defaults
}
```

Example:

```ts
signupBlueprint({
  includeName: true,
  requireTerms: true,
  labels: { email: "Work email", submit: "Create account" },
  defaultValues: { marketingOptIn: true },
});
```

---

## Catalog

### Auth — `@fillament/blueprints/auth`

| Export | Optional fields | Notes |
| --- | --- | --- |
| `loginBlueprint(options?)` | `rememberMe`, `usernameOrEmail: "email" \| "username" \| "both"`, `forgotPassword` (metadata flag) | Password min length 8. |
| `signupBlueprint(options?)` | `includeName`, `requireTerms`, `confirmPassword`, `marketingOptIn` | Password min length 8. |
| `forgotPasswordBlueprint(options?)` | — | Single email field. |
| `resetPasswordBlueprint(options?)` | — | `password` + `passwordConfirm`. |
| `twoFactorBlueprint(options?)` | `digits` (default `6`) | Pattern-enforced numeric code. |

```ts
loginBlueprint({ rememberMe: true, forgotPassword: true, usernameOrEmail: "both" });
signupBlueprint({ includeName: true, confirmPassword: true, requireTerms: true });
twoFactorBlueprint({ digits: 6 });
```

### Contact — `@fillament/blueprints/contact`

| Export | Optional fields |
| --- | --- |
| `contactBlueprint(options?)` | `includeSubject` |
| `newsletterSignupBlueprint(options?)` | (none) |
| `waitlistBlueprint(options?)` | `includeName`, `includeCompany` |

### Survey — `@fillament/blueprints/survey`

| Export | Optional fields |
| --- | --- |
| `satisfactionSurveyBlueprint(options?)` | `scale` (default `5`), `includeComment`, `includeEaseOfUse`, `includeSupportRating`, `includeValueRating`, `includeRecommendation`, `includeMostUsedFeature` + `features`, `includeImprovements`, `includeFollowUp` |
| `npsSurveyBlueprint(options?)` | `includeReason` |
| `feedbackBlueprint(options?)` | `categories`, `includeEmail` |

```ts
satisfactionSurveyBlueprint({ scale: 10, includeMostUsedFeature: true });
npsSurveyBlueprint({ includeReason: true });
feedbackBlueprint({
  includeEmail: true,
  categories: [
    { label: "Bug report", value: "bug" },
    { label: "Feature request", value: "feature" },
  ],
});
```

### Commerce — `@fillament/blueprints/commerce`

| Export | Optional fields |
| --- | --- |
| `addressBlueprint(options?)` | `includePhone`, `countries` |
| `billingAddressBlueprint(options?)` | same as `addressBlueprint` (different `metadata.kind`) |
| `orderBlueprint(options?)` | `includeNotes`, `includePhone`, `includeCoupon`, `includeGiftWrap`, `requireTerms`, `countries`, `shippingMethods` |
| `subscriptionBlueprint(options?)` | `plans` |
| `quoteRequestBlueprint(options?)` | — |

```ts
addressBlueprint({
  includePhone: true,
  countries: [
    { label: "Portugal", value: "PT" },
    { label: "Spain", value: "ES" },
  ],
});

orderBlueprint({
  includeCoupon: true,
  requireTerms: true,
  shippingMethods: [
    { label: "Standard", value: "standard" },
    { label: "Express", value: "express" },
  ],
});
```

> **Commerce caution.** Raw card details (`cardNumber`, `cardCvc`, `cardExpiry`) are intentionally **not** in any commerce blueprint. Use a PCI-compliant provider — Stripe Elements, Paddle, Adyen, Braintree Hosted Fields — and mount those inputs as separate vendor-controlled iframes alongside your Fillament form. The card data never touches your form bus or your server. Each commerce blueprint exposes `metadata.paymentNote` reminding you of this.

### Onboarding — `@fillament/blueprints/onboarding`

| Export | Optional fields |
| --- | --- |
| `profileOnboardingBlueprint(options?)` | `includeCompany`, `includeTimezone`, `includeBio`, `roles` |
| `teamInviteBlueprint(options?)` | `defaultRole`, `maxInvites` |
| `workspaceSetupBlueprint(options?)` | `industries`, `sizes` |

`profileOnboardingBlueprint` includes a `metadata.steps` array describing a recommended two-step layout (`basics` → `details`).

`teamInviteBlueprint` uses an array shape — the invites list is in `defaultValues.invites` and `metadata.itemFields` describes the per-row field schema, suitable for `FieldArrayTable`.

---

## Rendering a blueprint

Blueprints are deliberately renderer-agnostic. A minimal React renderer using `@fillament/react`:

```tsx
import { Form, Field, useForm } from "@fillament/react";
import type { FillamentBlueprint } from "@fillament/blueprints";

function BlueprintForm<T>({ blueprint, onSubmit }: { blueprint: FillamentBlueprint<T>; onSubmit: (v: T) => void }) {
  const form = useForm<T>({ defaultValues: blueprint.defaultValues });
  return (
    <Form form={form} onSubmit={async (v) => onSubmit(v as T)}>
      {blueprint.schema.fields.map((f) => (
        <Field
          key={f.name}
          name={f.name}
          label={blueprint.labels?.[f.name] as string ?? f.name}
          type={f.type}
          options={f.options as any}
          required={f.required}
        />
      ))}
      <button type="submit">
        {(blueprint.labels?.submit as string) ?? "Submit"}
      </button>
    </Form>
  );
}
```

To wire i18n through the blueprint labels, resolve each label via `@fillament/i18n` before passing to `<Field>`:

```tsx
<Field label={i18n.t(blueprint.labels![f.name]!)} ... />
```

---

## Composing blueprints

Blueprints return plain JS objects — combine them:

```ts
const orderBp = orderBlueprint({ requireTerms: false });
const addressBp = addressBlueprint({ includePhone: true });

const checkout = {
  schema: {
    type: "object" as const,
    fields: [...orderBp.schema.fields, ...addressBp.schema.fields],
  },
  defaultValues: { ...orderBp.defaultValues, ...addressBp.defaultValues },
  labels: { ...orderBp.labels, ...addressBp.labels },
  metadata: { kind: "commerce.checkout" },
};
```

---

## Adapting to validation libraries

Blueprints don't ship Zod / Yup / JSON Schema instances — they describe **shape**, not validation. Build the validator from the blueprint metadata:

```ts
import { z } from "zod";

function blueprintToZod(bp: FillamentBlueprint<any>) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of bp.schema.fields) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "email": s = z.string().email(); break;
      case "number": s = z.number(); break;
      case "checkbox": s = z.boolean(); break;
      default: s = z.string();
    }
    if (f.minLength) s = (s as z.ZodString).min(f.minLength);
    if (!f.required) s = s.optional();
    shape[f.name] = s;
  }
  return z.object(shape);
}
```

---

## Types

```ts
type FillamentBlueprint<TValues>
type FillamentBlueprintStep
type BlueprintSchema
type BlueprintFieldSchema
type BlueprintFieldType
type BlueprintBaseOptions<TValues>
```

Plus per-blueprint option interfaces (`LoginBlueprintOptions`, `SignupBlueprintOptions`, `OrderBlueprintOptions`, …) — all exported from the relevant subpath.

---

## License

MIT © headlessButSmart
