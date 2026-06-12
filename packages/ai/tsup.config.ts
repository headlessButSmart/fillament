import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  external: [
    "react",
    "react-dom",
    "@fillament/core",
    "@fillament/react",
    "@mlc-ai/web-llm",
  ],
  treeshake: true,
  splitting: false,
  target: "es2020",
}));
