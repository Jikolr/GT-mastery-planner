import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pkg from "./package.json" with { type: "json" };

let revision = "local";
try {
  revision = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (
    execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
      encoding: "utf8",
    }).trim()
  )
    revision += "-local";
} catch {
  /* Source ZIPs do not include git metadata. */
}
export default defineConfig(({ mode }) => {
  const desktop = mode === "desktop";
  return {
    root: "desktop",
    base: "./",
    publicDir: "../public",
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_ID__: JSON.stringify(
        process.env.GITHUB_SHA?.slice(0, 7) ?? revision,
      ),
      __WEB_BUILD__: JSON.stringify(!desktop),
    },
    resolve: {
      alias: desktop
        ? [
            {
              find: "virtual:pwa-register",
              replacement: fileURLToPath(
                new URL("./app/pwa-disabled.ts", import.meta.url),
              ),
            },
          ]
        : [],
    },
    plugins: [
      react(),
      ...(desktop
        ? [
            {
              name: "desktop-csp",
              transformIndexHtml: () => [
                {
                  tag: "meta",
                  attrs: {
                    "http-equiv": "Content-Security-Policy",
                    content:
                      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'",
                  },
                  injectTo: "head-prepend" as const,
                },
              ],
            },
          ]
        : [
            VitePWA({
              registerType: "prompt",
              injectRegister: false,
              includeAssets: ["favicon.svg", "icons/*.png"],
              manifest: {
                id: "./",
                name: "Guardian Tales Mastery Planner",
                short_name: "GT Planner",
                description: pkg.description,
                start_url: "./",
                scope: "./",
                display: "standalone",
                theme_color: "#101721",
                background_color: "#0c1017",
                icons: [
                  {
                    src: "icons/icon-192.png",
                    sizes: "192x192",
                    type: "image/png",
                  },
                  {
                    src: "icons/icon-512.png",
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "any maskable",
                  },
                ],
              },
              workbox: {
                globPatterns: ["**/*.{js,css,html,png,svg,webp,ico}"],
                maximumFileSizeToCacheInBytes: 3000000,
                navigateFallback: "index.html",
                cleanupOutdatedCaches: true,
              },
            }),
          ]),
    ],
    build: {
      outDir: desktop ? "../desktop-dist" : "../dist",
      emptyOutDir: true,
    },
  };
});
