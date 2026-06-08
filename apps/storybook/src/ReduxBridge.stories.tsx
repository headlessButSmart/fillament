import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { Form, Field, useForm } from "@fillament/react";
import { createReduxBridge, fillamentReducer, type StoreLike } from "@fillament/redux";

// Build a minimal Store-like object so the story has no `redux` dependency.
function makeStore(): StoreLike & {
  actions: any[];
  watch: (fn: () => void) => () => void;
} {
  let state: any = {};
  const listeners = new Set<() => void>();
  const actions: any[] = [];
  return {
    actions,
    getState: () => state,
    dispatch: (action) => {
      actions.push(action);
      state = fillamentReducer(state, action as any);
      for (const l of listeners) l();
      return action;
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    watch: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

function ReduxBridgeDemo() {
  const [store] = useState(() => makeStore());
  const [snap, setSnap] = useState<any>(store.getState());

  const form = useForm<{ email: string; firstName: string }>({
    defaultValues: { email: "", firstName: "" },
    plugins: [
      createReduxBridge({
        store,
        slice: "user",
        mode: "values-only",
        debounceMs: 100,
      }),
    ],
  });

  useEffect(() => store.watch(() => setSnap(store.getState())), [store]);

  return (
    <div className="fl-demo">
      <h2>Redux bridge</h2>
      <p className="subtitle">
        Form values are mirrored into a slice-aware store. One-way only — the bridge does not
        loop back from store to form after hydration.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Form form={form} onSubmit={async (v) => alert(JSON.stringify(v))}>
          <Field name="email" label="Email" type="email" />
          <Field name="firstName" label="First name" />
          <button type="submit">Save</button>
        </Form>
        <div>
          <h3>Redux state</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(snap, null, 2)}</pre>
          <h3>Last action</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(store.actions[store.actions.length - 1], null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Optional Modules/Redux/Redux Bridge",
};
export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <ReduxBridgeDemo /> };
