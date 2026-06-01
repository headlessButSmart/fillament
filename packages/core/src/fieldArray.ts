import { getValueAtPath, setValueAtPath, isPathUnder } from "./path.js";
import type { FormApi } from "./form.js";

export type FieldArrayItem<TItem> = {
  key: string;
  index: number;
  value: TItem;
  path: (childPath: string) => string;
};

export type FieldArrayApi<TItem = unknown> = {
  name: string;
  items: FieldArrayItem<TItem>[];
  length: number;
  append: (item: TItem) => void;
  prepend: (item: TItem) => void;
  insert: (index: number, item: TItem) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  swap: (a: number, b: number) => void;
  replace: (items: TItem[]) => void;
};

// Each field array keeps a stable key per index, separate from the array itself.
// On reorder we permute the keys, so React subtrees keep identity.
const keyRegistry = new WeakMap<FormApi<any>, Map<string, string[]>>();
let keyCounter = 0;

function nextKey(): string {
  keyCounter += 1;
  return `k_${keyCounter}`;
}

function getKeys(form: FormApi<any>, name: string, length: number): string[] {
  let perForm = keyRegistry.get(form);
  if (!perForm) {
    perForm = new Map();
    keyRegistry.set(form, perForm);
  }
  let keys = perForm.get(name);
  if (!keys) {
    keys = [];
    perForm.set(name, keys);
  }
  while (keys.length < length) keys.push(nextKey());
  if (keys.length > length) keys.length = length;
  return keys;
}

function setKeys(form: FormApi<any>, name: string, keys: string[]): void {
  let perForm = keyRegistry.get(form);
  if (!perForm) {
    perForm = new Map();
    keyRegistry.set(form, perForm);
  }
  perForm.set(name, keys);
}

function rebaseSubtree(form: FormApi<any>, oldBase: string, newBase: string): void {
  if (oldBase === newBase) return;
  const state = form.getState();

  // Rebase touched and errors keys
  const touched = state.touched;
  const errors = state.errors;
  const oldPrefix = oldBase + ".";
  const newPrefix = newBase + ".";

  for (const k of Object.keys(touched)) {
    if (isPathUnder(oldBase, k) && k !== oldBase) {
      const rebased = newPrefix + k.slice(oldPrefix.length);
      touched[rebased] = touched[k]!;
      delete touched[k];
    }
  }
  for (const k of Object.keys(errors)) {
    if (isPathUnder(oldBase, k) && k !== oldBase) {
      const rebased = newPrefix + k.slice(oldPrefix.length);
      errors[rebased] = errors[k]!;
      delete errors[k];
    }
  }
}

export function createFieldArray<TItem = unknown>(
  form: FormApi<any>,
  name: string
): FieldArrayApi<TItem> {
  const arr = (getValueAtPath<TItem[]>(form.getValues(), name) ?? []) as TItem[];
  const keys = getKeys(form, name, arr.length);

  const items: FieldArrayItem<TItem>[] = arr.map((value, index) => ({
    key: keys[index]!,
    index,
    value,
    path: (childPath: string) => (childPath ? `${name}.${index}.${childPath}` : `${name}.${index}`),
  }));

  const writeArray = (next: TItem[], nextKeys: string[]) => {
    setKeys(form, name, nextKeys);
    form.setValue(name, next);
  };

  function append(item: TItem): void {
    const cur = (getValueAtPath<TItem[]>(form.getValues(), name) ?? []).slice();
    cur.push(item);
    const ks = getKeys(form, name, cur.length - 1).slice();
    ks.push(nextKey());
    writeArray(cur, ks);
  }

  function prepend(item: TItem): void {
    insert(0, item);
  }

  function insert(index: number, item: TItem): void {
    const cur = (getValueAtPath<TItem[]>(form.getValues(), name) ?? []).slice();
    cur.splice(index, 0, item);
    const ks = getKeys(form, name, cur.length - 1).slice();
    ks.splice(index, 0, nextKey());
    // shift touched/errors at index..end up by one
    for (let i = cur.length - 1; i > index; i--) {
      rebaseSubtree(form, `${name}.${i - 1}`, `${name}.${i}`);
    }
    writeArray(cur, ks);
  }

  function remove(index: number): void {
    const cur = (getValueAtPath<TItem[]>(form.getValues(), name) ?? []).slice();
    if (index < 0 || index >= cur.length) return;
    cur.splice(index, 1);
    const ks = getKeys(form, name, cur.length + 1).slice();
    ks.splice(index, 1);
    // clear state at the removed index then shift trailing indices down
    const state = form.getState();
    const oldBase = `${name}.${index}`;
    for (const k of Object.keys(state.touched)) {
      if (isPathUnder(oldBase, k)) delete state.touched[k];
    }
    for (const k of Object.keys(state.errors)) {
      if (isPathUnder(oldBase, k)) delete state.errors[k];
    }
    for (let i = index; i < cur.length; i++) {
      rebaseSubtree(form, `${name}.${i + 1}`, `${name}.${i}`);
    }
    writeArray(cur, ks);
  }

  function move(from: number, to: number): void {
    const cur = (getValueAtPath<TItem[]>(form.getValues(), name) ?? []).slice();
    if (from < 0 || from >= cur.length || to < 0 || to >= cur.length) return;
    const [moved] = cur.splice(from, 1);
    cur.splice(to, 0, moved as TItem);
    const ks = getKeys(form, name, cur.length).slice();
    const [movedKey] = ks.splice(from, 1);
    ks.splice(to, 0, movedKey!);
    // rebase subtree of `from` to a temporary, then shift, then place into `to`
    const tmp = `${name}.__tmp__`;
    rebaseSubtree(form, `${name}.${from}`, tmp);
    if (from < to) {
      for (let i = from; i < to; i++) {
        rebaseSubtree(form, `${name}.${i + 1}`, `${name}.${i}`);
      }
    } else {
      for (let i = from; i > to; i--) {
        rebaseSubtree(form, `${name}.${i - 1}`, `${name}.${i}`);
      }
    }
    rebaseSubtree(form, tmp, `${name}.${to}`);
    writeArray(cur, ks);
  }

  function swap(a: number, b: number): void {
    const cur = (getValueAtPath<TItem[]>(form.getValues(), name) ?? []).slice();
    if (a < 0 || a >= cur.length || b < 0 || b >= cur.length || a === b) return;
    const tmp = cur[a] as TItem;
    cur[a] = cur[b] as TItem;
    cur[b] = tmp;
    const ks = getKeys(form, name, cur.length).slice();
    const k = ks[a]!;
    ks[a] = ks[b]!;
    ks[b] = k;
    // swap touched/errors via temp
    const tmpBase = `${name}.__swap_tmp__`;
    rebaseSubtree(form, `${name}.${a}`, tmpBase);
    rebaseSubtree(form, `${name}.${b}`, `${name}.${a}`);
    rebaseSubtree(form, tmpBase, `${name}.${b}`);
    writeArray(cur, ks);
  }

  function replace(nextItems: TItem[]): void {
    const ks: string[] = nextItems.map(() => nextKey());
    setKeys(form, name, ks);
    // clear any errors/touched under this array
    const state = form.getState();
    for (const k of Object.keys(state.touched)) {
      if (isPathUnder(name, k) && k !== name) delete state.touched[k];
    }
    for (const k of Object.keys(state.errors)) {
      if (isPathUnder(name, k) && k !== name) delete state.errors[k];
    }
    form.setValue(name, nextItems);
  }

  return {
    name,
    items,
    length: items.length,
    append,
    prepend,
    insert,
    remove,
    move,
    swap,
    replace,
  };
}
