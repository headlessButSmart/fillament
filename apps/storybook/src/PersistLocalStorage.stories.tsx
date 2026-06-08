import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { createStoragePersistPlugin, createLocalStorageStore, createMemoryDraftStore } from "@fillament/persist";

const Schema = z.object({
  email: z.string().email("Enter a valid email"),
  firstName: z.string().min(1, "Required"),
  notes: z.string().optional(),
  password: z.string().min(8, "Min 8 chars").optional(),
});
type Values = z.infer<typeof Schema>;

function DraftDemo({ storageKind }: { storageKind: "local" | "session" | "memory" }) {
  const [storage] = useState(() => {
    if (storageKind === "memory") return createMemoryDraftStore();
    if (storageKind === "session" && typeof window !== "undefined") {
      return {
        getItem: (k: string) => window.sessionStorage.getItem(k),
        setItem: (k: string, v: string) => window.sessionStorage.setItem(k, v),
        removeItem: (k: string) => window.sessionStorage.removeItem(k),
      };
    }
    return createLocalStorageStore();
  });
  const [persisted, setPersisted] = useState<string>("(none yet)");

  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: { email: "", firstName: "", notes: "", password: "" },
    plugins: [
      createStoragePersistPlugin<Values>({
        key: `fillament-story-persist-${storageKind}`,
        version: 1,
        debounceMs: 250,
        restoreOnMount: true,
        clearOnSubmit: true,
        storage,
      }),
    ],
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const raw = storage.getItem(`fillament-story-persist-${storageKind}`);
      setPersisted(raw ?? "(empty)");
    }, 400);
    return () => clearInterval(interval);
  }, [storage, storageKind]);

  return (
    <div className="fl-demo">
      <h2>Persist · {storageKind}</h2>
      <p className="subtitle">
        Type below and refresh the page (or close & reopen the tab for `session`).
        The plugin restores values from the configured store. `password` is excluded
        from persistence by default.
      </p>
      <Form form={form} onSubmit={async (values) => alert("Submitted: " + JSON.stringify(values, null, 2))}>
        <Field name="email" label="Email" type="email" required />
        <Field name="firstName" label="First name" required />
        <Field name="notes" label="Notes" />
        <Field name="password" label="Password (excluded from persistence)" type="password" />
        <button type="submit">Save (clears draft)</button>
      </Form>
      <div className="fl-output" style={{ marginTop: 16 }}>
        <strong>Persisted payload:</strong>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{persisted}</pre>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Optional Modules/Persist",
};
export default meta;

type Story = StoryObj;

export const LocalStorageDraft: Story = {
  name: "Local Storage Draft",
  render: () => <DraftDemo storageKind="local" />,
};
export const SessionStorageDraft: Story = {
  name: "Session Storage Draft",
  render: () => <DraftDemo storageKind="session" />,
};
export const MemoryStoreDraft: Story = {
  name: "Memory Store",
  render: () => <DraftDemo storageKind="memory" />,
};

// ---- Manual save mode (autoSave: false) ----

const MANUAL_KEY = "fillament-story-persist-manual";

function ManualSaveDemo() {
  const [storage] = useState(() => createLocalStorageStore());

  // Build the plugin once so its save()/clear()/restore() handles are stable.
  const plugin = useMemo(
    () =>
      createStoragePersistPlugin<Values>({
        key: MANUAL_KEY,
        storage,
        autoSave: false,        // ← no save-on-change
        restoreOnMount: true,   // still restore on mount
        clearOnSubmit: true,    // still clear on submit
      }),
    [storage]
  );

  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: { email: "", firstName: "", notes: "", password: "" },
    plugins: [plugin],
  });

  const [persisted, setPersisted] = useState<string>(() => storage.getItem(MANUAL_KEY) ?? "(empty)");
  const [lastSaved, setLastSaved] = useState<string>("never");

  useEffect(() => {
    const id = setInterval(() => {
      setPersisted(storage.getItem(MANUAL_KEY) ?? "(empty)");
      setLastSaved(plugin.lastSavedAt ? plugin.lastSavedAt.toLocaleTimeString() : "never");
    }, 400);
    return () => clearInterval(id);
  }, [plugin, storage]);

  return (
    <div className="fl-demo">
      <h2>Persist · Manual mode</h2>
      <p className="subtitle">
        <code>autoSave: false</code> — typing does <strong>not</strong> save. Use the buttons below.
        The plugin still restores on mount and clears on submit by default.
      </p>
      <Form form={form} onSubmit={async (values) => alert("Submitted: " + JSON.stringify(values, null, 2))}>
        <Field name="email" label="Email" type="email" required />
        <Field name="firstName" label="First name" required />
        <Field name="notes" label="Notes" />
        <Field name="password" label="Password (excluded from persistence)" type="password" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          <button type="button" onClick={() => plugin.save()}>Save as draft</button>
          <button type="button" onClick={() => plugin.restore()}>Restore last saved</button>
          <button type="button" onClick={() => plugin.clear()}>Discard draft</button>
          <button type="submit">Submit (clears draft)</button>
        </div>
      </Form>
      <div className="fl-output" style={{ marginTop: 16 }}>
        <p style={{ margin: "0 0 8px" }}>
          <strong>Last saved:</strong> {lastSaved}
        </p>
        <strong>Persisted payload:</strong>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{persisted}</pre>
      </div>
    </div>
  );
}

export const ManualSave: Story = {
  name: "Manual Save (button-driven)",
  render: () => <ManualSaveDemo />,
};

// ---- Shared draft across multiple forms ----

const SHARED_KEY = "fillament-story-persist-shared";

type SharedValues = { email: string; firstName: string; notes: string };

function SharedDraftDemo() {
  const [storage] = useState(() => createLocalStorageStore());

  // Same key, same store, neither clears on submit nor reset — two forms
  // exchange data through the persisted draft.
  const pluginA = useMemo(
    () =>
      createStoragePersistPlugin<SharedValues>({
        key: SHARED_KEY,
        storage,
        debounceMs: 250,
        restoreOnMount: true,
        clearOnSubmit: false,
        clearOnReset: false,
      }),
    [storage]
  );
  const pluginB = useMemo(
    () =>
      createStoragePersistPlugin<SharedValues>({
        key: SHARED_KEY,
        storage,
        debounceMs: 250,
        restoreOnMount: true,
        clearOnSubmit: false,
        clearOnReset: false,
      }),
    [storage]
  );

  const formA = useForm<SharedValues>({
    defaultValues: { email: "", firstName: "", notes: "" },
    plugins: [pluginA],
  });
  const formB = useForm<SharedValues>({
    defaultValues: { email: "", firstName: "", notes: "" },
    plugins: [pluginB],
  });

  // Re-hydrate the *other* form whenever the persisted draft changes.
  // (In real apps you'd usually mount each form on a different page, so this
  //  manual cross-form refresh is just for the side-by-side demo.)
  useEffect(() => {
    return formA.subscribeFormState(() => {
      // small delay so the debounced write lands before B reads
      setTimeout(() => pluginB.restore(), 300);
    });
  }, [formA, pluginB]);
  useEffect(() => {
    return formB.subscribeFormState(() => {
      setTimeout(() => pluginA.restore(), 300);
    });
  }, [formB, pluginA]);

  const [persisted, setPersisted] = useState<string>(() => storage.getItem(SHARED_KEY) ?? "(empty)");
  useEffect(() => {
    const id = setInterval(() => {
      setPersisted(storage.getItem(SHARED_KEY) ?? "(empty)");
    }, 400);
    return () => clearInterval(id);
  }, [storage]);

  return (
    <div className="fl-demo">
      <h2>Persist · Shared draft (multiple forms, same key)</h2>
      <p className="subtitle">
        Both forms read and write <code>{SHARED_KEY}</code>. <code>clearOnSubmit: false</code> +
        <code>clearOnReset: false</code> means submitting or resetting either one keeps the data.
        Type into one form — the other rehydrates from storage shortly after.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <h3>Form A (e.g. page 1)</h3>
          <Form form={formA} onSubmit={async () => alert("Form A submitted — draft KEPT")}>
            <Field name="email" label="Email" type="email" />
            <Field name="firstName" label="First name" />
            <Field name="notes" label="Notes" />
            <button type="submit">Submit A (draft preserved)</button>
          </Form>
        </div>

        <div>
          <h3>Form B (e.g. page 2)</h3>
          <Form form={formB} onSubmit={async () => alert("Form B submitted — draft KEPT")}>
            <Field name="email" label="Email" type="email" />
            <Field name="firstName" label="First name" />
            <Field name="notes" label="Notes" />
            <button type="submit">Submit B (draft preserved)</button>
          </Form>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button type="button" onClick={() => pluginA.clear()}>
          Clear shared draft (call when the flow truly completes)
        </button>
      </div>

      <div className="fl-output" style={{ marginTop: 16 }}>
        <strong>Shared persisted payload:</strong>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{persisted}</pre>
      </div>
    </div>
  );
}

export const SharedDraft: Story = {
  name: "Shared Draft (multi-form, same key)",
  render: () => <SharedDraftDemo />,
};
