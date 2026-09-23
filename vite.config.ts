import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import sitemap from "vite-plugin-sitemap";
import {
  canonicalUrl,
  notFoundMeta,
  pageMetadata,
  routeMetadata,
  SITE_URL,
} from "./src/config/metadata";

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
 * Vercel resolves static files first, so /laulunopetus is served by
 * dist/laulunopetus/index.html while React Router still takes over once the bundle loads.
 *
 * It also emits dist/404.html. vercel.json only rewrites /admin and /login to the SPA, so
 * every other unknown path (old WordPress URLs, typos) gets Vercel's real 404 status with
 * this file as the body — the SPA still boots and renders the branded NotFound page. A
 * 200 here would make Google treat dead URLs as live duplicates of the home page.
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
        )
        .replace(
          /(<link\s+data-rh="true"\s+rel="canonical"\s+href=")[\s\S]*?(")/,
          `$1${escapeAttr(canonicalUrl(route))}$2`,
        );

      // Fail the build rather than silently shipping generic tags if index.html's
      // markup drifts and the replacements above stop matching.
      if (!html.includes(`rel="canonical" href="${escapeAttr(canonicalUrl(route))}"`)) {
        this.error(
          `per-route-meta-html: could not inject the canonical for ${route}. ` +
            `Check that index.html still has the data-rh canonical link.`,
        );
      }
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

    // 404 body: no canonical (the URL does not exist) and explicitly noindex.
    const notFoundHtml = template
      .replace(
        /<title>[\s\S]*?<\/title>/,
        `<title>${escapeAttr(notFoundMeta.title)}</title>`,
      )
      .replace(/<link\s+data-rh="true"\s+rel="canonical"[^>]*>\s*/, "")
      // data-rh lets Helmet swap it for NotFound's own tag instead of duplicating it,
      // and drop it if the visitor then navigates client-side to a real page.
      .replace(
        "</head>",
        `  <meta data-rh="true" name="robots" content="noindex, follow" />\n  </head>`,
      );

    if (notFoundHtml.includes('rel="canonical"')) {
      this.error("per-route-meta-html: could not strip the canonical from 404.html.");
    }
    fs.writeFileSync(path.join(outDir, "404.html"), notFoundHtml);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // The e2e suite stores the test admin's session here; never serve it to the LAN.
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "e2e/.auth/**"] },
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
