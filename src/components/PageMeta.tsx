import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { canonicalUrl } from "@/config/metadata";

interface PageMetaProps {
  title: string;
  description: string;
  /** For pages that must stay out of the index (404). Drops the canonical too. */
  noindex?: boolean;
}

/**
 * Per-page metadata. The matching static tags in index.html are marked with
 * data-rh="true" so react-helmet-async REPLACES them instead of appending
 * duplicates. Every tag marked there must be rendered here (and in the default
 * Helmet in App.tsx), otherwise Helmet removes the static one and puts nothing back.
 * The canonical is the deliberate exception: pages without PageMeta (login, admin)
 * and noindex pages should lose it.
 */
const PageMeta = ({ title, description, noindex = false }: PageMetaProps) => {
  const { pathname } = useLocation();
  const url = canonicalUrl(pathname);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex, follow" />
      ) : (
        <link rel="canonical" href={url} />
      )}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />

      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:url" content={url} />
    </Helmet>
  );
};

export default PageMeta;
