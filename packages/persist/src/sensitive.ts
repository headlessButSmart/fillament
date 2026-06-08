// Default sensitive-field exclusion patterns. The persist plugin will skip any
// field whose path segment matches one of these substrings (case-insensitive).
// Consumers can override via PersistOptions.excludeSensitive.
export const DEFAULT_SENSITIVE_PATTERNS: readonly string[] = [
  "password",
  "passcode",
  "token",
  "secret",
  "ssn",
  "socialsecurity",
  "creditcard",
  "cardnumber",
  "cardcvc",
  "cvc",
  "cvv",
  "otp",
  "mfa",
  "twofactor",
];

export function isSensitivePath(path: string, patterns: readonly string[] = DEFAULT_SENSITIVE_PATTERNS): boolean {
  const lower = path.toLowerCase();
  for (const p of patterns) {
    if (lower.includes(p)) return true;
  }
  return false;
}
