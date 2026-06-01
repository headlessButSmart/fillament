import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["@fillament/core", "ajv", "ajv-formats"],
  treeshake: true,
  splitting: false,
  target: "es2020",
});
