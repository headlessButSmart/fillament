import type { Meta, StoryObj } from "@storybook/react";
import { type CSSProperties, type ReactNode, useState } from "react";
import { z } from "zod";
import { Form, Field, FormProvider, createFormUI, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import type { FieldRenderProps } from "@fillament/react";

// Pretend this came from a design system.

function PillTextInput({
  field,
  label,
  description,
  placeholder,
}: {
  field: FieldRenderProps<any>;
  label?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
}) {
  const style: CSSProperties = {
    border: "1px solid #c7d2fe",
    background: field.invalid ? "#fef2f2" : "#eef2ff",
    borderRadius: 999,
    padding: "8px 14px",
    width: "100%",
  };
  return (
    <div data-fillament-field={field.name} data-fillament-invalid={field.invalid || undefined}>
      {label ? <label data-fillament-label htmlFor={field.name}>{label}</label> : null}
      <input
        id={field.name}
        name={field.name}
        value={(field.value ?? "") as any}
        onChange={field.onChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        style={style}
      />
      {description ? <div data-fillament-description>{description}</div> : null}
      {field.invalid ? <div data-fillament-error>{field.error?.message}</div> : null}
    </div>
  );
}

function PillSelect({
  field,
  label,
  options,
}: {
  field: FieldRenderProps<any>;
  label?: ReactNode;
  options: { label: string; value: string }[];
}) {
  return (
    <div data-fillament-field={field.name} data-fillament-invalid={field.invalid || undefined}>
      {label ? <label data-fillament-label htmlFor={field.name}>{label}</label> : null}
      <select
        id={field.name}
        name={field.name}
        value={(field.value ?? "") as any}
        onChange={field.onChange}
        onBlur={field.onBlur}
        style={{ borderRadius: 999, padding: "8px 14px" }}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {field.invalid ? <div data-fillament-error>{field.error?.message}</div> : null}
    </div>
  );
}

const Schema = z.object({
  fullName: z.string().min(1, "Required"),
  role: z.enum(["dev", "designer", "pm"], { errorMap: () => ({ message: "Pick a role" }) }),
});
type Values = z.infer<typeof Schema>;

const ui = createFormUI({
  TextInput: PillTextInput,
  Select: (props: any) => (
    <PillSelect
      {...props}
      options={[
        { label: "Developer", value: "dev" },
        { label: "Designer", value: "designer" },
        { label: "Product Manager", value: "pm" },
      ]}
    />
  ),
});

function DesignSystemDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: { fullName: "", role: "dev" },
  });

  return (
    <div className="fl-demo">
      <h2>Design-system adapter</h2>
      <p className="subtitle">Register your UI components once via <code>createFormUI</code>.</p>
      <FormProvider form={form} components={ui}>
        <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
          <Field name="fullName" label="Full name" as="TextInput" required />
          <Field name="role" label="Role" as="Select" required />
          <button type="submit">Save</button>
        </Form>
      </FormProvider>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
    </div>
  );
}

const meta: Meta<typeof DesignSystemDemo> = {
  title: "Forms/Design-system adapter",
  component: DesignSystemDemo,
};
export default meta;
type Story = StoryObj<typeof DesignSystemDemo>;
export const Default: Story = {};
