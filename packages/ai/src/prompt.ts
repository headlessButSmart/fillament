// Default sensitive field names — synced with @fillament/analytics defaults.
// We re-list here so the package doesn't need analytics as a runtime dep.
const DEFAULT_SENSITIVE_FIELDS: ReadonlyArray<string> = [
  "password",
  "passcode",
  "token",
  "secret",
  "ssn",
  "socialSecurityNumber",
  "cardNumber",
  "creditCard",
  "cvv",
  "cvc",
  "iban",
  "routingNumber",
  "accountNumber",
  "dob",
  "dateOfBirth",
];

export function isSensitive(name: string, extra: ReadonlyArray<string> = []): boolean {
  if (!name) return false;
  const set = new Set([...DEFAULT_SENSITIVE_FIELDS, ...extra].map((s) => s.toLowerCase()));
  return name
    .split(".")
    .some((seg) => set.has(seg.toLowerCase()));
}

// Walk a values object and redact any path that ends in a sensitive segment.
export function redactValues(
  values: unknown,
  redact: ReadonlyArray<string>,
  prefix = ""
): unknown {
  if (values == null || typeof values !== "object") return values;
  if (Array.isArray(values)) {
    return values.map((v, i) => redactValues(v, redact, prefix ? `${prefix}.${i}` : String(i)));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isSensitive(path, redact)) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      out[k] = redactValues(v, redact, path);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const DEFAULT_SYSTEM_PROMPT = `You are a careful assistant that helps a user fill in a web form.

You will receive:
1. A JSON Schema describing the form's fields.
2. The current values of the form (with sensitive fields redacted).
3. A user request describing what they want filled in.

Your job: respond with a SINGLE JSON object that contains ONLY the fields you are confident should be changed. Do NOT include explanations, commentary, code fences, or markdown. Just the JSON object.

Rules:
- Use the exact field names (dot-paths) from the schema.
- For nested fields, you may use a dot-path key (e.g. "address.city") or a nested object. Prefer dot-paths.
- Respect the schema's types, formats, and enums.
- Do NOT guess at password / token / payment / id-number fields. Leave them out.
- Skip fields that are already correctly filled in the current values.
- If you genuinely cannot infer a field, omit it.

Example output (for a hypothetical schema):
{"firstName":"Ana","email":"ana@example.com","address.city":"Madrid"}
`;

export type BuildPromptInput = {
  schema: Record<string, unknown>;
  values: unknown;
  request: string;
  systemPrompt?: string;
};

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export function buildChatMessages(input: BuildPromptInput): ChatMessage[] {
  const system = input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const userContent = [
    "FORM SCHEMA (JSON Schema):",
    "```json",
    JSON.stringify(input.schema, null, 2),
    "```",
    "",
    "CURRENT VALUES (sensitive fields redacted):",
    "```json",
    JSON.stringify(input.values, null, 2),
    "```",
    "",
    "USER REQUEST:",
    input.request,
    "",
    "Respond with the JSON object only.",
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
}

/**
 * Best-effort extraction of a JSON object from a chat response. LLMs sometimes
 * wrap their JSON in markdown fences, add a one-line preamble, or trail with a
 * note. We strip those, then JSON.parse.
 */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  let text = raw.trim();

  // Strip markdown fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1]!.trim();

  // Find the first { and the matching closing brace.
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
    } else {
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
  }
  if (end === -1) return null;

  const candidate = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
