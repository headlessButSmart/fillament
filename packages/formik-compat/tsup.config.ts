import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@fillament/core", "@fillament/react"],
  treeshake: true,
  splitting: false,
  target: "es2020",
});
