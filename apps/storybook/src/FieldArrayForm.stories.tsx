import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { z } from "zod";
import { Form, Field, FieldArray, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";

const Schema = z.object({
  teamName: z.string().min(1, "Team name is required"),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Enter a valid email"),
      })
    )
    .min(1, "Add at least one contact"),
});

type Values = z.infer<typeof Schema>;

function FieldArrayDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: {
      teamName: "Acme team",
      contacts: [{ name: "Ana", email: "ana@acme.com" }],
    },
  });

  return (
    <div className="fl-demo">
      <h2>Field array</h2>
      <p className="subtitle">
        Stable per-row keys: reorder rows and notice that field state follows
        the row, not the index.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="teamName" label="Team name" required />
        <FieldArray<{ name: string; email: string }> name="contacts">
          {(arr) => (
            <>
              {arr.items.map((c) => (
                <div key={c.key} className="fl-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong>Contact #{c.index + 1}</strong>
                    <span style={{ fontSize: 11, color: "var(--fl-muted)" }}>key: {c.key}</span>
                  </div>
                  <div className="fl-row">
                    <Field name={c.path("name")} label="Name" />
                    <Field name={c.path("email")} label="Email" type="email" />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button type="button" className="fl-ghost" onClick={() => arr.move(c.index, Math.max(0, c.index - 1))}>↑</button>
                    <button type="button" className="fl-ghost" onClick={() => arr.move(c.index, Math.min(arr.length - 1, c.index + 1))}>↓</button>
                    <button type="button" className="fl-danger" onClick={() => arr.remove(c.index)}>Remove</button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="fl-ghost"
                onClick={() => arr.append({ name: "", email: "" })}
              >
                + Add contact
              </button>
            </>
          )}
        </FieldArray>
        <div style={{ marginTop: 16 }}>
          <button type="submit">Save team</button>
        </div>
      </Form>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta<typeof FieldArrayDemo> = {
  title: "Forms/Field array",
  component: FieldArrayDemo,
};
export default meta;
type Story = StoryObj<typeof FieldArrayDemo>;
export const Default: Story = {};
