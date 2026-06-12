import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/mcp-b.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  treeshake: true,
  splitting: false,
  target: "es2020",
  external: ["@fillament/core", "@mcp-b/transports", "@modelcontextprotocol/sdk"],
}));
