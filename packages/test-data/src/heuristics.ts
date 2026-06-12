// Property-name and format heuristics. Generators here produce realistic
// values from a tiny built-in vocabulary — no faker dependency.
import type { Rng } from "./random.js";

const FIRST_NAMES = ["Ada", "Grace", "Alan", "Edsger", "Barbara", "Donald", "Margaret", "Linus", "Radia", "Tim"];
const LAST_NAMES = ["Lovelace", "Hopper", "Turing", "Dijkstra", "Liskov", "Knuth", "Hamilton", "Torvalds", "Perlman", "Berners-Lee"];
const COMPANIES = ["Acme", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Enterprises", "Hooli", "Pied Piper"];
const STREETS = ["Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Elm St", "Park Rd", "High St", "Station Rd"];
const CITIES = ["Springfield", "Riverton", "Lakeview", "Fairview", "Greenville", "Bristol", "Georgetown", "Salem"];
const COUNTRIES = ["US", "GB", "DE", "FR", "NL", "TR", "JP", "BR"];
const WORDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet", "kilo", "lima"];
const DOMAINS = ["example.com", "example.org", "test.dev", "mail.test"];

export function fakeFirstName(rng: Rng): string {
  return rng.pick(FIRST_NAMES);
}

export function fakeLastName(rng: Rng): string {
  return rng.pick(LAST_NAMES);
}

export function fakeFullName(rng: Rng): string {
  return `${fakeFirstName(rng)} ${fakeLastName(rng)}`;
}

export function fakeEmail(rng: Rng): string {
  return `${fakeFirstName(rng).toLowerCase()}.${fakeLastName(rng).toLowerCase().replace(/[^a-z]/g, "")}${rng.int(1, 99)}@${rng.pick(DOMAINS)}`;
}

export function fakePhone(rng: Rng): string {
  return `+1${rng.int(200, 989)}${rng.int(200, 999)}${rng.int(1000, 9999)}`;
}

export function fakeUrl(rng: Rng): string {
  return `https://www.${rng.pick(WORDS)}${rng.int(1, 99)}.${rng.pick(["com", "org", "io"])}`;
}

export function fakeUuid(rng: Rng): string {
  const hex = (count: number) => Array.from({ length: count }, () => rng.int(0, 15).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${rng.pick(["8", "9", "a", "b"])}${hex(3)}-${hex(12)}`;
}

export function fakeWords(rng: Rng, count: number): string {
  return Array.from({ length: count }, () => rng.pick(WORDS)).join(" ");
}

export function fakeSentence(rng: Rng): string {
  const words = fakeWords(rng, rng.int(4, 8));
  return words.charAt(0).toUpperCase() + words.slice(1) + ".";
}

export function fakeStreet(rng: Rng): string {
  return `${rng.int(1, 999)} ${rng.pick(STREETS)}`;
}

export function fakeCity(rng: Rng): string {
  return rng.pick(CITIES);
}

export function fakeCountry(rng: Rng): string {
  return rng.pick(COUNTRIES);
}

export function fakeCompany(rng: Rng): string {
  return rng.pick(COMPANIES);
}

export function fakeZip(rng: Rng): string {
  return String(rng.int(10000, 99999));
}

// Within the last year, as an ISO date-time string.
export function fakeIsoDateTime(rng: Rng): string {
  return new Date(fakeEpochMs(rng)).toISOString();
}

export function fakeIsoDate(rng: Rng): string {
  return fakeIsoDateTime(rng).slice(0, 10);
}

// Within the last year, as Unix epoch milliseconds (Rierino timestamp convention).
// Quantized to the hour so that a fixed seed yields identical values across
// calls in the same session instead of drifting with Date.now().
export function fakeEpochMs(rng: Rng): number {
  const hourMs = 60 * 60 * 1000;
  const now = Math.floor(Date.now() / hourMs) * hourMs;
  return now - rng.int(0, 365 * 24) * hourMs;
}

type NameRule = {
  pattern: RegExp;
  generate: (rng: Rng) => unknown;
};

// Checked top-to-bottom against the last path segment; first match wins.
// Only consulted when the schema gives no stronger signal (format/enum).
const NAME_RULES: NameRule[] = [
  { pattern: /^(is|has|should)[A-Z_]/, generate: (rng) => rng.bool() },
  { pattern: /(.*[a-z])?At$/, generate: fakeEpochMs },
  { pattern: /e[-_]?mail/i, generate: fakeEmail },
  { pattern: /^(first|given)[-_]?name$/i, generate: fakeFirstName },
  { pattern: /^(last|family)[-_]?name$|surname/i, generate: fakeLastName },
  { pattern: /(full[-_]?name|^name$|user[-_]?name|customer|contact[-_]?name)/i, generate: fakeFullName },
  { pattern: /(phone|mobile|tel)/i, generate: fakePhone },
  { pattern: /(url|website|link|href)/i, generate: fakeUrl },
  { pattern: /(uuid|guid)/i, generate: fakeUuid },
  { pattern: /(street|address[-_]?line|^address$)/i, generate: fakeStreet },
  { pattern: /city|town/i, generate: fakeCity },
  { pattern: /country/i, generate: fakeCountry },
  { pattern: /(zip|postal)/i, generate: fakeZip },
  { pattern: /(company|organization|organisation|employer)/i, generate: fakeCompany },
  { pattern: /(birth|dob)/i, generate: fakeIsoDate },
  { pattern: /(description|comment|message|notes?|bio|summary)/i, generate: fakeSentence },
  { pattern: /(title|subject|label)/i, generate: (rng) => fakeWords(rng, rng.int(2, 4)) },
  { pattern: /(price|amount|total|cost)/i, generate: (rng) => rng.int(100, 99900) / 100 },
  { pattern: /(quantity|count)/i, generate: (rng) => rng.int(1, 20) },
  { pattern: /age/i, generate: (rng) => rng.int(18, 80) },
];

/**
 * Generate a value from the property name alone (`email` → an email, `isActive`
 * → a boolean, `createdAt` → epoch ms). Returns undefined when no rule matches.
 */
export function generateFromName(name: string, rng: Rng): unknown {
  for (const rule of NAME_RULES) {
    if (rule.pattern.test(name)) return rule.generate(rng);
  }
  return undefined;
}
