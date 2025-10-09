// server.mjs

import express from "express";
import { renderPage } from "vike/server";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const root = __dirname;

const app = express();

if (isProduction) {
  app.use(express.static(`${root}/dist/client`));
} else {
  // Instantiate Vite's development server and integrate Vike
  const vite = await import("vite");
  const viteDevMiddleware = (
    await vite.createServer({
      root,
      server: { middlewareMode: true },
    })
  ).middlewares;
  app.use(viteDevMiddleware);
}

app.get("*", async (req, res, next) => {
  const pageContextInit = {
    urlOriginal: req.originalUrl,
  };
  const pageContext = await renderPage(pageContextInit);
  if (pageContext.httpResponse === null) return next();

  const { body, statusCode, headers, earlyHints } = pageContext.httpResponse;
  if (res.writeEarlyHints)
    res.writeEarlyHints({ link: earlyHints.map((e) => e.earlyHintLink) });

  headers.forEach(([name, value]) => res.setHeader(name, value));
  res.status(statusCode).send(body);
});

const port = process.env.PORT || 3000;
app.listen(port);
console.log(`Server running at http://localhost:${port}`);
