import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import sitemap from "vite-plugin-sitemap";
import { pageMetadata, routeMetadata, SITE_URL } from "./src/config/metadata";

const ROUTES = Object.keys(routeMetadata);

const escapeAttr = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Emits a real HTML file per route with that route's title/description/og/twitter tags
 * baked into the markup.
 *
 * Social scrapers (WhatsApp, Facebook, LinkedIn, Slack) do not execute JavaScript, so
 * they never see the tags PageMeta sets at runtime — they read whatever HTML the server
 * returns. Without this, every shared link showed the site-wide default text.
 *
 * Vercel resolves static files before applying the SPA rewrite in vercel.json, so
 * /laulunopetus is served by dist/laulunopetus/index.html while React Router still takes
 * over once the bundle loads.
 */
const perRouteMeta = (): Plugin => ({
  name: "per-route-meta-html",
  apply: "build",
  closeBundle() {
    const outDir = path.resolve(__dirname, "dist");
    const indexPath = path.join(outDir, "index.html");
    if (!fs.existsSync(indexPath)) return;

    const template = fs.readFileSync(indexPath, "utf-8");

    for (const route of ROUTES) {
      const meta = pageMetadata[routeMetadata[route]];
      const url = `${SITE_URL}${route}`;

      // Replace only the tags PageMeta also manages; og:image/og:type stay untouched.
      const html = template
        .replace(
          /<title>[\s\S]*?<\/title>/,
          `<title>${escapeAttr(meta.title)}</title>`,
        )
        .replace(
          /(<meta\s+data-rh="true"\s+name="description"\s+content=")[\s\S]*?(")/,
          `$1${escapeAttr(meta.description)}$2`,
        )
        .replace(
          /(<meta\s+data-rh="true"\s+property="og:title"\s+content=")[\s\S]*?(")/,
          `$1${escapeAttr(meta.title)}$2`,
        )
        .replace(
          /(<meta\s+data-rh="true"\s+property="og:description"\s+content=")[\s\S]*?(")/,
          `$1${escapeAttr(meta.description)}$2`,
        )
        .replace(
          /(<meta\s+data-rh="true"\s+property="og:url"\s+content=")[\s\S]*?(")/,
          `$1${escapeAttr(url)}$2`,
        )
        .replace(
          /(<meta\s+data-rh="true"\s+property="twitter:title"\s+content=")[\s\S]*?(")/,
          `$1${escapeAttr(meta.title)}$2`,
        )
        .replace(
          /(<meta\s+data-rh="true"\s+property="twitter:description"\s+content=")[\s\S]*?(")/,
          `$1${escapeAttr(meta.description)}$2`,
        )
        .replace(
          /(<meta\s+data-rh="true"\s+property="twitter:url"\s+content=")[\s\S]*?(")/,
          `$1${escapeAttr(url)}$2`,
        );

      // Fail the build rather than silently shipping generic tags if index.html's
      // markup drifts and the replacements above stop matching.
      if (route !== "/" && !html.includes(escapeAttr(meta.description))) {
        this.error(
          `per-route-meta-html: could not inject meta for ${route}. ` +
            `Check that index.html still has the data-rh tags this plugin rewrites.`,
        );
      }

      if (route === "/") {
        fs.writeFileSync(indexPath, html);
      } else {
        const dir = path.join(outDir, route.replace(/^\//, ""));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), html);
      }
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    sitemap({
      hostname: SITE_URL,
      // "/" is emitted by the plugin itself; listing it again duplicates the entry.
      dynamicRoutes: ROUTES.filter((route) => route !== "/"),
    }),
    perRouteMeta(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
