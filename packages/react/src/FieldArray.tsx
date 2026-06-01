import { useMemo, type ReactNode } from "react";
import { createFieldArray, type FieldArrayApi } from "@fillament/core";
import { useFormContext } from "./context.js";
import { useWatch } from "./useForm.js";

export type FieldArrayProps<TItem = unknown> = {
  name: string;
  children: (arr: FieldArrayApi<TItem>) => ReactNode;
};

export function FieldArray<TItem = unknown>(props: FieldArrayProps<TItem>) {
  const form = useFormContext();
  // re-render when the array shape changes
  useWatch(props.name, form);
  const arr = useMemo(() => createFieldArray<TItem>(form, props.name), [
    form,
    props.name,
    // recompute on each render — items reflect current values
    form.getValue(props.name),
  ]);
  return <>{props.children(arr)}</>;
}

export function useFieldArray<TItem = unknown>(name: string): FieldArrayApi<TItem> {
  const form = useFormContext();
  useWatch(name, form);
  return useMemo(() => createFieldArray<TItem>(form, name), [
    form,
    name,
    form.getValue(name),
  ]);
}
