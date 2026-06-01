import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useRef } from "react";
import { Form, Field, useForm } from "@fillament/react";
import { FillamentDevTools } from "@fillament/devtools";

function TrackedField({ name }: { name: string }) {
  const renders = useRef(0);
  renders.current += 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Field name={name} label={name} />
      <span style={{ fontSize: 11, color: "var(--fl-muted)" }}>{renders.current} renders</span>
    </div>
  );
}

function PerformanceDemo({ count }: { count: number }) {
  const defaultValues = useMemo(() => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < count; i++) obj[`field_${i}`] = "";
    return obj;
  }, [count]);

  const form = useForm<Record<string, string>>({ defaultValues });

  return (
    <div className="fl-demo" style={{ maxWidth: 720 }}>
      <h2>Performance: {count}-field form</h2>
      <p className="subtitle">
        Typing in one field re-renders only that field. The numbers next to
        each input are React render counts.
      </p>
      <Form form={form} onSubmit={async () => {}}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Array.from({ length: count }, (_, i) => (
            <TrackedField key={i} name={`field_${i}`} />
          ))}
        </div>
        <button type="submit" style={{ marginTop: 12 }}>Submit</button>
      </Form>
      <FillamentDevTools form={form} initiallyOpen={false} />
    </div>
  );
}

const meta: Meta<typeof PerformanceDemo> = {
  title: "Performance/Render isolation",
  component: PerformanceDemo,
};
export default meta;
type Story = StoryObj<typeof PerformanceDemo>;

export const TenFields: Story = { args: { count: 10 } };
export const HundredFields: Story = { args: { count: 100 } };
export const FiveHundredFields: Story = { args: { count: 500 } };
