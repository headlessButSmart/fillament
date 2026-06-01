import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { z } from "zod";
import { Form, Field, useForm, useWatch } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";

const Schema = z.object({
  accountType: z.enum(["personal", "business"]),
  fullName: z.string().min(1, "Full name is required"),
  hasCompany: z.boolean().optional(),
  company: z
    .object({
      name: z.string().optional(),
      taxId: z.string().optional(),
    })
    .optional(),
});

type Values = z.infer<typeof Schema>;

function AccountTypeSelect({ field }: { field: any }) {
  return (
    <select
      name={field.name}
      value={field.value ?? ""}
      onChange={field.onChange}
      onBlur={field.onBlur}
    >
      <option value="">Choose…</option>
      <option value="personal">Personal</option>
      <option value="business">Business</option>
    </select>
  );
}

function ConditionalDemo({ behavior }: { behavior: "preserve" | "clear" | "clear-and-unvalidate" }) {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: { accountType: "personal", fullName: "", hasCompany: false, company: { name: "", taxId: "" } },
  });
  const accountType = useWatch<string>("accountType", form);

  return (
    <div className="fl-demo">
      <h2>Conditional fields</h2>
      <p className="subtitle">
        <code>visibleWhen</code> with <code>unmountBehavior="{behavior}"</code>.
        Try filling the company fields, then switch to Personal and back.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="fullName" label="Full name" required />
        <div data-fillament-field>
          <label data-fillament-label htmlFor="accountType">Account type</label>
          <Field name="accountType">
            {(f) => <AccountTypeSelect field={f} />}
          </Field>
        </div>
        <Field
          name="company.name"
          label="Company name"
          visibleWhen="accountType === 'business'"
          unmountBehavior={behavior}
        />
        <Field
          name="company.taxId"
          label="Tax ID"
          visibleWhen={({ values }) => values.accountType === "business"}
          unmountBehavior={behavior}
        />
        <button type="submit">Save</button>
      </Form>
      <div className="fl-output">accountType = {String(accountType)}</div>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta<typeof ConditionalDemo> = {
  title: "Forms/Conditional fields",
  component: ConditionalDemo,
};
export default meta;
type Story = StoryObj<typeof ConditionalDemo>;

export const Preserve: Story = { args: { behavior: "preserve" } };
export const Clear: Story = { args: { behavior: "clear" } };
export const ClearAndUnvalidate: Story = { args: { behavior: "clear-and-unvalidate" } };
