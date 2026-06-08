import type { BlueprintFieldSchema, FillamentBlueprint, BlueprintBaseOptions } from "./types.js";
import type { FillamentMessage } from "@fillament/core";

export function mergeLabels(
  base: Record<string, FillamentMessage> | undefined,
  override: Record<string, FillamentMessage> | undefined
): Record<string, FillamentMessage> {
  return { ...(base ?? {}), ...(override ?? {}) };
}

export function applyLabels(
  fields: BlueprintFieldSchema[],
  labels: Record<string, FillamentMessage> | undefined
): BlueprintFieldSchema[] {
  if (!labels) return fields;
  return fields.map((f) => (labels[f.name] ? { ...f, label: labels[f.name]! } : f));
}

export function buildBlueprint<TValues>(
  fields: BlueprintFieldSchema[],
  defaults: Partial<TValues>,
  options: BlueprintBaseOptions<TValues> | undefined,
  baseLabels: Record<string, FillamentMessage>,
  metadata?: Record<string, unknown>
): FillamentBlueprint<TValues> {
  const labels = mergeLabels(baseLabels, options?.labels);
  const finalFields = applyLabels(fields, labels);
  return {
    schema: { type: "object", fields: finalFields },
    defaultValues: { ...defaults, ...(options?.defaultValues ?? {}) } as Partial<TValues>,
    labels,
    metadata,
  };
}
