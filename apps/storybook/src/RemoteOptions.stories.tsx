import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Form, Field, useForm } from "@fillament/react";
import { remoteOptions, remoteValidation, type RemoteResultHandle, type RemoteOption } from "@fillament/remote";

type Values = { country: string; city: string; email: string };

const COUNTRIES: Record<string, string[]> = {
  PT: ["Lisbon", "Porto", "Coimbra"],
  ES: ["Madrid", "Barcelona", "Valencia"],
  FR: ["Paris", "Lyon", "Marseille"],
};

function useRemoteHandle<T>(handle: RemoteResultHandle<T>): T | undefined {
  const snap = useSyncExternalStore(
    (cb) => handle.subscribe(cb),
    () => handle.getSnapshot(),
    () => handle.getSnapshot()
  );
  return snap.data;
}

function AsyncSelectDemo() {
  const [countryHandle] = useState(() =>
    remoteOptions({
      key: ["countries"],
      fetcher: async () => {
        await new Promise((r) => setTimeout(r, 300));
        return Object.keys(COUNTRIES).map((code) => ({ id: code, name: `${code} country` }));
      },
      mapOption: (c: any) => ({ label: c.name, value: c.id }),
    })({})
  );
  const countries = useRemoteHandle(countryHandle) as RemoteOption[] | undefined;
  const form = useForm<Values>({ defaultValues: { country: "", city: "", email: "" } });

  return (
    <div className="fl-demo">
      <h2>Async select</h2>
      <p className="subtitle">Fetches options once and renders. No React Query / SWR dependency.</p>
      <Form form={form} onSubmit={async (values) => alert(JSON.stringify(values))}>
        <Field
          name="country"
          label="Country"
          options={countries ?? []}
          description={countries ? undefined : "Loading countries…"}
        />
        <Field name="email" label="Email" type="email" />
        <button type="submit">Save</button>
      </Form>
    </div>
  );
}

function DependentSelectsDemo() {
  const form = useForm<Values>({ defaultValues: { country: "", city: "", email: "" } });
  const [cityHandle] = useState(() =>
    remoteOptions<Values>({
      key: (ctx) => ["cities", ctx.values.country],
      enabled: (ctx) => Boolean(ctx.values.country),
      fetcher: async ({ values }) => {
        await new Promise((r) => setTimeout(r, 250));
        return (COUNTRIES[values.country] ?? []).map((name) => ({ id: name, name }));
      },
      mapOption: (c: any) => ({ label: c.name, value: c.id }),
    })(form.getValues())
  );
  // Forward form changes to the handle.
  useEffect(() => form.subscribeFormState((s) => cityHandle.update(s.values)), [form, cityHandle]);
  const cities = useRemoteHandle(cityHandle) as RemoteOption[] | undefined;

  const countryOptions = Object.keys(COUNTRIES).map((c) => ({ label: c, value: c }));
  const hasCountry = Boolean(form.getValue<string>("country"));

  return (
    <div className="fl-demo">
      <h2>Dependent selects</h2>
      <p className="subtitle">City list re-fetches when the country changes. Stale responses can't overwrite newer ones.</p>
      <Form form={form} onSubmit={async (values) => alert(JSON.stringify(values))}>
        <Field name="country" label="Country" options={countryOptions} />
        <Field
          name="city"
          label="City"
          options={cities ?? []}
          description={!hasCountry ? "Select a country first" : cities ? undefined : "Loading cities…"}
        />
        <button type="submit">Save</button>
      </Form>
    </div>
  );
}

function RemoteValidationDemo() {
  const form = useForm<{ email: string }>({ defaultValues: { email: "" } });
  const [validator] = useState(() =>
    remoteValidation({
      debounceMs: 400,
      fetcher: async ({ value }) => {
        await new Promise((r) => setTimeout(r, 350));
        const taken = ["taken@example.com", "ana@acme.dev"];
        return taken.includes(String(value).toLowerCase()) ? "Email is already taken" : undefined;
      },
    })
  );
  const [status, setStatus] = useState<string>("idle");

  useEffect(() => {
    return form.subscribeFormState(async (s) => {
      const email = s.values.email;
      if (!email) {
        setStatus("idle");
        form.clearFieldErrors("email");
        return;
      }
      setStatus("checking…");
      const message = await validator.validate("email", email, s.values);
      if (message) {
        setStatus("error");
        form.setFieldError("email", { type: "server", message });
      } else {
        setStatus("ok");
        form.clearFieldErrors("email");
      }
    });
  }, [form, validator]);

  return (
    <div className="fl-demo">
      <h2>Remote validation</h2>
      <p className="subtitle">Try <code>taken@example.com</code>. Debounced + cancellation-safe.</p>
      <Form form={form} onSubmit={async () => alert("Saved")}>
        <Field name="email" label="Email" type="email" />
        <p><strong>Status:</strong> {status}</p>
        <button type="submit">Save</button>
      </Form>
    </div>
  );
}

const meta: Meta = {
  title: "Optional Modules/Remote",
};
export default meta;

type Story = StoryObj;

export const AsyncSelect: Story = { render: () => <AsyncSelectDemo /> };
export const DependentSelects: Story = { render: () => <DependentSelectsDemo /> };
export const RemoteValidation: Story = { render: () => <RemoteValidationDemo /> };
