import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { z } from "zod";
import { Form, Field, useForm, useFormValues } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";

const Schema = z.object({
  account: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  profile: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.enum(["dev", "designer", "pm"]),
  }),
  preferences: z.object({
    newsletter: z.boolean().optional(),
    contactMethod: z.enum(["email", "phone"]).optional(),
  }),
});
type Values = z.infer<typeof Schema>;

const STEPS: Array<{
  title: string;
  fields: ReadonlyArray<string>;
  step: keyof Values;
}> = [
  { title: "Account", fields: ["account.email", "account.password"], step: "account" },
  { title: "Profile", fields: ["profile.firstName", "profile.lastName", "profile.role"], step: "profile" },
  { title: "Preferences", fields: ["preferences.newsletter", "preferences.contactMethod"], step: "preferences" },
];

function WizardDemo() {
  const [stepIndex, setStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: {
      account: { email: "", password: "" },
      profile: { firstName: "", lastName: "", role: "dev" },
      preferences: { newsletter: false, contactMethod: "email" },
    },
    preserveUnmountedFields: true,
  });
  const values = useFormValues(form);

  const step = STEPS[stepIndex]!;
  const last = stepIndex === STEPS.length - 1;

  const goNext = async () => {
    // Validate just the current step's fields
    const results = await Promise.all(step.fields.map((f) => form.validateField(f)));
    const hasErrors = results.some((r) => r.length > 0);
    if (!hasErrors) setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  return (
    <div className="fl-demo">
      <h2>Wizard form</h2>
      <p className="subtitle">
        Step values are preserved when the step unmounts — try moving back
        and forth.
      </p>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="fl-chip"
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: i === stepIndex ? "var(--fl-accent)" : "#e2e8f0",
              color: i === stepIndex ? "white" : "#0f172a",
              fontSize: 12,
            }}
          >
            {i + 1}. {s.title}
          </div>
        ))}
      </div>
      <Form
        form={form}
        onSubmit={async (v) => setSubmitted(v)}
      >
        {stepIndex === 0 && (
          <>
            <Field name="account.email" label="Email" type="email" required />
            <Field name="account.password" label="Password" type="password" required />
          </>
        )}
        {stepIndex === 1 && (
          <>
            <Field name="profile.firstName" label="First name" required />
            <Field name="profile.lastName" label="Last name" required />
            <Field name="profile.role">
              {(f) => (
                <div data-fillament-field>
                  <label data-fillament-label htmlFor={f.name}>Role</label>
                  <select id={f.name} value={f.value ?? ""} onChange={f.onChange} onBlur={f.onBlur}>
                    <option value="dev">Developer</option>
                    <option value="designer">Designer</option>
                    <option value="pm">PM</option>
                  </select>
                </div>
              )}
            </Field>
          </>
        )}
        {stepIndex === 2 && (
          <>
            <Field name="preferences.newsletter" label="Subscribe to newsletter" type="checkbox" />
            <Field name="preferences.contactMethod">
              {(f) => (
                <div data-fillament-field>
                  <label data-fillament-label htmlFor={f.name}>Contact method</label>
                  <select id={f.name} value={f.value ?? ""} onChange={f.onChange} onBlur={f.onBlur}>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
              )}
            </Field>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button
            type="button"
            className="fl-ghost"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          {last ? (
            <button type="submit">Finish</button>
          ) : (
            <button type="button" className="fl-primary" onClick={goNext}>
              Next
            </button>
          )}
        </div>
      </Form>
      <div className="fl-output">Current step values: {JSON.stringify((values as any)[step.step], null, 2)}</div>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta<typeof WizardDemo> = {
  title: "Forms/Wizard",
  component: WizardDemo,
};
export default meta;
type Story = StoryObj<typeof WizardDemo>;
export const Default: Story = {};
