import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Form, Field, useForm } from "@fillament/react";
import { jsonSchemaAdapter, type JsonSchema } from "@fillament/json-schema";
import { FillamentDevTools } from "@fillament/devtools";

const schema: JsonSchema = {
  type: "object",
  required: ["email", "age"],
  properties: {
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 18, maximum: 120 },
    nickname: { type: "string", maxLength: 24 },
  },
};

function JsonSchemaDemo() {
  const [submitted, setSubmitted] = useState<unknown>(null);
  const form = useForm<{ email: string; age: number; nickname?: string }>({
    schema: jsonSchemaAdapter(schema),
    defaultValues: { email: "", age: 0, nickname: "" },
  });

  return (
    <div className="fl-demo">
      <h2>Plain JSON Schema</h2>
      <p className="subtitle">
        Pass a JSON Schema (Draft 2020-12 compatible) instead of Zod. Backed by
        AJV with <code>ajv-formats</code> for <code>format: "email"</code> etc.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="email" label="Email" type="email" required />
        <Field name="age" label="Age" type="number" required />
        <Field name="nickname" label="Nickname (optional)" />
        <button type="submit">Save</button>
      </Form>
      <pre className="fl-output">{JSON.stringify(schema, null, 2)}</pre>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta<typeof JsonSchemaDemo> = {
  title: "Validation/JSON Schema",
  component: JsonSchemaDemo,
};
export default meta;
type Story = StoryObj<typeof JsonSchemaDemo>;
export const Default: Story = {};
