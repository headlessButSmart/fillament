import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";
import type { FormError, ValidationAdapter, ValidationResult } from "@fillament/core";

const SignupSchema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(8, "At least 8 characters"),
});
type Values = z.infer<typeof SignupSchema>;

// A fake username lookup; "taken" is unavailable.
async function lookupUsername(name: string, signal: AbortSignal): Promise<boolean> {
  await new Promise((resolve, reject) => {
    const t = setTimeout(resolve, 500);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
  return name.toLowerCase() !== "taken";
}

// Combine the Zod schema with an async server-validation step.
function makeAdapter(): ValidationAdapter<Values> {
  const zod = zodAdapter(SignupSchema);
  return {
    type: "zod+server",
    async validate(values): Promise<ValidationResult<Values>> {
      const result = await zod.validate(values);
      // Only check username availability when local validation is clean.
      if (result.valid && values.username) {
        const controller = new AbortController();
        try {
          const ok = await lookupUsername(values.username, controller.signal);
          if (!ok) {
            const err: FormError = {
              message: "Username is already taken",
              type: "server",
              code: "username_taken",
              path: "username",
              source: "server",
            };
            return { valid: false, errors: { username: [err] } };
          }
        } catch {
          // ignored on abort
        }
      }
      return result;
    },
    validateField: zod.validateField,
  };
}

function ServerValidationDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const [lookupCount, setLookupCount] = useState(0);
  const adapterRef = useRef<ValidationAdapter<Values> | null>(null);
  if (!adapterRef.current) adapterRef.current = makeAdapter();

  const form = useForm<Values>({
    schema: adapterRef.current,
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    return form.subscribeDevtools((e) => {
      if (e.type === "validation:start") setLookupCount((c) => c + 1);
    });
  }, [form]);

  return (
    <div className="fl-demo">
      <h2>Server validation</h2>
      <p className="subtitle">
        Try the username <code>taken</code> — the server rejects it. Stale
        responses are dropped via <code>AbortController</code>.
      </p>
      <Form form={form} onSubmit={async (v) => setSubmitted(v)}>
        <Field name="username" label="Username" description="Try: taken" required />
        <Field name="password" label="Password" type="password" required />
        <button type="submit">Sign up</button>
      </Form>
      <div className="fl-output">Validation calls: {lookupCount}</div>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
      <FillamentDevTools form={form} />
    </div>
  );
}

const meta: Meta<typeof ServerValidationDemo> = {
  title: "Forms/Server validation",
  component: ServerValidationDemo,
};
export default meta;
type Story = StoryObj<typeof ServerValidationDemo>;
export const Default: Story = {};
