import type { Meta, StoryObj } from "@storybook/react";
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";

const Schema = z.object({
  email: z.string().email(),
  age: z.number().min(18, "Must be 18+"),
  newsletter: z.boolean().optional(),
});
type Values = z.infer<typeof Schema>;

function DevToolsDemo() {
  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: { email: "", age: 0, newsletter: false },
  });

  return (
    <div className="fl-demo">
      <h2>DevTools panel</h2>
      <p className="subtitle">
        Open the floating panel in the bottom-right to inspect values, fields,
        errors, validation timing, render counts, analytics, and devtools events.
      </p>
      <Form form={form} onSubmit={async () => {}}>
        <Field name="email" label="Email" type="email" required />
        <Field name="age" label="Age" type="number" required />
        <Field name="newsletter" label="Subscribe to newsletter" type="checkbox" />
        <button type="submit">Save</button>
      </Form>
      <FillamentDevTools form={form} initiallyOpen />
    </div>
  );
}

const meta: Meta<typeof DevToolsDemo> = {
  title: "Plugins/DevTools",
  component: DevToolsDemo,
};
export default meta;
type Story = StoryObj<typeof DevToolsDemo>;
export const Default: Story = {};
