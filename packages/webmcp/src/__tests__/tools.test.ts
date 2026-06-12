import { describe, it, expect } from "vitest";
import { createForm } from "@fillament/core";
import { webmcpPlugin } from "../plugin.js";
import { buildFormTools } from "../tools.js";
import type { ToolRegistrar, WebMCPTool } from "../types.js";

function createMockRegistrar() {
  const registered: WebMCPTool[] = [];
  const registrar: ToolRegistrar = {
    register(tool) {
      registered.push(tool);
      return () => {
        const i = registered.indexOf(tool);
        if (i >= 0) registered.splice(i, 1);
      };
    },
  };
  return { registrar, registered };
}

const adapter = {
  type: "custom",
  validate: async (values: any) => {
    const valid = typeof values.email === "string" && values.email.includes("@");
    return {
      valid,
      errors: valid ? {} : { email: [{ message: "Email is invalid" }] },
    };
  },
  introspect: () => ({
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
      address: {
        type: "object",
        required: ["city"],
        properties: { city: { type: "string" } },
      },
    },
  }),
};

function parse(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

describe("webmcpPlugin", () => {
  it("registers read + fill by default, not submit, and unregisters on dispose", () => {
    const { registrar, registered } = createMockRegistrar();
    const form = createForm({
      id: "signup",
      schema: adapter,
      plugins: [webmcpPlugin({ registrar })],
    });
    expect(registered.map((t) => t.name).sort()).toEqual(["signup_fill", "signup_get_state"]);
    (form as any).__disposePlugins();
    expect(registered).toHaveLength(0);
  });

  it("exposes submit only when enabled", () => {
    const { registrar, registered } = createMockRegistrar();
    createForm({
      id: "signup",
      schema: adapter,
      plugins: [webmcpPlugin({ registrar, expose: { submit: true } })],
    });
    expect(registered.map((t) => t.name)).toContain("signup_submit");
  });

  it("sanitizes tool name prefixes", () => {
    const { registrar, registered } = createMockRegistrar();
    createForm({
      schema: adapter,
      plugins: [webmcpPlugin({ registrar, name: "my checkout (v2)" })],
    });
    expect(registered.map((t) => t.name)).toContain("my_checkout_v2_fill");
  });
});

describe("fill tool", () => {
  it("applies flat and dot-path values and reports validation", async () => {
    const form = createForm({ id: "f", schema: adapter, defaultValues: { email: "", address: { city: "" } } });
    const tools = buildFormTools(form);
    const fill = tools.find((t) => t.name === "f_fill")!;

    const bad = parse(await fill.execute({ email: "nope", "address.city": "Berlin" }));
    expect(bad.valid).toBe(false);
    expect(bad.errors.email).toEqual(["Email is invalid"]);
    expect(form.getValue("address.city")).toBe("Berlin");

    const good = parse(await fill.execute({ email: "a@b.com" }));
    expect(good.valid).toBe(true);
    expect(good.applied).toEqual(["email"]);
  });

  it("publishes a relaxed inputSchema without required", () => {
    const form = createForm({ id: "f", schema: adapter });
    const fill = buildFormTools(form).find((t) => t.name === "f_fill")!;
    expect(fill.inputSchema.required).toBeUndefined();
    expect((fill.inputSchema as any).properties.address.required).toBeUndefined();
    expect((fill.inputSchema as any).properties.email.format).toBe("email");
  });
});

describe("get_state tool", () => {
  it("redacts sensitive fields by default", async () => {
    const form = createForm({ id: "f", schema: adapter, defaultValues: { email: "a@b.com", password: "hunter2" } });
    const read = buildFormTools(form).find((t) => t.name === "f_get_state")!;
    const state = parse(await read.execute({}));
    expect(state.values.email).toBe("a@b.com");
    expect(state.values.password).toBe("[redacted]");
  });

  it("honors custom redact paths", async () => {
    const form = createForm({ id: "f", schema: adapter, defaultValues: { email: "a@b.com" } });
    const read = buildFormTools(form, { redact: ["email"] }).find((t) => t.name === "f_get_state")!;
    const state = parse(await read.execute({}));
    expect(state.values.email).toBe("[redacted]");
  });
});

describe("submit tool", () => {
  function submitForm(opts: { confirm?: (values: any) => boolean | Promise<boolean>; onSubmit?: () => void }) {
    let submitted = 0;
    const form = createForm({
      id: "f",
      schema: adapter,
      defaultValues: { email: "" },
      onSubmit: () => {
        submitted += 1;
        opts.onSubmit?.();
      },
    });
    const submit = buildFormTools(form, {
      expose: { submit: true },
      confirmSubmit: opts.confirm,
    }).find((t) => t.name === "f_submit")!;
    return { form, submit, submittedCount: () => submitted };
  }

  it("refuses to submit an invalid form", async () => {
    const { submit, submittedCount } = submitForm({});
    const result = await submit.execute({});
    expect(result.isError).toBe(true);
    expect(parse(result).errors.email).toEqual(["Email is invalid"]);
    expect(submittedCount()).toBe(0);
  });

  it("submits a valid form", async () => {
    const { form, submit, submittedCount } = submitForm({});
    form.setValue("email", "a@b.com");
    const result = parse(await submit.execute({}));
    expect(result.submitted).toBe(true);
    expect(submittedCount()).toBe(1);
  });

  it("blocks when confirmSubmit declines", async () => {
    const { form, submit, submittedCount } = submitForm({ confirm: () => false });
    form.setValue("email", "a@b.com");
    const result = await submit.execute({});
    expect(result.isError).toBe(true);
    expect(submittedCount()).toBe(0);
  });

  it("treats a throwing confirmSubmit as declined", async () => {
    const { form, submit, submittedCount } = submitForm({
      confirm: () => {
        throw new Error("nope");
      },
    });
    form.setValue("email", "a@b.com");
    const result = await submit.execute({});
    expect(result.isError).toBe(true);
    expect(submittedCount()).toBe(0);
  });
});
