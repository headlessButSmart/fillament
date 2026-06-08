import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { remoteOptions, remoteValidation, remoteDefaultValue } from "../index.js";

// Drain pending microtasks under fake timers. `vi.advanceTimersByTimeAsync(0)`
// processes the microtask queue without advancing wall-clock time.
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("remoteOptions", () => {
  it("fetches and maps options on first tick", async () => {
    const fetcher = vi.fn(async () => [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }]);
    const create = remoteOptions({
      key: ["countries"],
      fetcher,
      mapOption: (c: any) => ({ label: c.name, value: c.id }),
    });
    const handle = create({});
    expect(handle.getSnapshot().status).toBe("loading");
    await vi.runAllTimersAsync();
    const snap = handle.getSnapshot();
    expect(snap.status).toBe("success");
    expect(snap.data).toEqual([
      { label: "Alpha", value: "a" },
      { label: "Beta", value: "b" },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it("does not fetch when enabled is false", async () => {
    const fetcher = vi.fn(async () => []);
    const create = remoteOptions({
      key: ["x"],
      fetcher,
      enabled: false,
    });
    const handle = create({});
    await vi.runAllTimersAsync();
    expect(fetcher).not.toHaveBeenCalled();
    expect(handle.getSnapshot().status).toBe("idle");
    handle.dispose();
  });

  it("debounces fetches", async () => {
    const fetcher = vi.fn(async () => []);
    const create = remoteOptions<{ q: string }>({
      key: (ctx) => ["search", ctx.values.q],
      fetcher,
      debounceMs: 200,
    });
    const handle = create({ q: "a" });
    expect(fetcher).not.toHaveBeenCalled();
    handle.update({ q: "ab" });
    handle.update({ q: "abc" });
    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it("re-fetches when a dependent key changes", async () => {
    const fetcher = vi.fn(async (ctx: any) => [{ id: ctx.values.country, name: "X" }]);
    const create = remoteOptions<{ country: string | null }>({
      key: (ctx) => ["cities", ctx.values.country],
      enabled: (ctx) => Boolean(ctx.values.country),
      fetcher,
    });
    const handle = create({ country: null });
    await vi.runAllTimersAsync();
    expect(fetcher).not.toHaveBeenCalled();
    handle.update({ country: "PT" });
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(1);
    handle.update({ country: "ES" });
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(2);
    handle.dispose();
  });

  it("protects against stale responses", async () => {
    let resolveFirst!: (v: any) => void;
    let resolveSecond!: (v: any) => void;
    const fetcher = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));
    const create = remoteOptions<{ q: string }>({
      key: (ctx) => ["search", ctx.values.q],
      fetcher: fetcher as any,
    });
    const handle = create({ q: "a" });
    handle.update({ q: "b" }); // triggers a 2nd fetch and aborts the first
    // Resolve the OLDER one second — should be ignored.
    resolveSecond([{ id: "new", name: "New" }]);
    await flush();
    resolveFirst([{ id: "old", name: "Old" }]);
    await flush();
    const data = handle.getSnapshot().data!;
    expect(data).toHaveLength(1);
    expect(data[0]!.label).toBe("New");
    expect(data[0]!.value).toBe("new");
    handle.dispose();
  });

  it("reports errors via onError and exposes error snapshot", async () => {
    const onError = vi.fn();
    const create = remoteOptions({
      key: ["fail"],
      fetcher: async () => {
        throw new Error("network down");
      },
      onError,
    });
    const handle = create({});
    await vi.runAllTimersAsync();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(handle.getSnapshot().status).toBe("error");
    handle.dispose();
  });
});

describe("remoteValidation", () => {
  it("returns undefined when fetcher returns undefined (valid)", async () => {
    const v = remoteValidation({
      fetcher: async () => undefined,
    });
    const result = await v.validate("email", "a@b.com", {});
    expect(result).toBeUndefined();
    v.dispose();
  });

  it("returns the message when fetcher returns a string", async () => {
    const v = remoteValidation({
      fetcher: async () => "Email taken",
    });
    const result = await v.validate("email", "a@b.com", {});
    expect(result).toBe("Email taken");
    v.dispose();
  });

  it("debounces and only resolves the latest validation", async () => {
    const calls: string[] = [];
    const v = remoteValidation({
      debounceMs: 100,
      fetcher: async ({ value }) => {
        calls.push(String(value));
        return value === "final" ? "Taken" : undefined;
      },
    });
    const p1 = v.validate("email", "first", {});
    const p2 = v.validate("email", "final", {});
    await vi.advanceTimersByTimeAsync(200);
    const [r1, r2] = await Promise.all([p1, p2]);
    // r1 should resolve undefined because it was superseded.
    expect(r1).toBeUndefined();
    expect(r2).toBe("Taken");
    expect(calls).toEqual(["final"]);
    v.dispose();
  });

  it("maps network errors via onError", async () => {
    const v = remoteValidation({
      fetcher: async () => {
        throw new Error("offline");
      },
      onError: () => "Unable to validate",
    });
    const result = await v.validate("email", "x", {});
    expect(result).toBe("Unable to validate");
    v.dispose();
  });
});

describe("remoteDefaultValue", () => {
  it("loads once and exposes data", async () => {
    const create = remoteDefaultValue<{}, { name: string }>({
      key: ["profile"],
      fetcher: async () => ({ name: "Ana" }),
    });
    const handle = create({});
    await vi.runAllTimersAsync();
    expect(handle.getSnapshot().data).toEqual({ name: "Ana" });
    handle.dispose();
  });
});
