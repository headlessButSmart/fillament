// Path utilities for nested object / array access.
// Paths use dot syntax: "user.address.city", "contacts.0.email"

export type PathSegment = string | number;

export function parsePath(path: string): PathSegment[] {
  if (!path) return [];
  return path.split(".").map((seg) => {
    if (seg === "") return seg;
    const asNum = Number(seg);
    return Number.isInteger(asNum) && String(asNum) === seg ? asNum : seg;
  });
}

export function joinPath(segments: PathSegment[]): string {
  return segments.map(String).join(".");
}

export function getValueAtPath<T = unknown>(obj: unknown, path: string): T | undefined {
  if (obj == null || !path) return obj as T;
  const segments = parsePath(path);
  let current: any = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    current = current[seg as any];
  }
  return current as T;
}

function isIndex(seg: PathSegment): seg is number {
  return typeof seg === "number";
}

function clone(value: any): any {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === "object") return { ...value };
  return value;
}

export function setValueAtPath<T extends object>(obj: T, path: string, value: unknown): T {
  if (!path) return value as T;
  const segments = parsePath(path);
  const root: any = obj == null ? (isIndex(segments[0]!) ? [] : {}) : clone(obj);
  let parent: any = root;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const isLast = i === segments.length - 1;

    if (isLast) {
      parent[seg as any] = value;
      break;
    }

    const next = parent[seg as any];
    const childIsIndex = isIndex(segments[i + 1]!);
    const cloned = next == null ? (childIsIndex ? [] : {}) : clone(next);
    parent[seg as any] = cloned;
    parent = cloned;
  }

  return root as T;
}

export function deleteValueAtPath<T extends object>(obj: T, path: string): T {
  if (!path) return obj;
  const segments = parsePath(path);
  if (obj == null) return obj;

  const root: any = clone(obj);
  let parent: any = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const next = parent[seg as any];
    if (next == null) return root;
    const cloned = clone(next);
    parent[seg as any] = cloned;
    parent = cloned;
  }

  const lastSeg = segments[segments.length - 1]!;
  if (Array.isArray(parent) && typeof lastSeg === "number") {
    parent.splice(lastSeg, 1);
  } else {
    delete parent[lastSeg as any];
  }
  return root as T;
}

export function hasPath(obj: unknown, path: string): boolean {
  if (!path || obj == null) return false;
  const segments = parsePath(path);
  let current: any = obj;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (current == null || typeof current !== "object") return false;
    if (!(seg in current)) return false;
    current = current[seg];
  }
  return true;
}

// Compare two values shallowly for equality. Used for dirty tracking.
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if (!isEqual((a as any)[k], (b as any)[k])) return false;
    }
    return true;
  }

  return false;
}

// Prefix matching for subscriptions: does childPath sit under parentPath?
// e.g. parent "address" matches child "address.city" and "address"
export function isPathUnder(parent: string, child: string): boolean {
  if (parent === "" || parent === child) return true;
  return child.startsWith(parent + ".");
}
