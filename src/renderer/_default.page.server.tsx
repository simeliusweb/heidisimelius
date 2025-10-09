// src/renderer/_default.page.server.tsx

import ReactDOMServer from "react-dom/server";
import { PageShell } from "./PageShell";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import { HelmetProvider } from "react-helmet-async";
import type { PageContextBuiltInServer } from "vike/types"; // <-- Import a base type from Vike

// Define a more specific type for our pageContext
// This tells TypeScript that `Page` is a valid React component
type PageContext = PageContextBuiltInServer & {
  Page: (pageProps: unknown) => React.ReactElement;
};

export async function onRenderHtml(pageContext: PageContext) {
  // <-- Use our new type and remove the old annotation
  const { Page } = pageContext;

  // The context object for Helmet should be a plain empty object.
  // The provider will populate it with the correct types.
  const helmetContext = {};

  const pageHtml = ReactDOMServer.renderToString(
    <HelmetProvider context={helmetContext}>
      <PageShell pageContext={pageContext}>
        <Page />
      </PageShell>
    </HelmetProvider>
  );

  // The 'helmet' property is added to helmetContext by the provider
  const { helmet } = helmetContext as { helmet: any };

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="fi">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${dangerouslySkipEscape(helmet?.title.toString() || "")}
        ${dangerouslySkipEscape(helmet?.meta.toString() || "")}
        ${dangerouslySkipEscape(helmet?.link.toString() || "")}
      </head>
      <body>
        <div id="root">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: {},
  };
}
