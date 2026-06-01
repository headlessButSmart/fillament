import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Form, Field, useForm, createComponentAdapter } from "@fillament/react";

// Simulate a 3rd-party input that uses unusual prop names.
function FancyInput(props: { label?: string; nativeValue?: string; onValueChange?: (v: string) => void; onBlur?: () => void }) {
  return (
    <div data-fillament-field>
      {props.label ? <label data-fillament-label>{props.label}</label> : null}
      <input
        value={props.nativeValue ?? ""}
        onChange={(e) => props.onValueChange?.(e.target.value)}
        onBlur={props.onBlur}
      />
    </div>
  );
}

const FancyAdapter = createComponentAdapter({
  component: FancyInput,
  valueProp: "nativeValue",
  changeProp: "onValueChange",
  extractValue: (v) => v as string,
});

function AdapterDemo() {
  const [submitted, setSubmitted] = useState<any>(null);
  const form = useForm<{ name: string }>({ defaultValues: { name: "" } });
  return (
    <div className="fl-demo">
      <h2>Component adapter</h2>
      <p className="subtitle">
        Wrap a 3rd-party input using <code>createComponentAdapter</code>.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="name" as={FancyAdapter} label="Name" />
        <button type="submit">Save</button>
      </Form>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
    </div>
  );
}

const meta: Meta<typeof AdapterDemo> = {
  title: "Forms/Component adapter",
  component: AdapterDemo,
};
export default meta;
type Story = StoryObj<typeof AdapterDemo>;
export const Default: Story = {};
