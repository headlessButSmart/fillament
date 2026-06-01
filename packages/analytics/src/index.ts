import type { AnalyticsEvent, FormApi, Unsubscribe } from "@fillament/core";
import { aliasHash, isSensitiveFieldName, DEFAULT_SENSITIVE_FIELDS } from "./redaction.js";

export type AnalyticsAdapter = {
  name: string;
  track: (event: AnalyticsEvent) => void | Promise<void>;
  flush?: () => void | Promise<void>;
};

export type AnalyticsPluginOptions = {
  enabled?: boolean;
  adapter: AnalyticsAdapter | AnalyticsAdapter[];
  redact?: ReadonlyArray<string>;
  includeFieldNames?: boolean;
  includeValues?: boolean; // intentionally has no effect in v0.1; reserved for future
  formId?: string;
};

export type AnalyticsPlugin = {
  attach: (form: FormApi<any>) => Unsubscribe;
};

function sanitize(
  event: AnalyticsEvent,
  redact: ReadonlyArray<string>,
  includeFieldNames: boolean
): AnalyticsEvent {
  const out: AnalyticsEvent = { ...event };
  if (event.field) {
    const sensitive = isSensitiveFieldName(event.field, redact);
    if (sensitive || !includeFieldNames) {
      out.field = undefined;
      out.fieldHash = aliasHash(event.field);
    } else if (!out.fieldHash) {
      out.fieldHash = aliasHash(event.field);
    }
  }
  // never emit values
  if (out.meta) {
    out.meta = stripValueMeta(out.meta);
  }
  return out;
}

function stripValueMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k === "value" || k === "values") continue;
    cleaned[k] = v;
  }
  return cleaned;
}

export function createAnalyticsPlugin(options: AnalyticsPluginOptions): AnalyticsPlugin {
  const adapters = Array.isArray(options.adapter) ? options.adapter : [options.adapter];
  const enabled = options.enabled !== false;
  const includeFieldNames = options.includeFieldNames !== false;
  const redact = options.redact ?? [];

  return {
    attach(form) {
      if (!enabled) return () => {};
      return form.subscribeAnalytics((event) => {
        const cleaned = sanitize(event, redact, includeFieldNames);
        for (const a of adapters) {
          try {
            const result = a.track(cleaned);
            if (result && typeof (result as Promise<void>).catch === "function") {
              (result as Promise<void>).catch(() => {});
            }
          } catch {
            // Adapters should not break form behavior.
          }
        }
      });
    },
  };
}

// --- Built-in adapters ---

export function consoleAnalyticsAdapter(prefix = "[fillament]"): AnalyticsAdapter {
  return {
    name: "console",
    track(event) {
      // eslint-disable-next-line no-console
      console.log(prefix, event.type, event);
    },
  };
}

export function customAnalyticsAdapter(
  track: (event: AnalyticsEvent) => void | Promise<void>,
  name = "custom"
): AnalyticsAdapter {
  return { name, track };
}

// Light-touch adapters: do not require Segment/PostHog as deps.

export function segmentAnalyticsAdapter(analytics: {
  track: (event: string, properties: Record<string, unknown>) => void;
}): AnalyticsAdapter {
  return {
    name: "segment",
    track(event) {
      const { type, ...rest } = event;
      analytics.track(`form.${type}`, rest as Record<string, unknown>);
    },
  };
}

export function posthogAnalyticsAdapter(posthog: {
  capture: (event: string, properties: Record<string, unknown>) => void;
}): AnalyticsAdapter {
  return {
    name: "posthog",
    track(event) {
      const { type, ...rest } = event;
      posthog.capture(`form_${type}`, rest as Record<string, unknown>);
    },
  };
}

export { aliasHash, isSensitiveFieldName, DEFAULT_SENSITIVE_FIELDS };
export type { AnalyticsEvent } from "@fillament/core";
