// Sensitive-value redaction for get_state results. Same spirit as
// @fillament/persist's exclusions: secrets never leave the page by default.

const DEFAULT_SENSITIVE = /password|passcode|secret|token|apikey|api_key|card|cvv|cvc|ssn|iban|pin/i;

export function defaultIsSensitivePath(path: string): boolean {
  return DEFAULT_SENSITIVE.test(path);
}

export function buildRedactPredicate(
  redact?: string[] | ((path: string) => boolean)
): (path: string) => boolean {
  if (typeof redact === "function") return redact;
  const extra = (redact ?? []).map((p) => p.toLowerCase());
  return (path: string) => {
    if (defaultIsSensitivePath(path)) return true;
    const lower = path.toLowerCase();
    return extra.some((p) => lower === p || lower.startsWith(`${p}.`));
  };
}

const REDACTED = "[redacted]";

export function redactValues(
  values: unknown,
  isSensitive: (path: string) => boolean,
  parent = ""
): unknown {
  if (values === null || typeof values !== "object") return values;
  if (Array.isArray(values)) {
    return values.map((item, i) => redactValues(item, isSensitive, parent ? `${parent}.${i}` : String(i)));
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
    const path = parent ? `${parent}.${key}` : key;
    out[key] = isSensitive(path) ? REDACTED : redactValues(value, isSensitive, path);
  }
  return out;
}
