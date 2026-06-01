// Build-time configuration for the landing page.
// Override at build time with VITE_* env vars (see .env.example).

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

export const STORYBOOK_URL =
  env.VITE_STORYBOOK_URL ?? "http://localhost:6006";

export const GITHUB_URL =
  env.VITE_GITHUB_URL ?? "https://github.com/headlessButSmart/fillament";
