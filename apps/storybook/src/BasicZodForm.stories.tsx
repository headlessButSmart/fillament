import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";

const UserSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type UserValues = z.infer<typeof UserSchema>;

function UserForm({ withDevTools }: { withDevTools?: boolean }) {
  const [submitted, setSubmitted] = useState<UserValues | null>(null);
  const form = useForm<UserValues>({
    schema: zodAdapter(UserSchema),
    defaultValues: { email: "", firstName: "", lastName: "" },
  });

  return (
    <div className="fl-demo">
      <h2>Basic Zod form</h2>
      <p className="subtitle">Type-safe field paths inferred from a Zod schema.</p>
      <Form form={form} onSubmit={async (values) => setSubmitted(values)}>
        <Field name="email" label="Email" type="email" required />
        <Field name="firstName" label="First name" required />
        <Field name="lastName" label="Last name" required />
        <button type="submit">Save</button>
      </Form>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      {withDevTools ? <FillamentDevTools form={form} /> : null}
    </div>
  );
}

const meta: Meta<typeof UserForm> = {
  title: "Forms/Basic Zod form",
  component: UserForm,
};
export default meta;

type Story = StoryObj<typeof UserForm>;

export const Default: Story = {
  args: { withDevTools: false },
};

export const WithDevTools: Story = {
  args: { withDevTools: true },
};
