import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { z } from "zod";
import { Field, Form, FieldArrayTable, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentAI } from "@fillament/ai";
import { FillamentDevTools } from "@fillament/devtools";

const ProfileSchema = z.object({
  fullName: z.string().min(1, "Required"),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["dev", "designer", "pm", "other"]),
  city: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  bio: z.string().optional(),
  password: z.string().optional(), // intentionally present to demo redaction
  contacts: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
});
type ProfileValues = z.infer<typeof ProfileSchema>;

function AIAssistDemo({
  model,
  position,
  enabled,
  temperature,
  autoConstrainOutput,
}: {
  model: string;
  position: "bottom-right" | "bottom-left" | "top-right";
  enabled: boolean;
  temperature: number;
  autoConstrainOutput: boolean;
}) {
  const [submitted, setSubmitted] = useState<ProfileValues | null>(null);
  const form = useForm<ProfileValues>({
    schema: zodAdapter(ProfileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "dev",
      city: "",
      yearsOfExperience: 0,
      bio: "",
      password: "",
      contacts: [{ label: "GitHub", value: "" }],
    },
  });

  return (
    <div className="fl-demo" style={{ maxWidth: 640 }}>
      <h2>AI-assisted form fill</h2>
      <p className="subtitle">
        Click the <strong>AI assist</strong> button in the corner, describe the
        user in plain language, review the proposed JSON patch, then apply. The
        model runs <em>entirely in your browser</em> via WebLLM (WebGPU required).
        The <code>password</code> field's current value is redacted before being
        sent to the model.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="fullName" label="Full name" required />
        <Field name="email" label="Email" type="email" />
        <Field
          name="role"
          label="Role"
          options={[
            { label: "Developer", value: "dev" },
            { label: "Designer", value: "designer" },
            { label: "Product Manager", value: "pm" },
            { label: "Other", value: "other" },
          ]}
        />
        <Field name="city" label="City" />
        <Field name="yearsOfExperience" label="Years of experience" type="number" />
        <Field name="bio" label="Short bio" type="textarea" />
        <Field name="password" label="Password (never sent to AI)" type="password" />
        <FieldArrayTable<{ label: string; value: string }>
          name="contacts"
          columns={[
            { name: "label", label: "Label", width: 140 },
            { name: "value", label: "Value" },
          ]}
          addLabel="+ Add contact"
          newRow={() => ({ label: "", value: "" })}
        />
        <button type="submit" style={{ marginTop: 16 }}>Save profile</button>
      </Form>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}

      <FillamentAI
        form={form}
        enabled={enabled}
        position={position}
        model={model}
        modelParams={{ temperature, max_tokens: 512 }}
        schemaForAI={{ type: "zod", schema: ProfileSchema }}
        autoConstrainOutput={autoConstrainOutput}
        redact={["password"]}
      />
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta<typeof AIAssistDemo> = {
  title: "AI/AI assist (WebLLM)",
  component: AIAssistDemo,
  args: {
    enabled: true,
    model: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    position: "bottom-left",
    temperature: 0.4,
    autoConstrainOutput: false,
  },
  argTypes: {
    model: {
      control: "select",
      options: [
        "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        "Llama-3.2-3B-Instruct-q4f32_1-MLC",
        "Phi-3.5-mini-instruct-q4f16_1-MLC",
        "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      ],
    },
    position: { control: "select", options: ["bottom-right", "bottom-left", "top-right"] },
    temperature: { control: { type: "range", min: 0, max: 1.5, step: 0.1 } },
    autoConstrainOutput: {
      control: "boolean",
      description:
        "Use schemaForAI as a JSON Schema grammar constraint. Slightly slower per token but guarantees parseable JSON.",
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
**Requires WebGPU** (Chrome 113+ / Edge 113+ on a recent GPU). The first
request downloads the model weights (~1–3 GB depending on selection) and
caches them in IndexedDB — subsequent loads are fast. If your browser
doesn't support WebGPU, the panel will display the error returned by
WebLLM.
        `.trim(),
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof AIAssistDemo>;
export const Default: Story = {};
