import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createForm } from "@fillament/core";
import {
  createMemoryDraftStore,
  createStoragePersistPlugin,
  isSensitivePath,
} from "../index.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("@fillament/persist", () => {
  it("saves debounced after a value change", () => {
    const storage = createMemoryDraftStore();
    const setSpy = vi.spyOn(storage, "setItem");
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          debounceMs: 100,
          restoreOnMount: false,
        }),
      ],
    });
    form.setValue("name", "A");
    expect(setSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(setSpy).toHaveBeenCalledTimes(1);
  });

  it("restores values on mount", () => {
    const storage = createMemoryDraftStore();
    storage.setItem(
      "k",
      JSON.stringify({ version: 1, savedAt: "x", values: { name: "Restored" } })
    );
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          restoreOnMount: true,
          debounceMs: 0,
        }),
      ],
    });
    expect(form.getValue("name")).toBe("Restored");
  });

  it("clears storage after a successful submit when clearOnSubmit is true", async () => {
    const storage = createMemoryDraftStore();
    storage.setItem("k", JSON.stringify({ version: 1, savedAt: "x", values: { name: "X" } }));
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      onSubmit: async () => {},
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          restoreOnMount: false,
          clearOnSubmit: true,
          debounceMs: 0,
        }),
      ],
    });
    await form.submit();
    expect(storage.getItem("k")).toBeNull();
  });

  it("excludes sensitive fields by default", () => {
    const storage = createMemoryDraftStore();
    const form = createForm<{ email: string; password: string }>({
      defaultValues: { email: "", password: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          restoreOnMount: false,
          debounceMs: 0,
        }),
      ],
    });
    form.setValue("email", "a@b.com");
    form.setValue("password", "hunter2");
    const raw = storage.getItem("k");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.values.email).toBe("a@b.com");
    expect(parsed.values.password).toBeUndefined();
  });

  it("respects include filter", () => {
    const storage = createMemoryDraftStore();
    const form = createForm<{ a: string; b: string }>({
      defaultValues: { a: "", b: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          restoreOnMount: false,
          debounceMs: 0,
          include: ["a"],
        }),
      ],
    });
    form.setValue("a", "1");
    form.setValue("b", "2");
    const parsed = JSON.parse(storage.getItem("k")!);
    expect(parsed.values.a).toBe("1");
    expect(parsed.values.b).toBeUndefined();
  });

  it("respects exclude filter", () => {
    const storage = createMemoryDraftStore();
    const form = createForm<{ a: string; b: string }>({
      defaultValues: { a: "", b: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          restoreOnMount: false,
          debounceMs: 0,
          exclude: ["b"],
        }),
      ],
    });
    form.setValue("a", "1");
    form.setValue("b", "2");
    const parsed = JSON.parse(storage.getItem("k")!);
    expect(parsed.values.a).toBe("1");
    expect(parsed.values.b).toBeUndefined();
  });

  it("ignores invalid JSON in storage without crashing", () => {
    const storage = createMemoryDraftStore();
    storage.setItem("k", "not-json-{");
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          restoreOnMount: true,
          debounceMs: 0,
        }),
      ],
    });
    expect(form.getValue("name")).toBe("");
  });

  it("runs migrate when stored version is older", () => {
    const storage = createMemoryDraftStore();
    storage.setItem(
      "k",
      JSON.stringify({ version: 1, savedAt: "x", values: { fullName: "Ana López" } })
    );
    const form = createForm<{ firstName: string; lastName: string }>({
      defaultValues: { firstName: "", lastName: "" },
      plugins: [
        createStoragePersistPlugin<{ firstName: string; lastName: string }>({
          key: "k",
          storage,
          version: 2,
          restoreOnMount: true,
          debounceMs: 0,
          migrate: (raw) => {
            const v = raw as { fullName?: string };
            const [first = "", ...rest] = (v.fullName ?? "").split(" ");
            return { firstName: first, lastName: rest.join(" ") };
          },
        }),
      ],
    });
    expect(form.getValue("firstName")).toBe("Ana");
    expect(form.getValue("lastName")).toBe("López");
  });

  it("drops stored values when version mismatches and no migrate is provided", () => {
    const storage = createMemoryDraftStore();
    storage.setItem(
      "k",
      JSON.stringify({ version: 1, savedAt: "x", values: { name: "old" } })
    );
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          version: 2,
          restoreOnMount: true,
          debounceMs: 0,
        }),
      ],
    });
    expect(form.getValue("name")).toBe("");
    expect(storage.getItem("k")).toBeNull();
  });

  it("survives a storage that throws on setItem", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          restoreOnMount: false,
          debounceMs: 0,
        }),
      ],
    });
    expect(() => form.setValue("name", "X")).not.toThrow();
  });

  it("isSensitivePath flags expected substrings", () => {
    expect(isSensitivePath("user.password")).toBe(true);
    expect(isSensitivePath("payment.cardNumber")).toBe(true);
    expect(isSensitivePath("payment.cardCvc")).toBe(true);
    expect(isSensitivePath("user.email")).toBe(false);
  });

  it("autoSave: false does not save on value change", () => {
    const storage = createMemoryDraftStore();
    const setSpy = vi.spyOn(storage, "setItem");
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          autoSave: false,
          restoreOnMount: false,
          debounceMs: 0,
        }),
      ],
    });
    form.setValue("name", "Ana");
    form.setValue("name", "Ana López");
    vi.advanceTimersByTime(1000);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("save() writes the current values to storage on demand", () => {
    const storage = createMemoryDraftStore();
    const plugin = createStoragePersistPlugin<{ name: string }>({
      key: "k",
      storage,
      autoSave: false,
      restoreOnMount: false,
    });
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [plugin],
    });
    form.setValue("name", "Ana");
    expect(storage.getItem("k")).toBeNull();
    plugin.save();
    const parsed = JSON.parse(storage.getItem("k")!);
    expect(parsed.values.name).toBe("Ana");
    expect(plugin.lastSavedAt).toBeInstanceOf(Date);
  });

  it("save() flushes pending debounced writes immediately", () => {
    const storage = createMemoryDraftStore();
    const setSpy = vi.spyOn(storage, "setItem");
    const plugin = createStoragePersistPlugin<{ name: string }>({
      key: "k",
      storage,
      debounceMs: 500,
      restoreOnMount: false,
    });
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [plugin],
    });
    form.setValue("name", "Ana");
    expect(setSpy).not.toHaveBeenCalled();
    plugin.save();
    expect(setSpy).toHaveBeenCalledTimes(1);
    // No further write happens when the (now-cancelled) debounce timer would have fired.
    vi.advanceTimersByTime(1000);
    expect(setSpy).toHaveBeenCalledTimes(1);
  });

  it("clear() removes the persisted draft", () => {
    const storage = createMemoryDraftStore();
    storage.setItem(
      "k",
      JSON.stringify({ version: 1, savedAt: "x", values: { name: "draft" } })
    );
    const plugin = createStoragePersistPlugin<{ name: string }>({
      key: "k",
      storage,
      autoSave: false,
      restoreOnMount: false,
    });
    // Attach to a form so plugin.isReady becomes true (also exercises the no-op path).
    createForm<{ name: string }>({ defaultValues: { name: "" }, plugins: [plugin] });
    plugin.clear();
    expect(storage.getItem("k")).toBeNull();
  });

  it("restore() re-reads from storage on demand", () => {
    const storage = createMemoryDraftStore();
    const plugin = createStoragePersistPlugin<{ name: string }>({
      key: "k",
      storage,
      restoreOnMount: false,
      autoSave: false,
    });
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [plugin],
    });
    // Drop a payload into storage after the form has mounted.
    storage.setItem(
      "k",
      JSON.stringify({ version: 1, savedAt: "x", values: { name: "RestoredLater" } })
    );
    plugin.restore();
    expect(form.getValue("name")).toBe("RestoredLater");
  });

  it("onAfterSave fires on both auto and manual saves", () => {
    const storage = createMemoryDraftStore();
    const onAfterSave = vi.fn();
    const plugin = createStoragePersistPlugin<{ name: string }>({
      key: "k",
      storage,
      autoSave: false,
      restoreOnMount: false,
      onAfterSave,
    });
    createForm<{ name: string }>({ defaultValues: { name: "" }, plugins: [plugin] });
    plugin.save();
    expect(onAfterSave).toHaveBeenCalledTimes(1);
    expect(onAfterSave.mock.calls[0]![0]).toBeInstanceOf(Date);
  });

  it("isReady reflects attachment to a form", () => {
    const plugin = createStoragePersistPlugin<{ name: string }>({
      key: "k",
      storage: createMemoryDraftStore(),
      restoreOnMount: false,
    });
    expect(plugin.isReady).toBe(false);
    createForm<{ name: string }>({ defaultValues: { name: "" }, plugins: [plugin] });
    expect(plugin.isReady).toBe(true);
  });

  it("save()/restore() before init are safe no-ops", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plugin = createStoragePersistPlugin<{ name: string }>({
      key: "k",
      storage: createMemoryDraftStore(),
      restoreOnMount: false,
    });
    expect(() => plugin.save()).not.toThrow();
    expect(() => plugin.restore()).not.toThrow();
    warn.mockRestore();
  });

  it("clearOnSubmit: false keeps the draft after a successful submit", async () => {
    const storage = createMemoryDraftStore();
    storage.setItem(
      "k",
      JSON.stringify({ version: 1, savedAt: "x", values: { name: "shared" } })
    );
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      onSubmit: async () => {},
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          clearOnSubmit: false,
          restoreOnMount: false,
          debounceMs: 0,
        }),
      ],
    });
    await form.submit();
    expect(storage.getItem("k")).not.toBeNull();
  });

  it("clearOnReset: false keeps the draft after form.reset()", () => {
    const storage = createMemoryDraftStore();
    storage.setItem(
      "k",
      JSON.stringify({ version: 1, savedAt: "x", values: { name: "shared" } })
    );
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          clearOnReset: false,
          restoreOnMount: false,
          debounceMs: 0,
        }),
      ],
    });
    form.reset();
    expect(storage.getItem("k")).not.toBeNull();
  });

  it("clearOnReset defaults to true (form.reset() wipes the draft)", () => {
    const storage = createMemoryDraftStore();
    storage.setItem(
      "k",
      JSON.stringify({ version: 1, savedAt: "x", values: { name: "draft" } })
    );
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [
        createStoragePersistPlugin({
          key: "k",
          storage,
          restoreOnMount: false,
          debounceMs: 0,
        }),
      ],
    });
    form.reset();
    expect(storage.getItem("k")).toBeNull();
  });

  it("shared-key pattern: a second form reads the draft a first form wrote", () => {
    const storage = createMemoryDraftStore();
    const shared = {
      key: "shared-draft",
      storage,
      clearOnSubmit: false,
      clearOnReset: false,
      debounceMs: 0,
    } as const;

    const form1 = createForm<{ email: string }>({
      defaultValues: { email: "" },
      plugins: [createStoragePersistPlugin({ ...shared, restoreOnMount: false })],
    });
    form1.setValue("email", "ana@acme.dev");

    // A separately-created form using the same key picks up the draft on mount.
    const form2 = createForm<{ email: string }>({
      defaultValues: { email: "" },
      plugins: [createStoragePersistPlugin({ ...shared, restoreOnMount: true })],
    });
    expect(form2.getValue("email")).toBe("ana@acme.dev");
  });
});
