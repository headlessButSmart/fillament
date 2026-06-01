import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { z } from "zod";
import {
  Field,
  FieldArrayTable,
  FieldsRenderer,
  Form,
  useForm,
  type FieldConfig,
} from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";

// ---- Variant A: standalone <FieldArrayTable> ----

const ContactsSchema = z.object({
  teamName: z.string().min(1, "Required"),
  contacts: z.array(
    z.object({
      name: z.string().min(1, "Required"),
      email: z.string().email("Invalid email"),
      role: z.enum(["dev", "pm", "designer"]),
      active: z.boolean().optional(),
    })
  ).min(1),
});
type ContactsValues = z.infer<typeof ContactsSchema>;

function ArrayAsTableDemo() {
  const [submitted, setSubmitted] = useState<ContactsValues | null>(null);
  const form = useForm<ContactsValues>({
    schema: zodAdapter(ContactsSchema),
    defaultValues: {
      teamName: "Acme team",
      contacts: [
        { name: "Ana López", email: "ana@acme.com", role: "dev", active: true },
        { name: "Ben Chen", email: "ben@acme.com", role: "pm", active: false },
      ],
    },
  });

  return (
    <div className="fl-demo" style={{ maxWidth: 760 }}>
      <h2>Array as table</h2>
      <p className="subtitle">
        <code>{`<FieldArrayTable>`}</code> renders each array item as a row, with
        per-column Field controls. Try reorder, remove, add, edit.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="teamName" label="Team name" required />
        <FieldArrayTable<{ name: string; email: string; role: string; active?: boolean }>
          name="contacts"
          columns={[
            { name: "name", label: "Name", width: 200, required: true },
            { name: "email", label: "Email", type: "email", required: true },
            {
              name: "role",
              label: "Role",
              width: 140,
              options: [
                { label: "Developer", value: "dev" },
                { label: "Designer", value: "designer" },
                { label: "PM", value: "pm" },
              ],
            },
            { name: "active", label: "Active", type: "checkbox", width: 70 },
          ]}
          newRow={() => ({ name: "", email: "", role: "dev", active: true })}
          addLabel="+ Add contact"
          minRows={1}
        />
        <button type="submit" style={{ marginTop: 16 }}>Save team</button>
      </Form>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

// ---- Variant B: same thing, declared as JSON via <FieldsRenderer> ----

const jsonConfig: FieldConfig[] = [
  { name: "projectName", type: "text", label: "Project name", required: true },
  {
    name: "milestones",
    type: "table",
    label: "Milestones",
    addLabel: "+ Add milestone",
    columns: [
      { name: "title", label: "Title", required: true, width: 220 },
      { name: "owner", label: "Owner", width: 160 },
      {
        name: "status",
        label: "Status",
        width: 140,
        options: [
          { label: "Planned", value: "planned" },
          { label: "In progress", value: "active" },
          { label: "Done", value: "done" },
        ],
      },
      { name: "dueDate", label: "Due", type: "date", width: 150 },
    ],
  },
];

function ArrayAsTableFromJsonDemo() {
  const [submitted, setSubmitted] = useState<unknown>(null);
  const form = useForm({
    defaultValues: {
      projectName: "Q1 Onboarding revamp",
      milestones: [
        { title: "Spec finalized", owner: "Ana", status: "done", dueDate: "2025-01-15" },
        { title: "Design ready", owner: "Mei", status: "active", dueDate: "2025-02-01" },
        { title: "Ship to staging", owner: "Ben", status: "planned", dueDate: "2025-02-20" },
      ],
    },
  });

  return (
    <div className="fl-demo" style={{ maxWidth: 760 }}>
      <h2>Array-as-table from JSON</h2>
      <p className="subtitle">
        Same layout but the entire form — including the table columns — is
        configured by a plain JSON array routed through{" "}
        <code>{`<FieldsRenderer>`}</code>.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <FieldsRenderer fields={jsonConfig} />
        <button type="submit" style={{ marginTop: 16 }}>Save</button>
      </Form>
      <details style={{ marginTop: 16 }}>
        <summary>Field config (JSON)</summary>
        <pre className="fl-output">{JSON.stringify(jsonConfig, null, 2)}</pre>
      </details>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta = { title: "Dynamic/Array as table" };
export default meta;

export const Standalone: StoryObj = { render: () => <ArrayAsTableDemo /> };
export const FromJson: StoryObj = { render: () => <ArrayAsTableFromJsonDemo /> };
