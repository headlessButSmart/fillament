import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import * as yup from "yup";
import { Form, Field, useForm } from "@fillament/react";
import { yupAdapter } from "@fillament/yup";
import { FillamentDevTools } from "@fillament/devtools";

const Schema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  age: yup.number().min(18, "Must be 18+").required("Age is required"),
  password: yup
    .string()
    .min(8, "At least 8 characters")
    .required("Password is required"),
});

type Values = yup.InferType<typeof Schema>;

function YupDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const form = useForm<Values>({
    schema: yupAdapter(Schema),
    defaultValues: { email: "", age: 18, password: "" },
  });

  return (
    <div className="fl-demo">
      <h2>Yup validation</h2>
      <p className="subtitle">
        Drop a Yup schema in via <code>yupAdapter()</code>. Identical API to the
        Zod adapter — same error shape, same field-level validation behavior.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="email" label="Email" type="email" required />
        <Field name="age" label="Age" type="number" required />
        <Field name="password" label="Password" type="password" required />
        <button type="submit">Save</button>
      </Form>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta<typeof YupDemo> = {
  title: "Validation/Yup",
  component: YupDemo,
};
export default meta;
type Story = StoryObj<typeof YupDemo>;
export const Default: Story = {};
