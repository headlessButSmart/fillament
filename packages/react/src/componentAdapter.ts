import { createElement, type ComponentType, type ReactElement } from "react";
import type { FieldRenderProps } from "./useField.js";

export type ComponentAdapterOptions<P = any> = {
  component: ComponentType<P>;
  valueProp?: string;
  changeProp?: string;
  blurProp?: string;
  errorProp?: string;
  helperTextProp?: string;
  extractValue?: (event: unknown) => unknown;
  mapProps?: (field: FieldRenderProps<any>, extra: Record<string, unknown>) => P;
};

export function createComponentAdapter<P>(opts: ComponentAdapterOptions<P>): ComponentType<{
  field: FieldRenderProps<any>;
  [key: string]: unknown;
}> {
  const {
    component,
    valueProp = "value",
    changeProp = "onChange",
    blurProp = "onBlur",
    errorProp,
    helperTextProp,
    extractValue,
    mapProps,
  } = opts;

  return function AdaptedComponent({ field, ...rest }) {
    let mapped: any;
    if (mapProps) {
      mapped = mapProps(field, rest);
    } else {
      mapped = {
        ...rest,
        [valueProp]: field.value ?? "",
        [changeProp]: extractValue
          ? (e: unknown) => field.onChange(extractValue(e))
          : field.onChange,
        [blurProp]: field.onBlur,
      };
      if (errorProp) mapped[errorProp] = field.invalid || undefined;
      if (helperTextProp) mapped[helperTextProp] = field.error?.message;
    }
    return createElement(component as ComponentType<any>, mapped) as ReactElement;
  };
}
