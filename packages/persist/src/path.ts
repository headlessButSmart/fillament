// Lightweight, local path helpers so this package doesn't have to re-import
// internals from @fillament/core (whose path module is internal-only).
// Supports dot-paths and `arr.0.field` array indices.

export function parsePath(path: string): string[] {
  if (!path) return [];
  return path.split(".").filter((s) => s.length > 0);
}

export function getAt(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segs = parsePath(path);
  let cur: any = obj;
  for (const s of segs) {
    if (cur == null) return undefined;
    cur = cur[s];
  }
  return cur;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function setAt<T extends object>(obj: T, path: string, value: unknown): T {
  const segs = parsePath(path);
  if (segs.length === 0) return obj;
  const root: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
  let cur: any = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const k = segs[i]!;
    const next = cur[k];
    const nextKey = segs[i + 1]!;
    const isArrayIndex = /^\d+$/.test(nextKey);
    if (Array.isArray(next)) {
      cur[k] = [...next];
    } else if (isPlainObject(next)) {
      cur[k] = { ...next };
    } else {
      cur[k] = isArrayIndex ? [] : {};
    }
    cur = cur[k];
  }
  cur[segs[segs.length - 1]!] = value;
  return root as T;
}

// Walk the object and produce all leaf paths. Arrays produce numeric indices.
export function leafPaths(value: unknown, prefix = ""): string[] {
  if (value == null) return prefix ? [prefix] : [];
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const next = prefix ? `${prefix}.${i}` : String(i);
      out.push(...leafPaths(value[i], next));
    }
    return out;
  }
  if (isPlainObject(value)) {
    const out: string[] = [];
    for (const [k, v] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${k}` : k;
      out.push(...leafPaths(v, next));
    }
    return out;
  }
  return prefix ? [prefix] : [];
}

// True when `path` matches any of `patterns`. A pattern matches when it equals
// the path or is a prefix segment of it (so `address` matches `address.city`).
export function matchesAny(path: string, patterns: string[]): boolean {
  for (const pat of patterns) {
    if (pat === path) return true;
    if (path.startsWith(pat + ".")) return true;
  }
  return false;
}
