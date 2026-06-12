import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: {
    index: "src/index.ts",
    auth: "src/auth/index.ts",
    contact: "src/contact/index.ts",
    survey: "src/survey/index.ts",
    commerce: "src/commerce/index.ts",
    onboarding: "src/onboarding/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  treeshake: true,
  splitting: false,
  target: "es2020",
  external: ["@fillament/core"],
}));
