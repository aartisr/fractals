import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikPwa, type PWAOptions } from "@qwikdev/pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const config: PWAOptions | undefined = process.env.CUSTOM_CONFIG === "true"
  ? { config: true }
  : undefined;

export default defineConfig({
  define: {
    // enables debugging in workbox
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  plugins: [
    qwikCity(),
    qwikVite(),
    tsconfigPaths(),
    qwikPwa(config),
    tailwindcss(),
  ],
  preview: {
    headers: {
      "Cache-Control": "public, max-age=600",
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "node:buffer": "buffer",
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
