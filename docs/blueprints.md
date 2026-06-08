# `@fillament/blueprints`

Starter form blueprints for common flows — login, signup, contact, surveys, commerce, onboarding.

```bash
pnpm add @fillament/blueprints
```

Blueprints are **plain, composable data**. They are not locked-down UI components. Each returns a `{ schema, defaultValues, labels, metadata }` shape that you can pass into the host's form builder, your design-system renderer, or `FieldsRenderer`.

## Importing

```ts
import { loginBlueprint } from "@fillament/blueprints/auth";
import { addressBlueprint } from "@fillament/blueprints/commerce";
import { npsSurveyBlueprint } from "@fillament/blueprints/survey";
```

Or the flat barrel:

```ts
import { loginBlueprint, addressBlueprint } from "@fillament/blueprints";
```

## Returned shape

```ts
interface FillamentBlueprint<TValues> {
  schema: { type: "object"; fields: BlueprintFieldSchema[] };
  defaultValues: Partial<TValues>;
  labels?: Record<string, FillamentMessage>;
  metadata?: Record<string, unknown>;
  steps?: Array<{ id: string; title: string; fields: string[] }>;
}
```

## Override labels and defaults

```ts
const signup = signupBlueprint({
  includeName: true,
  requireTerms: true,
  labels: {
    email: "Work email",
    submit: "Create account",
  },
  defaultValues: {
    marketingOptIn: true,
  },
});
```

`labels` accepts a plain string or a `FillamentMessage` `{ key, fallback }` object so you can pipe everything through `@fillament/i18n`.

## Include / exclude optional fields

Each blueprint exposes booleans for opt-in fields:

```ts
loginBlueprint({ rememberMe: true, forgotPassword: true, usernameOrEmail: "both" });
signupBlueprint({ includeName: true, confirmPassword: true, requireTerms: true });
addressBlueprint({ includePhone: true });
satisfactionSurveyBlueprint({ scale: 10, includeComment: false });
```

## Commerce: payment fields are intentionally NOT raw card fields

`orderBlueprint`, `subscriptionBlueprint`, `addressBlueprint`, and `billingAddressBlueprint` deliberately do not include `cardNumber`, `cardCvc`, `cardCvv`, or `cardExpiry`. Collect payment details through a PCI-compliant provider:

- **Stripe** — Stripe Elements / Payment Element
- **Paddle** — Paddle.js or Paddle Checkout
- **Adyen** — Adyen Web Components
- **Braintree** — Hosted Fields

Mount those inputs as separate, vendor-controlled iframes alongside your Fillament form. The card data never touches your form bus or your server, and your form keeps inheriting the blueprint's metadata.

## Catalog

| Category | Exports |
| --- | --- |
| `auth` | `loginBlueprint`, `signupBlueprint`, `forgotPasswordBlueprint`, `resetPasswordBlueprint`, `twoFactorBlueprint` |
| `contact` | `contactBlueprint`, `newsletterSignupBlueprint`, `waitlistBlueprint` |
| `survey` | `satisfactionSurveyBlueprint`, `npsSurveyBlueprint`, `feedbackBlueprint` |
| `commerce` | `addressBlueprint`, `billingAddressBlueprint`, `orderBlueprint`, `subscriptionBlueprint`, `quoteRequestBlueprint` |
| `onboarding` | `profileOnboardingBlueprint`, `teamInviteBlueprint`, `workspaceSetupBlueprint` |
