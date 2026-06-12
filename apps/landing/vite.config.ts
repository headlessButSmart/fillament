import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // `open: false` so `pnpm dev` (multi-process) doesn't pop multiple browser
  // windows. Use `pnpm landing` directly if you want it to open on launch.
  server: { port: Number(process.env.PORT) || 5173, open: false },
});
