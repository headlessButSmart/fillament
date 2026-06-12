import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  external: ["yup", "@fillament/core"],
  treeshake: true,
  splitting: false,
  target: "es2020",
}));
