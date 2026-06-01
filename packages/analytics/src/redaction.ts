// Default sensitive field names — never sent unredacted.
export const DEFAULT_SENSITIVE_FIELDS: ReadonlyArray<string> = [
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
  "phone",
  "email",
  "address",
];

export function isSensitiveFieldName(name: string, extra: ReadonlyArray<string> = []): boolean {
  if (!name) return false;
  const segments = name.split(".");
  const lookup = new Set([...DEFAULT_SENSITIVE_FIELDS, ...extra].map((s) => s.toLowerCase()));
  for (const seg of segments) {
    if (lookup.has(seg.toLowerCase())) return true;
  }
  return false;
}

// Synchronous SHA-256 is not available in the browser without async. For
// fieldHash we use a small, fast non-cryptographic hash. This is intentional:
// the hash exists to alias names for grouping, not for security.
export function aliasHash(input: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return "h_" + h.toString(36);
}
