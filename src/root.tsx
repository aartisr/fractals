import { component$ } from "@builder.io/qwik";
import {
  QwikCityProvider,
  RouterOutlet,
  ServiceWorkerRegister,
} from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

import "./global.css";
import "./theme.css";

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   */

  return (
    <QwikCityProvider>
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        {/* Lucide Icons CDN for data-lucide SVG replacement */}
        <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js" defer></script>
        <RouterHead />
        <ServiceWorkerRegister />
      </head>
      <body lang="en" class="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 text-gray-900 antialiased om-pattern">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
