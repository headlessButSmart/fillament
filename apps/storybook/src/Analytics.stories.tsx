import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { createAnalyticsPlugin, customAnalyticsAdapter } from "@fillament/analytics";
import type { AnalyticsEvent } from "@fillament/core";

const Schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  firstName: z.string().min(1, "Required"),
});
type Values = z.infer<typeof Schema>;

function AnalyticsDemo() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const pluginRef = useRef<ReturnType<typeof createAnalyticsPlugin> | null>(null);
  if (!pluginRef.current) {
    pluginRef.current = createAnalyticsPlugin({
      adapter: customAnalyticsAdapter((e) => setEvents((prev) => [e, ...prev].slice(0, 50))),
    });
  }

  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: { email: "", password: "", firstName: "" },
  });

  useEffect(() => pluginRef.current!.attach(form), [form]);

  return (
    <div className="fl-demo">
      <h2>Privacy-safe analytics</h2>
      <p className="subtitle">
        Field <code>password</code> and <code>email</code> are sensitive: their names are
        replaced with an alias hash. <strong>No values are ever sent.</strong>
      </p>
      <Form form={form} onSubmit={async () => {}}>
        <Field name="firstName" label="First name" required />
        <Field name="email" label="Email (sensitive)" type="email" required />
        <Field name="password" label="Password (sensitive)" type="password" required />
        <button type="submit">Submit</button>
      </Form>
      <div className="fl-output" style={{ maxHeight: 220, overflow: "auto" }}>
        {events.length === 0 ? "No events yet — interact with the form." : events.map((e, i) => (
          <div key={i}>
            {e.type} → field: {e.field ?? "(redacted)"} hash: {e.fieldHash ?? "—"}
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof AnalyticsDemo> = {
  title: "Plugins/Analytics",
  component: AnalyticsDemo,
};
export default meta;
type Story = StoryObj<typeof AnalyticsDemo>;
export const Default: Story = {};
