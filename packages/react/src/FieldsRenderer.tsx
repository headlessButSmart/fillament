import { Fragment, type ComponentType, type ReactNode } from "react";
import type { UnmountBehavior, VisibilityPredicate } from "@fillament/core";
import { Field } from "./Field.js";
import { FieldArray } from "./FieldArray.js";
import { FieldArrayTable, type TableColumn } from "./FieldArrayTable.js";

// JSON-friendly field config — every property is a plain value so the whole
// list can be loaded from JSON, an API, or a CMS.
export type FieldConfig = {
  // dot-path name; also used as the React key when present
  name: string;
  // "text" | "email" | "password" | "number" | "checkbox" | "select" | "textarea" |
  // "array" | "table" | "group" | any registered component name from createFormUI
  type?: string;
  label?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  // string registry name OR a direct component reference
  as?: ComponentType<any> | string;
  // condition. Either a function or a string expression like "type === 'business'"
  visibleWhen?: VisibilityPredicate<any> | string;
  unmountBehavior?: UnmountBehavior;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  // For "select" + "radio" components
  options?: Array<{ label: string; value: string | number }>;
  // For "array" type, the per-item field config
  itemFields?: FieldConfig[];
  // For "table" type, the per-column descriptor. Reuses FieldConfig keys but
  // adds an optional `width`.
  columns?: Array<TableColumn>;
  // Render-time helpers for "array" / "table" items.
  addLabel?: string;
  removeLabel?: string;
  showRowActions?: boolean;
  minRows?: number;
  maxRows?: number;
  // Any extra props you want forwarded to the rendered component
  props?: Record<string, unknown>;
  // For "group" type, the nested children
  fields?: FieldConfig[];
};

export type FieldsRendererProps = {
  fields: FieldConfig[];
  // Optional wrapper around each rendered field. Useful for grid layouts, etc.
  wrap?: (field: FieldConfig, rendered: ReactNode) => ReactNode;
};

function joinName(parent: string | undefined, child: string): string {
  return parent ? `${parent}.${child}` : child;
}

function inferType(config: FieldConfig): string {
  if (config.type) return config.type;
  if (config.columns) return "table";
  if (config.options) return "select";
  if (config.itemFields) return "array";
  if (config.fields) return "group";
  return "text";
}

function renderOne(config: FieldConfig, namePrefix?: string): ReactNode {
  const name = joinName(namePrefix, config.name);
  const type = inferType(config);

  if (type === "group") {
    return (
      <fieldset key={name} data-fillament-group={name}>
        {config.label ? <legend>{config.label}</legend> : null}
        {(config.fields ?? []).map((child) => renderOne(child, name))}
      </fieldset>
    );
  }

  if (type === "array") {
    const itemFields = config.itemFields ?? [];
    return (
      <div key={name} data-fillament-array={name}>
        {config.label ? <label data-fillament-label>{config.label}</label> : null}
        <FieldArray<Record<string, unknown>> name={name}>
          {(arr) => (
            <>
              {arr.items.map((item) => (
                <div key={item.key} className="fl-card">
                  {itemFields.map((child) =>
                    renderOne(child, item.path("").replace(/\.$/, ""))
                  )}
                  <button
                    type="button"
                    className="fl-danger"
                    onClick={() => arr.remove(item.index)}
                  >
                    {config.removeLabel ?? "Remove"}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="fl-ghost"
                onClick={() => {
                  const blank: Record<string, unknown> = {};
                  for (const f of itemFields) blank[f.name] = f.defaultValue ?? "";
                  arr.append(blank);
                }}
              >
                {config.addLabel ?? "+ Add"}
              </button>
            </>
          )}
        </FieldArray>
      </div>
    );
  }

  if (type === "table") {
    const columns = config.columns ?? [];
    return (
      <div key={name} data-fillament-table={name}>
        {config.label ? <label data-fillament-label>{config.label}</label> : null}
        <FieldArrayTable
          name={name}
          columns={columns}
          addLabel={config.addLabel}
          removeLabel={config.removeLabel}
          showRowActions={config.showRowActions}
          minRows={config.minRows}
          maxRows={config.maxRows}
          newRow={() => {
            const seed: Record<string, unknown> = {};
            for (const c of columns) seed[c.name] = "";
            return seed;
          }}
        />
      </div>
    );
  }

  return (
    <Field
      key={name}
      name={name}
      label={config.label}
      description={config.description}
      placeholder={config.placeholder}
      type={isHtmlInputType(type) ? type : undefined}
      as={config.as ?? (isRegistryType(type) ? type : undefined)}
      visibleWhen={config.visibleWhen}
      unmountBehavior={config.unmountBehavior}
      required={config.required}
      disabled={config.disabled}
      readOnly={config.readOnly}
      defaultValue={config.defaultValue}
      {...(config.options ? { options: config.options } : {})}
      {...(config.props ?? {})}
    />
  );
}

function isHtmlInputType(type: string): boolean {
  return [
    "text",
    "email",
    "password",
    "number",
    "checkbox",
    "radio",
    "date",
    "datetime-local",
    "time",
    "tel",
    "url",
    "search",
    "color",
  ].includes(type);
}

function isRegistryType(type: string): boolean {
  // Anything PascalCase is assumed to be a registry component name.
  return /^[A-Z]/.test(type);
}

export function FieldsRenderer(props: FieldsRendererProps) {
  const { fields, wrap } = props;
  return (
    <>
      {fields.map((f) => {
        const rendered = renderOne(f);
        return <Fragment key={f.name}>{wrap ? wrap(f, rendered) : rendered}</Fragment>;
      })}
    </>
  );
}
