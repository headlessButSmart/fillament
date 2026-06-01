import { describe, it, expect, vi } from "vitest";
import { createForm } from "@fillament/core";
import { createAnalyticsPlugin, customAnalyticsAdapter, isSensitiveFieldName } from "../index.js";

describe("analytics plugin", () => {
  it("redacts sensitive field names by default", () => {
    const events: any[] = [];
    const plugin = createAnalyticsPlugin({
      adapter: customAnalyticsAdapter((e) => events.push(e)),
    });
    const form = createForm<{ password: string }>({ defaultValues: { password: "" } });
    plugin.attach(form);

    form.setValue("password", "secret");
    const changed = events.find((e) => e.type === "field_changed");
    expect(changed.field).toBeUndefined();
    expect(changed.fieldHash).toMatch(/^h_/);
  });

  it("includes non-sensitive field names by default", () => {
    const events: any[] = [];
    const plugin = createAnalyticsPlugin({
      adapter: customAnalyticsAdapter((e) => events.push(e)),
    });
    const form = createForm<{ firstName: string }>({ defaultValues: { firstName: "" } });
    plugin.attach(form);
    form.setValue("firstName", "Ana");
    const changed = events.find((e) => e.type === "field_changed");
    expect(changed.field).toBe("firstName");
  });

  it("respects extra redact list", () => {
    const events: any[] = [];
    const plugin = createAnalyticsPlugin({
      adapter: customAnalyticsAdapter((e) => events.push(e)),
      redact: ["coupon"],
    });
    const form = createForm<{ coupon: string }>({ defaultValues: { coupon: "" } });
    plugin.attach(form);
    form.setValue("coupon", "X");
    const changed = events.find((e) => e.type === "field_changed");
    expect(changed.field).toBeUndefined();
  });

  it("detects sensitive names", () => {
    expect(isSensitiveFieldName("user.password")).toBe(true);
    expect(isSensitiveFieldName("user.firstName")).toBe(false);
  });
});
