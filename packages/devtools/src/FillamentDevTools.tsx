import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { AnalyticsEvent, DevtoolsEvent, FormApi, FormState } from "@fillament/core";
import { injectStyles } from "./styles.js";
import { listForms, subscribeFormRegistry } from "./registry.js";
import { listDevtoolsActions, subscribeDevtoolsActions, type DevtoolsAction } from "./actions.js";

type Tab =
  | "overview"
  | "values"
  | "fields"
  | "errors"
  | "validation"
  | "performance"
  | "analytics"
  | "devtools";

export type FillamentDevToolsProps = {
  form?: FormApi<any>;
  initiallyOpen?: boolean;
  position?: "bottom-right" | "bottom-left";
};

const MAX_EVENTS = 200;

function useFormState<T>(form: FormApi<T>): FormState<T> {
  return useSyncExternalStore(
    (cb) => form.subscribeFormState(() => cb()),
    () => form.getState(),
    () => form.getState()
  );
}

function useEvents<T>(
  subscribe: (cb: (event: T) => void) => () => void
): T[] {
  const ref = useRef<T[]>([]);
  const [, force] = useState(0);
  useEffect(() => {
    return subscribe((event) => {
      ref.current = [event, ...ref.current].slice(0, MAX_EVENTS);
      force((c) => c + 1);
    });
  }, [subscribe]);
  return ref.current;
}

function useRegistry(): FormApi<any>[] {
  return useSyncExternalStore(
    (cb) => subscribeFormRegistry(cb),
    () => listForms(),
    () => listForms()
  );
}

function useActions(): DevtoolsAction[] {
  return useSyncExternalStore(
    (cb) => subscribeDevtoolsActions(cb),
    () => listDevtoolsActions(),
    () => listDevtoolsActions()
  );
}

export function FillamentDevTools(props: FillamentDevToolsProps) {
  injectStyles();
  const registry = useRegistry();
  const form = props.form ?? registry[0];

  const [open, setOpen] = useState(props.initiallyOpen ?? true);
  const [tab, setTab] = useState<Tab>("overview");

  if (!form) {
    return (
      <div className="fl-devtools collapsed">
        <div className="fl-devtools__header">
          <div className="fl-devtools__title">Fillament DevTools</div>
          <div className="fl-devtools__badge">no form</div>
        </div>
      </div>
    );
  }

  return (
    <DevToolsForForm
      form={form}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      tab={tab}
      onTabChange={setTab}
    />
  );
}

type DevToolsForFormProps = {
  form: FormApi<any>;
  open: boolean;
  onToggle: () => void;
  tab: Tab;
  onTabChange: (t: Tab) => void;
};

function DevToolsForForm({ form, open, onToggle, tab, onTabChange }: DevToolsForFormProps) {
  const state = useFormState(form);
  const actions = useActions();
  const analyticsSub = useCallback(
    (cb: (e: AnalyticsEvent) => void) => form.subscribeAnalytics(cb),
    [form]
  );
  const devtoolsSub = useCallback(
    (cb: (e: DevtoolsEvent) => void) => form.subscribeDevtools(cb),
    [form]
  );
  const analytics = useEvents<AnalyticsEvent>(analyticsSub);
  const devtools = useEvents<DevtoolsEvent>(devtoolsSub);

  const errorCount = useMemo(
    () => Object.values(state.errors).reduce((s, list) => s + (list?.length ?? 0), 0),
    [state.errors]
  );

  return (
    <div className={"fl-devtools " + (open ? "" : "collapsed")}>
      <div className="fl-devtools__header" onClick={onToggle}>
        <div className="fl-devtools__title">Fillament DevTools</div>
        <div className="fl-devtools__badge">{form.id}</div>
        {errorCount > 0 ? <div className="fl-devtools__badge" style={{ background: "#a40e26" }}>{errorCount} err</div> : null}
        {state.isSubmitting ? <div className="fl-devtools__badge" style={{ background: "#9e6a03" }}>submitting</div> : null}
        <button
          className="fl-devtools__close"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? "–" : "+"}
        </button>
      </div>
      {!open ? null : (
        <>
          <div className="fl-devtools__tabs">
            {(
              [
                ["overview", "Overview"],
                ["values", "Values"],
                ["fields", "Fields"],
                ["errors", "Errors"],
                ["validation", "Validation"],
                ["performance", "Perf"],
                ["analytics", "Analytics"],
                ["devtools", "Events"],
              ] as Array<[Tab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                className={"fl-devtools__tab " + (tab === key ? "active" : "")}
                onClick={() => onTabChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {actions.length > 0 ? (
            <div className="fl-devtools__actions">
              {actions.map((action) => (
                <button
                  key={action.id}
                  className="fl-devtools__action"
                  title={action.title}
                  onClick={() => {
                    void Promise.resolve(action.run(form)).catch((err) => {
                      // Actions must never crash the panel.
                      // eslint-disable-next-line no-console
                      console.warn(`[fillament/devtools] action "${action.id}" threw`, err);
                    });
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="fl-devtools__body">
            {tab === "overview" && <OverviewPanel form={form} state={state} />}
            {tab === "values" && <ValuesPanel state={state} />}
            {tab === "fields" && <FieldsPanel form={form} state={state} />}
            {tab === "errors" && <ErrorsPanel state={state} />}
            {tab === "validation" && <ValidationPanel events={devtools} />}
            {tab === "performance" && <PerformancePanel form={form} state={state} />}
            {tab === "analytics" && <AnalyticsPanel events={analytics} />}
            {tab === "devtools" && <EventsPanel events={devtools} />}
          </div>
        </>
      )}
    </div>
  );
}

function OverviewPanel({ form, state }: { form: FormApi<any>; state: FormState<any> }) {
  const dirtyCount = Object.keys(state.dirtyFields).length;
  const touchedCount = Object.keys(state.touched).length;
  return (
    <div>
      <Row label="form id" value={form.id} />
      <Row label="dirty" value={state.dirty ? "yes" : "no"} />
      <Row label="valid" value={state.isValid ? "yes" : "no"} />
      <Row label="submitting" value={state.isSubmitting ? "yes" : "no"} />
      <Row label="validating" value={state.isValidating ? "yes" : "no"} />
      <Row label="submit count" value={String(state.submitCount)} />
      <Row label="touched fields" value={String(touchedCount)} />
      <Row label="dirty fields" value={String(dirtyCount)} />
    </div>
  );
}

function ValuesPanel({ state }: { state: FormState<any> }) {
  return (
    <pre className="fl-devtools__pre">{JSON.stringify(state.values, null, 2)}</pre>
  );
}

function FieldsPanel({ form, state }: { form: FormApi<any>; state: FormState<any> }) {
  const fieldNames = new Set<string>([
    ...Object.keys(state.touched),
    ...Object.keys(state.errors),
    ...Object.keys(state.dirtyFields),
  ]);
  const list = Array.from(fieldNames).sort();
  if (!list.length) return <div className="fl-devtools__empty">No registered fields yet</div>;
  return (
    <div>
      {list.map((name) => {
        const fs = form.getFieldState(name);
        return (
          <div key={name} className="fl-devtools__row">
            <span className="fl-devtools__key">{name}</span>
            <span>
              {fs.errors.length ? <span className="fl-devtools__chip error">err</span> : null}
              {fs.touched ? <span className="fl-devtools__chip touched">touched</span> : null}
              {fs.dirty ? <span className="fl-devtools__chip dirty">dirty</span> : null}
              {!fs.visible ? <span className="fl-devtools__chip">hidden</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ErrorsPanel({ state }: { state: FormState<any> }) {
  const entries = Object.entries(state.errors).filter(([, v]) => v?.length);
  if (!entries.length && !state.formErrors.length) return <div className="fl-devtools__empty">No errors</div>;
  return (
    <div>
      {state.formErrors.length ? (
        <div>
          <div className="fl-devtools__key">form-level</div>
          {state.formErrors.map((e, i) => (
            <div key={i} className="fl-devtools__row">
              <span className="fl-devtools__chip error">{e.type ?? "error"}</span>
              <span className="fl-devtools__value">{e.message}</span>
            </div>
          ))}
        </div>
      ) : null}
      {entries.map(([name, errors]) => (
        <div key={name}>
          <div className="fl-devtools__key">{name}</div>
          {errors!.map((e, i) => (
            <div key={i} className="fl-devtools__row">
              <span className="fl-devtools__chip error">{e.code ?? e.type ?? "error"}</span>
              <span className="fl-devtools__value">{e.message}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ValidationPanel({ events }: { events: DevtoolsEvent[] }) {
  const validation = events.filter((e) => e.type.startsWith("validation"));
  if (!validation.length) return <div className="fl-devtools__empty">No validation events yet</div>;
  return (
    <div>
      {validation.map((e, i) => (
        <div key={i} className="fl-devtools__event">
          <span className="fl-devtools__event-type">{e.type}</span>
          <span className="fl-devtools__event-payload">
            {"field" in e && e.field ? e.field : "(form)"}
            {" durationMs" in e && (e as any).durationMs ? ` — ${(e as any).durationMs}ms` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function PerformancePanel({ form, state }: { form: FormApi<any>; state: FormState<any> }) {
  const fieldNames = new Set<string>([
    ...Object.keys(state.touched),
    ...Object.keys(state.errors),
    ...Object.keys(state.dirtyFields),
  ]);
  const list = Array.from(fieldNames).sort();
  if (!list.length) return <div className="fl-devtools__empty">No fields tracked yet</div>;
  return (
    <div>
      {list.map((name) => {
        const fs = form.getFieldState(name);
        return (
          <div key={name} className="fl-devtools__row">
            <span className="fl-devtools__key">{name}</span>
            <span className="fl-devtools__value">{fs.renderCount} renders</span>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsPanel({ events }: { events: AnalyticsEvent[] }) {
  if (!events.length) return <div className="fl-devtools__empty">No analytics events yet</div>;
  return (
    <div>
      {events.map((e, i) => (
        <div key={i} className="fl-devtools__event">
          <span className="fl-devtools__event-type">{e.type}</span>
          <span className="fl-devtools__event-payload">
            {e.field ?? e.fieldHash ?? "(form)"}
            {e.errorCode ? ` — ${e.errorCode}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function EventsPanel({ events }: { events: DevtoolsEvent[] }) {
  if (!events.length) return <div className="fl-devtools__empty">No events yet</div>;
  return (
    <div>
      {events.map((e, i) => (
        <div key={i} className="fl-devtools__event">
          <span className="fl-devtools__event-type">{e.type}</span>
          <span className="fl-devtools__event-payload">
            {"field" in e && e.field ? e.field : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="fl-devtools__row">
      <span className="fl-devtools__key">{label}</span>
      <span className="fl-devtools__value">{value}</span>
    </div>
  );
}
