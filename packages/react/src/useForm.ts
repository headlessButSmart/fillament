import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createForm, type FormApi, type FormOptions, type FormState } from "@fillament/core";

export function useForm<TValues = any>(options: FormOptions<TValues> = {}): FormApi<TValues> {
  // Hold the form instance for the component's lifetime.
  // We re-use across renders to avoid re-creating state on every render.
  const ref = useRef<FormApi<TValues> | null>(null);
  if (ref.current == null) {
    ref.current = createForm<TValues>(options);
  }

  // The options reference may change every render; sync mutable parts that
  // a developer is likely to swap (onSubmit) without rebuilding state.
  const form = ref.current!;
  (form.options as FormOptions<TValues>).onSubmit =
    options.onSubmit ?? form.options.onSubmit;

  // Tear down any plugin cleanups when the host component unmounts. The
  // __disposePlugins escape hatch is provided by createForm when plugins are
  // wired; calling it on a plugin-less form is a no-op.
  useEffect(() => {
    return () => {
      const dispose = (form as unknown as { __disposePlugins?: () => void }).__disposePlugins;
      if (typeof dispose === "function") dispose();
    };
  }, [form]);

  return form;
}

export function useFormState<TValues = any>(form: FormApi<TValues>): FormState<TValues> {
  // The form mutates `state` in place and notifies via subscribeFormState. We
  // cannot use useSyncExternalStore here because the snapshot identity never
  // changes — instead we force a re-render and return the live state. Children
  // that depend on specific slices (errors, dirtyFields) get new references
  // because the form rebuilds those sub-objects on change.
  const [, force] = useState(0);
  useEffect(() => {
    return form.subscribeFormState(() => force((c) => c + 1));
  }, [form]);
  return form.getState();
}

export function useFormStateSelector<TValues, TSelected>(
  form: FormApi<TValues>,
  selector: (state: FormState<TValues>) => TSelected,
  isEqual: (a: TSelected, b: TSelected) => boolean = Object.is
): TSelected {
  const [, force] = useState(0);
  const ref = useRef<TSelected>(selector(form.getState()));

  useEffect(() => {
    return form.subscribeFormState((state) => {
      const next = selector(state);
      if (!isEqual(ref.current, next)) {
        ref.current = next;
        force((c) => c + 1);
      }
    });
  }, [form, selector, isEqual]);

  return ref.current;
}

// useWatch subscribes to a single field path and re-renders only when that path changes.
export function useWatch<T = unknown>(name: string, form?: FormApi<any>): T | undefined {
  const ctxForm = form;
  if (!ctxForm) throw new Error("useWatch needs a form (pass it or use inside a FormProvider)");
  return useSyncExternalStore(
    (cb) => ctxForm.subscribe(name, cb),
    () => ctxForm.getValue<T>(name),
    () => ctxForm.getValue<T>(name)
  );
}

export function useFormValues<TValues>(form: FormApi<TValues>): TValues {
  return useSyncExternalStore(
    (cb) => form.subscribe("", cb),
    () => form.getValues(),
    () => form.getValues()
  );
}
