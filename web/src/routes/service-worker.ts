import { setupServiceWorker } from "@builder.io/qwik-city/service-worker";
import { setupPwa } from "@qwikdev/pwa/sw";

// Some environments (e.g., Safari) don't expose a `chrome` global. Guard it to avoid
// ReferenceErrors when imported code probes for it.
const swGlobal = self as unknown as { chrome?: any };
if (typeof swGlobal.chrome === "undefined") {
  swGlobal.chrome = undefined;
}

setupServiceWorker();
setupPwa();
