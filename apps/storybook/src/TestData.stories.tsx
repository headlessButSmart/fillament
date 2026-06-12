import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";
import { fillFormWithTestData, generateTestValues } from "@fillament/test-data";
import { enableTestDataDevtools } from "@fillament/test-data/devtools";

const Schema = z.object({
  email: z.string().email("Enter a valid email"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  age: z.number().int().min(18, "Must be 18+").max(99),
  role: z.enum(["DEVELOPER", "DESIGNER", "MANAGER"]),
  website: z.string().url().optional(),
  bio: z.string().max(120).optional(),
  isSubscribed: z.boolean().optional(),
});
type Values = z.infer<typeof Schema>;

const DEFAULTS: Partial<Values> = {
  email: "",
  firstName: "",
  lastName: "",
  age: 0,
  role: "DEVELOPER",
  website: "",
  bio: "",
  isSubscribed: false,
};

/* ------------------------- DevTools button story ------------------------- */

function DevtoolsButtonDemo() {
  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: DEFAULTS,
  });

  // Register the 🎲 action for the lifetime of the story only.
  useEffect(() => enableTestDataDevtools(), []);

  return (
    <div className="fl-demo">
      <h2>Test data · DevTools button</h2>
      <p className="subtitle">
        <code>enableTestDataDevtools()</code> adds a <strong>🎲 Fill test data</strong> button to
        the DevTools toolbar (panel bottom-right, under the tabs). Click it — every field gets a
        realistic value derived from the Zod schema: a real-looking email, an age inside 18–99, a
        role picked from the enum. Validation runs immediately after.
      </p>
      <Form form={form} onSubmit={async (values) => alert("Submitted: " + JSON.stringify(values, null, 2))}>
        <Field name="email" label="Email" type="email" required />
        <Field name="firstName" label="First name" required />
        <Field name="lastName" label="Last name" required />
        <Field name="age" label="Age" type="number" required />
        <Field name="role" label="Role" options={[
          { label: "Developer", value: "DEVELOPER" },
          { label: "Designer", value: "DESIGNER" },
          { label: "Manager", value: "MANAGER" },
        ]} />
        <Field name="website" label="Website" />
        <Field name="bio" label="Bio (max 120 chars)" />
        <Field name="isSubscribed" label="Subscribe to newsletter" type="checkbox" />
        <button type="submit">Save</button>
      </Form>
      <FillamentDevTools form={form} initiallyOpen />
    </div>
  );
}

/* ------------------------- Programmatic fill story ------------------------ */

function ProgrammaticFillDemo() {
  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: DEFAULTS,
  });
  const [lastApplied, setLastApplied] = useState<string>("(nothing yet)");

  const fill = (options: Parameters<typeof fillFormWithTestData>[1]) => {
    const applied = fillFormWithTestData(form, options);
    setLastApplied(JSON.stringify(applied, null, 2));
  };

  return (
    <div className="fl-demo">
      <h2>Test data · Programmatic fill</h2>
      <p className="subtitle">
        The same call you would use in tests and stories. <strong>Seeded fills are
        deterministic</strong> — click "seed 42" twice and the values do not change.
        "Only empty" keeps anything you typed; "required only" skips optional fields.
        <code>overrides</code> pins exact paths.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={() => fill({})}>Fill (random)</button>
        <button type="button" onClick={() => fill({ seed: 42 })}>Fill (seed 42)</button>
        <button type="button" onClick={() => fill({ seed: 42, includeOptional: false })}>
          Fill (seed 42, required only)
        </button>
        <button type="button" onClick={() => fill({ onlyEmpty: true })}>Fill only empty</button>
        <button
          type="button"
          onClick={() => fill({ seed: 7, overrides: { email: "qa@test.dev", role: "MANAGER" } })}
        >
          Fill with overrides
        </button>
        <button type="button" onClick={() => form.reset()}>Reset</button>
      </div>
      <Form form={form} onSubmit={async (values) => alert("Submitted: " + JSON.stringify(values, null, 2))}>
        <Field name="email" label="Email" type="email" required />
        <Field name="firstName" label="First name" required />
        <Field name="lastName" label="Last name" required />
        <Field name="age" label="Age" type="number" required />
        <Field name="role" label="Role" options={[
          { label: "Developer", value: "DEVELOPER" },
          { label: "Designer", value: "DESIGNER" },
          { label: "Manager", value: "MANAGER" },
        ]} />
        <Field name="website" label="Website" />
        <Field name="bio" label="Bio (max 120 chars)" />
        <Field name="isSubscribed" label="Subscribe to newsletter" type="checkbox" />
        <button type="submit">Submit</button>
      </Form>
      <div className="fl-output" style={{ marginTop: 16 }}>
        <strong>Last applied values:</strong>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{lastApplied}</pre>
      </div>
    </div>
  );
}

/* --------------------------- Pure generator story -------------------------- */

const API_SCHEMA = {
  type: "object",
  required: ["id", "email", "status", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    status: { type: "string", enum: ["ACTIVE", "INACTIVE", "PENDING"] },
    createdAt: { description: "Unix epoch ms" },
    isVerified: { type: "boolean" },
    profile: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        city: { type: "string" },
        age: { type: "integer", minimum: 18, maximum: 80 },
      },
    },
    orders: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          total: { type: "number", minimum: 1, maximum: 500 },
          quantity: { type: "integer", minimum: 1, maximum: 5 },
        },
      },
    },
  },
};

function PureGeneratorDemo() {
  const [seed, setSeed] = useState(1);
  const generated = generateTestValues(API_SCHEMA, { seed });

  return (
    <div className="fl-demo">
      <h2>Test data · Pure generator (no form)</h2>
      <p className="subtitle">
        <code>generateTestValues(jsonSchema, {"{ seed }"})</code> works without a form — handy for
        API fixtures. Note the heuristics: <code>createdAt</code> has no type in the schema but
        gets epoch milliseconds from its <code>*At</code> suffix; <code>isVerified</code> gets a
        boolean from its <code>is*</code> prefix; <code>fullName</code> and <code>city</code> get
        realistic names.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <label>
          Seed:{" "}
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
            style={{ width: 90 }}
          />
        </label>
        <button type="button" onClick={() => setSeed((s) => s + 1)}>Next seed</button>
      </div>
      <div className="fl-output">
        <strong>generateTestValues(schema, {`{ seed: ${seed} }`})</strong>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(generated, null, 2)}</pre>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Optional Modules/Test data",
};
export default meta;

type Story = StoryObj;

export const DevtoolsButton: Story = {
  name: "DevTools 🎲 button",
  render: () => <DevtoolsButtonDemo />,
};
export const ProgrammaticFill: Story = {
  name: "Programmatic fill (seeded)",
  render: () => <ProgrammaticFillDemo />,
};
export const PureGenerator: Story = {
  name: "Pure generator (API fixtures)",
  render: () => <PureGeneratorDemo />,
};
