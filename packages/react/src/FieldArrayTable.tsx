import type { ComponentType, ReactNode } from "react";
import type { FieldArrayApi, UnmountBehavior, VisibilityPredicate } from "@fillament/core";
import { Field } from "./Field.js";
import { FieldArray } from "./FieldArray.js";

export type TableColumn = {
  /** Subfield name within each array item (dot-paths supported for nested objects). */
  name: string;
  /** Header cell content. Defaults to the column name. */
  label?: ReactNode;
  /** HTML input type, or a registry name / component reference passed to <Field as=...>. */
  type?: string;
  as?: ComponentType<any> | string;
  /** For select/radio columns. */
  options?: Array<{ label: string; value: string | number }>;
  /** Per-cell visibility based on row values. */
  visibleWhen?: VisibilityPredicate<any> | string;
  /** What happens when the cell unmounts (e.g. when visibleWhen flips). */
  unmountBehavior?: UnmountBehavior;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  /** Optional column width — passed straight to <col width=...>. */
  width?: number | string;
  /** Extra props forwarded to the rendered <Field>. */
  fieldProps?: Record<string, unknown>;
  /** Custom cell renderer; when provided, replaces the default <Field>. */
  render?: (ctx: {
    rowIndex: number;
    rowKey: string;
    rowValue: unknown;
    fieldName: string;
  }) => ReactNode;
};

export type FieldArrayTableProps<TItem = Record<string, unknown>> = {
  name: string;
  columns: TableColumn[];
  /** Factory for a new blank row. If omitted, an empty object is appended. */
  newRow?: () => TItem;
  addLabel?: string;
  removeLabel?: string;
  /** Show per-row move-up / move-down / remove buttons. Default: true. */
  showRowActions?: boolean;
  /** Show the column header row. Default: true. */
  showHeader?: boolean;
  /** Optional row above the body, e.g. a caption. */
  caption?: ReactNode;
  /** Optional row below the actions, e.g. a summary. */
  footer?: ReactNode;
  /** Hide the "Add row" button (use when the row count is managed elsewhere). */
  hideAdd?: boolean;
  /** Minimum number of rows — Remove buttons disable at this count. */
  minRows?: number;
  /** Maximum number of rows — Add button disables at this count. */
  maxRows?: number;
  className?: string;
};

export function FieldArrayTable<TItem = Record<string, unknown>>(
  props: FieldArrayTableProps<TItem>
): ReactNode {
  const {
    name,
    columns,
    newRow,
    addLabel = "+ Add row",
    removeLabel = "Remove",
    showRowActions = true,
    showHeader = true,
    caption,
    footer,
    hideAdd = false,
    minRows,
    maxRows,
    className,
  } = props;

  const makeRow = (): TItem => {
    if (newRow) return newRow();
    const seed: Record<string, unknown> = {};
    for (const col of columns) seed[col.name] = "";
    return seed as TItem;
  };

  return (
    <FieldArray<TItem> name={name}>
      {(arr) => (
        <div data-fillament-array-table={name} className={className}>
          <table>
            {caption ? <caption>{caption}</caption> : null}
            {columns.some((c) => c.width != null) ? (
              <colgroup>
                {columns.map((c, i) => (
                  <col key={i} style={c.width != null ? { width: c.width } : undefined} />
                ))}
                {showRowActions ? <col /> : null}
              </colgroup>
            ) : null}
            {showHeader ? (
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.name} scope="col">
                      {c.label ?? c.name}
                      {c.required ? <span aria-hidden="true"> *</span> : null}
                    </th>
                  ))}
                  {showRowActions ? <th scope="col" aria-label="Row actions" /> : null}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {arr.items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (showRowActions ? 1 : 0)} data-fillament-empty>
                    No rows yet.
                  </td>
                </tr>
              ) : (
                arr.items.map((item) => (
                  <Row
                    key={item.key}
                    item={item}
                    columns={columns}
                    showRowActions={showRowActions}
                    removeLabel={removeLabel}
                    arr={arr}
                    minRows={minRows}
                  />
                ))
              )}
            </tbody>
            {footer ? <tfoot>{footer}</tfoot> : null}
          </table>
          {!hideAdd ? (
            <div data-fillament-array-add>
              <button
                type="button"
                onClick={() => arr.append(makeRow())}
                disabled={maxRows != null && arr.length >= maxRows}
              >
                {addLabel}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </FieldArray>
  );
}

function Row<TItem>({
  item,
  columns,
  showRowActions,
  removeLabel,
  arr,
  minRows,
}: {
  item: { key: string; index: number; value: TItem; path: (childPath: string) => string };
  columns: TableColumn[];
  showRowActions: boolean;
  removeLabel: string;
  arr: FieldArrayApi<TItem>;
  minRows?: number;
}) {
  const canRemove = minRows == null || arr.length > minRows;
  return (
    <tr data-fillament-row-index={item.index}>
      {columns.map((c) => {
        const fieldName = item.path(c.name);
        const custom = c.render?.({
          rowIndex: item.index,
          rowKey: item.key,
          rowValue: item.value,
          fieldName,
        });
        return (
          <td key={c.name} data-fillament-col={c.name}>
            {custom !== undefined ? (
              custom
            ) : (
              <Field
                name={fieldName}
                type={c.type}
                as={c.as}
                options={c.options}
                visibleWhen={c.visibleWhen}
                unmountBehavior={c.unmountBehavior}
                required={c.required}
                disabled={c.disabled}
                readOnly={c.readOnly}
                placeholder={c.placeholder}
                {...(c.fieldProps ?? {})}
              />
            )}
          </td>
        );
      })}
      {showRowActions ? (
        <td data-fillament-row-actions>
          <button
            type="button"
            aria-label="Move row up"
            disabled={item.index === 0}
            onClick={() => arr.move(item.index, item.index - 1)}
          >↑</button>
          <button
            type="button"
            aria-label="Move row down"
            disabled={item.index === arr.length - 1}
            onClick={() => arr.move(item.index, item.index + 1)}
          >↓</button>
          <button
            type="button"
            aria-label="Remove row"
            disabled={!canRemove}
            onClick={() => arr.remove(item.index)}
          >{removeLabel}</button>
        </td>
      ) : null}
    </tr>
  );
}
