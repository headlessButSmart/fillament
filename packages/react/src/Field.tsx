import { type ComponentType, type ReactNode, createElement } from "react";
import type { UnmountBehavior, VisibilityPredicate } from "@fillament/core";
import { useField, type FieldRenderProps, type UseFieldOptions } from "./useField.js";
import { useComponents } from "./context.js";

export type FieldProps = UseFieldOptions & {
  name: string;
  label?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  as?: ComponentType<any> | string;
  children?: (field: FieldRenderProps<any>) => ReactNode;
  visibleWhen?: VisibilityPredicate<any>;
  unmountBehavior?: UnmountBehavior;
  type?: string;
  // For the default renderer: drives a <select> or radio-group output.
  options?: Array<{ label: string; value: string | number }>;
};

function renderDefault(
  field: FieldRenderProps<any>,
  label: ReactNode,
  description: ReactNode,
  placeholder: string | undefined,
  type: string | undefined,
  options: Array<{ label: string; value: string | number }> | undefined
) {
  const descId = description ? `${field.name}-description` : undefined;
  const errId = field.errors.length ? `${field.name}-error` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  const commonAria = {
    "aria-invalid": field.invalid || undefined,
    "aria-describedby": describedBy,
  };

  // Checkbox uses an inline layout: <input> then <label> on the same row.
  // The stacked label-above-control pattern is for text/select/textarea.
  if (type === "checkbox") {
    return (
      <div
        data-fillament-field={field.name}
        data-fillament-type="checkbox"
        data-fillament-invalid={field.invalid || undefined}
      >
        <label htmlFor={field.name} data-fillament-label data-fillament-inline-label>
          <input
            id={field.name}
            name={field.name}
            type="checkbox"
            checked={!!field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            onFocus={field.onFocus}
            disabled={field.disabled}
            {...commonAria}
          />
          {label ? (
            <span>
              {label}
              {field.required ? " *" : ""}
            </span>
          ) : null}
        </label>
        {description ? (
          <div id={descId} data-fillament-description>
            {description}
          </div>
        ) : null}
        {field.errors.length ? (
          <div id={errId} role="alert" data-fillament-error>
            {field.errors[0]!.message}
          </div>
        ) : null}
      </div>
    );
  }

  // Radio group: list each option inline with its own input.
  if (type === "radio" && options && options.length > 0) {
    return (
      <fieldset
        data-fillament-field={field.name}
        data-fillament-type="radio"
        data-fillament-invalid={field.invalid || undefined}
      >
        {label ? <legend data-fillament-label>{label}{field.required ? " *" : ""}</legend> : null}
        {options.map((o) => {
          const optionId = `${field.name}-${String(o.value)}`;
          return (
            <label key={String(o.value)} htmlFor={optionId} data-fillament-inline-label>
              <input
                id={optionId}
                name={field.name}
                type="radio"
                value={o.value}
                checked={field.value === o.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={field.disabled}
              />
              <span>{o.label}</span>
            </label>
          );
        })}
        {description ? (
          <div id={descId} data-fillament-description>
            {description}
          </div>
        ) : null}
        {field.errors.length ? (
          <div id={errId} role="alert" data-fillament-error>
            {field.errors[0]!.message}
          </div>
        ) : null}
      </fieldset>
    );
  }

  const renderControl = () => {
    if (options && options.length > 0) {
      return (
        <select
          id={field.name}
          name={field.name}
          value={(field.value ?? "") as any}
          onChange={field.onChange}
          onBlur={field.onBlur}
          onFocus={field.onFocus}
          disabled={field.disabled}
          required={field.required}
          {...commonAria}
        >
          <option value="">{placeholder ?? "—"}</option>
          {options.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (type === "textarea") {
      return (
        <textarea
          id={field.name}
          name={field.name}
          value={(field.value ?? "") as any}
          onChange={field.onChange}
          onBlur={field.onBlur}
          onFocus={field.onFocus}
          placeholder={placeholder}
          disabled={field.disabled}
          required={field.required}
          {...commonAria}
        />
      );
    }
    return (
      <input
        id={field.name}
        name={field.name}
        type={type ?? "text"}
        value={(field.value ?? "") as any}
        onChange={field.onChange}
        onBlur={field.onBlur}
        onFocus={field.onFocus}
        placeholder={placeholder}
        disabled={field.disabled}
        required={field.required}
        {...commonAria}
      />
    );
  };

  return (
    <div
      data-fillament-field={field.name}
      data-fillament-type={type ?? "text"}
      data-fillament-invalid={field.invalid || undefined}
    >
      {label ? (
        <label htmlFor={field.name} data-fillament-label>
          {label}
          {field.required ? " *" : ""}
        </label>
      ) : null}
      {renderControl()}
      {description ? (
        <div id={descId} data-fillament-description>
          {description}
        </div>
      ) : null}
      {field.errors.length ? (
        <div id={errId} role="alert" data-fillament-error>
          {field.errors[0]!.message}
        </div>
      ) : null}
    </div>
  );
}

export function Field(props: FieldProps) {
  const {
    name,
    label,
    description,
    placeholder,
    as,
    children,
    visibleWhen,
    unmountBehavior,
    type,
    defaultValue,
    disabled,
    required,
    readOnly,
    validateOn,
    options,
    ...rest
  } = props;

  const components = useComponents();
  const field = useField(name, {
    defaultValue,
    visibleWhen,
    unmountBehavior,
    disabled,
    required,
    readOnly,
    validateOn,
  });

  if (!field.visible) return null;

  if (typeof children === "function") {
    return <>{children(field)}</>;
  }

  if (typeof as === "string") {
    const Component = components[as];
    if (!Component) {
      console.warn(
        `[fillament] No component registered for "${as}". Did you forget to pass it to <FormProvider components={...} />?`
      );
      return renderDefault(field, label, description, placeholder, type, options);
    }
    return (
      <Component
        {...rest}
        label={label}
        description={description}
        placeholder={placeholder}
        options={options}
        field={field}
        {...field.inputProps}
        error={field.error}
        errors={field.errors}
      />
    );
  }

  if (as) {
    return createElement(as, {
      ...rest,
      label,
      description,
      placeholder,
      options,
      field,
      ...field.inputProps,
      error: field.error,
      errors: field.errors,
    });
  }

  return renderDefault(field, label, description, placeholder, type, options);
}
