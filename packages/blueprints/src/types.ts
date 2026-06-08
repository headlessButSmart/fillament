import type { FillamentMessage } from "@fillament/core";

// Generic blueprint shape — kept intentionally loose so blueprints stay portable
// across schema libraries (Zod, Yup, JSON Schema, custom). Concrete blueprint
// modules narrow `schema` to a structured definition (BlueprintFieldSchema below).
export interface FillamentBlueprint<TValues = unknown> {
  schema: BlueprintSchema;
  defaultValues: Partial<TValues>;
  steps?: FillamentBlueprintStep[];
  labels?: Record<string, FillamentMessage>;
  metadata?: Record<string, unknown>;
}

export interface FillamentBlueprintStep {
  id: string;
  title: string;
  fields: string[];
}

// A neutral, validator-agnostic schema description. Consumers can hand it to
// their preferred adapter, or wire it into FieldsRenderer. The shape is small
// on purpose — anything richer should be done with the host project's schema.
export type BlueprintFieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "checkbox"
  | "select"
  | "textarea"
  | "date"
  | "tel"
  | "url"
  | "hidden";

export interface BlueprintFieldSchema {
  name: string;
  type: BlueprintFieldType;
  label?: FillamentMessage;
  placeholder?: FillamentMessage;
  description?: FillamentMessage;
  required?: boolean;
  options?: Array<{ label: FillamentMessage; value: string }>;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface BlueprintSchema {
  type: "object";
  fields: BlueprintFieldSchema[];
}

export interface BlueprintBaseOptions<TValues> {
  labels?: Record<string, FillamentMessage>;
  defaultValues?: Partial<TValues>;
}
