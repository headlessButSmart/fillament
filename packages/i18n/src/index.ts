import type { FillamentMessage } from "@fillament/core";

export type { FillamentMessage } from "@fillament/core";

export type MessageDict = Record<string, string>;

export interface MessageResolver {
  resolve(message: FillamentMessage): string;
}

export interface I18nAdapter {
  /** Resolve plain string or `{ key, values?, fallback? }` message. */
  t(message: FillamentMessage): string;
  /** Active locale. Mutates internally — observers can subscribe. */
  readonly locale: string;
  setLocale(locale: string): void;
  setMessages(locale: string, messages: MessageDict): void;
  subscribe(listener: () => void): () => void;
}

export interface CreateI18nOptions {
  locale: string;
  messages?: MessageDict | Record<string, MessageDict>;
  fallbackLocale?: string;
  /** Optional custom resolver — when provided, overrides built-in lookup. */
  resolver?: (key: string, locale: string) => string | undefined;
  /** Override the default `{name}` interpolation. */
  interpolate?: (template: string, values: Record<string, unknown>) => string;
}

const TOKEN_RE = /\{(\w+)\}/g;

export function defaultInterpolate(template: string, values: Record<string, unknown>): string {
  return template.replace(TOKEN_RE, (_match, name: string) => {
    const v = values[name];
    return v == null ? "" : String(v);
  });
}

function isNestedMessages(value: unknown): value is Record<string, MessageDict> {
  if (!value || typeof value !== "object") return false;
  for (const v of Object.values(value)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      // Heuristic: dict-of-dicts is treated as nested by locale.
      const first = Object.values(v)[0];
      if (typeof first === "string") return true;
    }
  }
  return false;
}

/**
 * Lightweight message resolution adapter. Not a full i18n framework — designed
 * to plug into Fillament's `FillamentMessage` type so adapters for intl /
 * i18next / lingui / etc. can layer on top.
 */
export function createI18n(options: CreateI18nOptions): I18nAdapter {
  let currentLocale = options.locale;
  const messagesByLocale: Record<string, MessageDict> = {};
  const fallbackLocale = options.fallbackLocale;
  const interpolate = options.interpolate ?? defaultInterpolate;
  const customResolver = options.resolver;
  const listeners = new Set<() => void>();

  if (options.messages) {
    if (isNestedMessages(options.messages)) {
      for (const [loc, dict] of Object.entries(options.messages)) {
        messagesByLocale[loc] = { ...(dict as MessageDict) };
      }
    } else {
      messagesByLocale[currentLocale] = { ...(options.messages as MessageDict) };
    }
  }

  function notify(): void {
    for (const l of listeners) l();
  }

  function lookup(key: string, locale: string): string | undefined {
    if (customResolver) {
      const custom = customResolver(key, locale);
      if (custom !== undefined) return custom;
    }
    return messagesByLocale[locale]?.[key];
  }

  function resolve(message: FillamentMessage): string {
    if (typeof message === "string") return message;
    if (!message || typeof message !== "object") return "";
    const { key, values, fallback } = message;
    let raw = lookup(key, currentLocale);
    if (raw === undefined && fallbackLocale && fallbackLocale !== currentLocale) {
      raw = lookup(key, fallbackLocale);
    }
    if (raw === undefined) raw = fallback;
    if (raw === undefined) return key;
    return values ? interpolate(raw, values) : raw;
  }

  return {
    get locale() {
      return currentLocale;
    },
    t: resolve,
    setLocale(locale) {
      if (locale === currentLocale) return;
      currentLocale = locale;
      notify();
    },
    setMessages(locale, dict) {
      messagesByLocale[locale] = { ...(messagesByLocale[locale] ?? {}), ...dict };
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function createMessageResolver(i18n: I18nAdapter): MessageResolver {
  return { resolve: (m) => i18n.t(m) };
}

/** One-shot resolver — useful when you already have a dictionary and don't need
 *  locale switching. */
export function resolveMessage(
  message: FillamentMessage,
  options: { messages?: MessageDict; interpolate?: typeof defaultInterpolate } = {}
): string {
  if (typeof message === "string") return message;
  if (!message || typeof message !== "object") return "";
  const { key, values, fallback } = message;
  const raw = options.messages?.[key] ?? fallback ?? key;
  const interp = options.interpolate ?? defaultInterpolate;
  return values ? interp(raw, values) : raw;
}
