import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The client bundle never contains secrets or witness data: it is a static
// shell that talks to the server API with same-origin, cookie-based sessions.
export default defineConfig({
  root: path.resolve(import.meta.dirname),
  plugins: [react()],
  build: {
    outDir: path.resolve(import.meta.dirname, "../dist/client"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080",
      "/auth": "http://localhost:8080",
    },
  },
});
