import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Form, Field, useForm } from "@fillament/react";
import {
  loginBlueprint,
  signupBlueprint,
  forgotPasswordBlueprint,
  twoFactorBlueprint,
} from "@fillament/blueprints/auth";
import {
  addressBlueprint,
  orderBlueprint,
  subscriptionBlueprint,
} from "@fillament/blueprints/commerce";
import {
  satisfactionSurveyBlueprint,
  npsSurveyBlueprint,
  feedbackBlueprint,
} from "@fillament/blueprints/survey";
import {
  contactBlueprint,
  newsletterSignupBlueprint,
} from "@fillament/blueprints/contact";
import {
  profileOnboardingBlueprint,
  workspaceSetupBlueprint,
} from "@fillament/blueprints/onboarding";
import type { FillamentBlueprint, BlueprintFieldSchema } from "@fillament/blueprints";

function messageToString(msg: unknown): string | undefined {
  if (typeof msg === "string") return msg;
  if (msg && typeof msg === "object" && "fallback" in (msg as any) && typeof (msg as any).fallback === "string") {
    return (msg as any).fallback;
  }
  return undefined;
}

function renderField(field: BlueprintFieldSchema, labels?: Record<string, unknown>) {
  const label =
    messageToString(labels?.[field.name]) ??
    messageToString(field.label) ??
    field.name;

  // Select: use Field's native `options` prop — it renders a styled <select>
  // with the same label treatment as text inputs.
  if (field.type === "select" && field.options) {
    const options = field.options.map((opt) => ({
      label: messageToString(opt.label) ?? String(opt.value),
      value: opt.value,
    }));
    return (
      <Field
        key={field.name}
        name={field.name}
        label={label}
        options={options}
        required={field.required}
      />
    );
  }

  return (
    <Field
      key={field.name}
      name={field.name}
      label={label}
      type={field.type === "checkbox" ? "checkbox" : field.type === "textarea" ? "textarea" : field.type}
      required={field.required}
    />
  );
}

function BlueprintForm({ blueprint, title }: { blueprint: FillamentBlueprint<any>; title: string }) {
  const form = useForm<any>({ defaultValues: blueprint.defaultValues });
  const [submitted, setSubmitted] = useState<any>(null);
  const submitLabel =
    typeof blueprint.labels?.submit === "string" ? (blueprint.labels.submit as string) : "Submit";
  return (
    <div className="fl-demo">
      <h2>{title}</h2>
      <p className="subtitle">Schema, defaults, and labels come from <code>@fillament/blueprints</code>.</p>
      <Form form={form} onSubmit={async (values) => setSubmitted(values)}>
        {blueprint.schema.fields.map((f) => renderField(f, blueprint.labels as any))}
        <button type="submit">{submitLabel}</button>
      </Form>
      {submitted && (
        <div className="fl-output">
          Submitted: <pre>{JSON.stringify(submitted, null, 2)}</pre>
        </div>
      )}
      <details style={{ marginTop: 16 }}>
        <summary>Blueprint shape</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(blueprint, null, 2)}</pre>
      </details>
    </div>
  );
}

const meta: Meta = {
  title: "Optional Modules/Blueprints",
};
export default meta;

type Story = StoryObj;

export const Login: Story = {
  render: () => (
    <BlueprintForm
      title="Login blueprint"
      blueprint={loginBlueprint({ rememberMe: true, forgotPassword: true })}
    />
  ),
};

export const Signup: Story = {
  render: () => (
    <BlueprintForm
      title="Signup blueprint"
      blueprint={signupBlueprint({
        includeName: true,
        confirmPassword: true,
        requireTerms: true,
        marketingOptIn: true,
      })}
    />
  ),
};

export const OrderForm: Story = {
  render: () => (
    <BlueprintForm
      title="Order blueprint (no raw card fields)"
      blueprint={orderBlueprint({ includeNotes: true })}
    />
  ),
};

export const SatisfactionSurvey: Story = {
  render: () => (
    <BlueprintForm
      title="Satisfaction survey"
      blueprint={satisfactionSurveyBlueprint({ scale: 5 })}
    />
  ),
};

export const ForgotPassword: Story = {
  render: () => (
    <BlueprintForm
      title="Forgot password"
      blueprint={forgotPasswordBlueprint()}
    />
  ),
};

export const TwoFactor: Story = {
  render: () => (
    <BlueprintForm
      title="Two-factor verification"
      blueprint={twoFactorBlueprint({ digits: 6 })}
    />
  ),
};

export const Contact: Story = {
  render: () => (
    <BlueprintForm
      title="Contact form"
      blueprint={contactBlueprint({ includeSubject: true })}
    />
  ),
};

export const NewsletterSignup: Story = {
  render: () => (
    <BlueprintForm
      title="Newsletter signup"
      blueprint={newsletterSignupBlueprint()}
    />
  ),
};

export const NpsSurvey: Story = {
  render: () => (
    <BlueprintForm
      title="NPS survey (0–10)"
      blueprint={npsSurveyBlueprint({ includeReason: true })}
    />
  ),
};

export const Feedback: Story = {
  render: () => (
    <BlueprintForm
      title="Feedback (categorized)"
      blueprint={feedbackBlueprint({ includeEmail: true })}
    />
  ),
};

export const Address: Story = {
  render: () => (
    <BlueprintForm
      title="Shipping address (no card fields)"
      blueprint={addressBlueprint({
        includePhone: true,
        countries: [
          { label: "Portugal", value: "PT" },
          { label: "Spain", value: "ES" },
          { label: "France", value: "FR" },
        ],
      })}
    />
  ),
};

export const Subscription: Story = {
  render: () => (
    <BlueprintForm
      title="Subscription (Stripe-compatible — no card fields here)"
      blueprint={subscriptionBlueprint()}
    />
  ),
};

export const ProfileOnboarding: Story = {
  render: () => (
    <BlueprintForm
      title="Profile onboarding"
      blueprint={profileOnboardingBlueprint({
        includeCompany: true,
        includeTimezone: true,
        includeBio: true,
      })}
    />
  ),
};

export const WorkspaceSetup: Story = {
  render: () => (
    <BlueprintForm
      title="Workspace setup"
      blueprint={workspaceSetupBlueprint()}
    />
  ),
};
