import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Form, Field, useForm } from "@fillament/react";
import { createValidationAdapter } from "@fillament/core";
import { FillamentDevTools } from "@fillament/devtools";

type Values = { username: string; confirmUsername: string; age: number };

// Variant A: inline `validate` option — quickest, Formik-style. Returns a
// flat `{ path: message }` map.
function InlineValidateDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const form = useForm<Values>({
    defaultValues: { username: "", confirmUsername: "", age: 18 },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.username) errors.username = "Username is required";
      else if (values.username.length < 3) errors.username = "At least 3 characters";
      if (values.confirmUsername !== values.username) {
        errors.confirmUsername = "Must match username";
      }
      if (values.age < 18) errors.age = "Must be 18 or older";
      return errors;
    },
  });

  return (
    <div className="fl-demo">
      <h2>Inline <code>validate</code> callback</h2>
      <p className="subtitle">
        Pass a Formik-style validate function — no schema library required.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="username" label="Username" required />
        <Field name="confirmUsername" label="Confirm username" required />
        <Field name="age" label="Age" type="number" required />
        <button type="submit">Save</button>
      </Form>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

// Variant B: a full custom adapter built with `createValidationAdapter`.
// Use this when you want richer error metadata (codes, types, sources).
const customAdapter = createValidationAdapter<Values>(async (values) => {
  const errors: Record<string, any[]> = {};
  if (!values.username) errors.username = [{ message: "Username is required", code: "required", type: "required", source: "client" }];
  if (values.confirmUsername !== values.username) {
    errors.confirmUsername = [{ message: "Must match", code: "mismatch", type: "custom", source: "client" }];
  }
  return { valid: Object.keys(errors).length === 0, errors };
}, { type: "username-check" });

function CustomAdapterDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const form = useForm<Values>({
    schema: customAdapter,
    defaultValues: { username: "", confirmUsername: "", age: 21 },
  });

  return (
    <div className="fl-demo">
      <h2>Custom <code>ValidationAdapter</code></h2>
      <p className="subtitle">
        Build your own adapter for richer error codes, server checks, or
        domain-specific rules.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="username" label="Username" required />
        <Field name="confirmUsername" label="Confirm username" required />
        <Field name="age" label="Age" type="number" />
        <button type="submit">Save</button>
      </Form>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta = { title: "Validation/Custom validation" };
export default meta;

export const InlineValidate: StoryObj = { render: () => <InlineValidateDemo /> };
export const CustomAdapter: StoryObj = { render: () => <CustomAdapterDemo /> };
