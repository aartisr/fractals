import { defineConfig, loadEnv } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikPwa, type PWAOptions } from "@qwikdev/pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const config: PWAOptions | undefined = process.env.CUSTOM_CONFIG === "true"
  ? { config: true }
  : undefined;

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Expose specific env vars to process.env for SSR
  Object.keys(env).forEach(key => {
    if (key.startsWith('CMS_') || 
        key.startsWith('WEB_') || 
        key.startsWith('USE_') || 
        key.startsWith('AUTH_') ||
        key.startsWith('PAYSTACK_') ||
        key.startsWith('CHAT_') ||
        key.startsWith('TRANSCRIPTION_')) {
      process.env[key] = env[key];
    }
  });

  return {
    envPrefix: ['VITE_', 'CMS_URL', 'WEB_URL', 'USE_MOCK_AUTH', 'AUTH_SERVICE_URL', 'PAYSTACK_PUBLIC_KEY'],
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
  };
});
