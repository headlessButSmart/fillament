import { describe, it, expect, vi } from "vitest";
import { createI18n, createMessageResolver, resolveMessage } from "../index.js";

describe("@fillament/i18n", () => {
  it("resolves plain strings as-is", () => {
    const i18n = createI18n({ locale: "en" });
    expect(i18n.t("Hello world")).toBe("Hello world");
  });

  it("resolves keyed messages from the dictionary", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { "user.email.label": "Email" },
    });
    expect(i18n.t({ key: "user.email.label" })).toBe("Email");
  });

  it("falls back to the fallback string when the key is missing", () => {
    const i18n = createI18n({ locale: "en", messages: {} });
    expect(i18n.t({ key: "missing.key", fallback: "Default" })).toBe("Default");
  });

  it("returns the key when no fallback and no message exists", () => {
    const i18n = createI18n({ locale: "en", messages: {} });
    expect(i18n.t({ key: "missing.key" })).toBe("missing.key");
  });

  it("interpolates {token} placeholders", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { "field.minLength": "Must be at least {min} characters" },
    });
    expect(
      i18n.t({ key: "field.minLength", values: { min: 8 } })
    ).toBe("Must be at least 8 characters");
  });

  it("switches locale and notifies subscribers", () => {
    const i18n = createI18n({
      locale: "en",
      messages: {
        en: { greet: "Hello" },
        pt: { greet: "Olá" },
      } as any,
    });
    const listener = vi.fn();
    const unsub = i18n.subscribe(listener);
    expect(i18n.t({ key: "greet" })).toBe("Hello");
    i18n.setLocale("pt");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(i18n.t({ key: "greet" })).toBe("Olá");
    unsub();
  });

  it("uses a custom resolver when provided", () => {
    const i18n = createI18n({
      locale: "en",
      resolver: (key) => (key === "x" ? "X-value" : undefined),
    });
    expect(i18n.t({ key: "x" })).toBe("X-value");
    expect(i18n.t({ key: "y", fallback: "fb" })).toBe("fb");
  });

  it("createMessageResolver wraps the adapter", () => {
    const i18n = createI18n({ locale: "en", messages: { hi: "Hello" } });
    const resolver = createMessageResolver(i18n);
    expect(resolver.resolve({ key: "hi" })).toBe("Hello");
  });

  it("resolveMessage one-shot helper resolves with provided dict", () => {
    expect(
      resolveMessage(
        { key: "field.min", values: { n: 3 }, fallback: "Min {n}" },
        { messages: {} }
      )
    ).toBe("Min 3");
  });

  it("falls back to fallbackLocale when the message is missing in current locale", () => {
    const i18n = createI18n({
      locale: "pt",
      fallbackLocale: "en",
      messages: {
        en: { greet: "Hello" },
      } as any,
    });
    expect(i18n.t({ key: "greet" })).toBe("Hello");
  });
});
