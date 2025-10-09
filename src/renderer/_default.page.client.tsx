// src/renderer/_default.page.client.tsx

import ReactDOM from "react-dom/client";
import { PageShell } from "./PageShell";
import type { OnRenderClientAsync } from "vike/types";
import { HelmetProvider } from "react-helmet-async";

export const onRenderClient: OnRenderClientAsync = async (
  pageContext
): ReturnType<OnRenderClientAsync> => {
  const { Page } = pageContext;
  const container = document.getElementById("root")!;

  ReactDOM.hydrateRoot(
    container,
    <HelmetProvider>
      <PageShell pageContext={pageContext}>
        <Page />
      </PageShell>
    </HelmetProvider>
  );
};
