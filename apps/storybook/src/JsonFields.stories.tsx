import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Form, FieldsRenderer, useForm, type FieldConfig } from "@fillament/react";
import { jsonSchemaAdapter } from "@fillament/json-schema";
import { FillamentDevTools } from "@fillament/devtools";

// Imagine this fields config came from /api/forms/onboarding.json or a CMS.
const fieldsConfig: FieldConfig[] = [
  { name: "fullName", type: "text", label: "Full name", required: true, placeholder: "Ana López" },
  { name: "email", type: "email", label: "Email", required: true },
  {
    name: "accountType",
    type: "select",
    label: "Account type",
    required: true,
    options: [
      { label: "Personal", value: "personal" },
      { label: "Business", value: "business" },
    ],
  },
  {
    name: "company",
    type: "group",
    label: "Company details",
    visibleWhen: "accountType === 'business'",
    fields: [
      { name: "name", type: "text", label: "Company name", required: true },
      { name: "size", type: "select", label: "Team size", options: [
        { label: "1–10", value: "small" },
        { label: "11–100", value: "medium" },
        { label: "100+", value: "large" },
      ] },
    ],
  },
  { name: "newsletter", type: "checkbox", label: "Subscribe to newsletter" },
  { name: "notes", type: "textarea", label: "Anything else?" },
  {
    name: "contacts",
    type: "array",
    label: "Team contacts",
    addLabel: "+ Add contact",
    removeLabel: "Remove",
    itemFields: [
      { name: "name", label: "Name" },
      { name: "email", label: "Email", type: "email" },
    ],
  },
];

// And the matching JSON Schema for validation.
const validationSchema = {
  type: "object",
  required: ["fullName", "email", "accountType"],
  properties: {
    fullName: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    accountType: { enum: ["personal", "business"] },
    company: {
      type: "object",
      properties: {
        name: { type: "string" },
        size: { type: "string" },
      },
    },
    newsletter: { type: "boolean" },
    notes: { type: "string" },
    contacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          email: { type: "string", format: "email" },
        },
      },
    },
  },
};

function JsonFieldsDemo() {
  const [submitted, setSubmitted] = useState<unknown>(null);
  const form = useForm({
    schema: jsonSchemaAdapter(validationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      accountType: "personal",
      company: { name: "", size: "small" },
      newsletter: false,
      notes: "",
      contacts: [{ name: "", email: "" }],
    },
  });

  return (
    <div className="fl-demo">
      <h2>JSON-driven field list</h2>
      <p className="subtitle">
        Both the field layout AND the validation schema are plain JSON. Useful
        when forms are configured by non-engineers, loaded from a CMS, or
        defined per-tenant.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <FieldsRenderer fields={fieldsConfig} />
        <div style={{ marginTop: 16 }}>
          <button type="submit">Save</button>
        </div>
      </Form>
      <details style={{ marginTop: 16 }}>
        <summary>Field config (JSON)</summary>
        <pre className="fl-output">{JSON.stringify(fieldsConfig, null, 2)}</pre>
      </details>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta<typeof JsonFieldsDemo> = {
  title: "Dynamic/JSON-driven fields",
  component: JsonFieldsDemo,
};
export default meta;
type Story = StoryObj<typeof JsonFieldsDemo>;
export const Default: Story = {};
