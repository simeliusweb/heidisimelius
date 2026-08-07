import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { SITE_URL } from "@/config/metadata";

interface PageMetaProps {
  title: string;
  description: string;
}

/**
 * Per-page metadata. The matching static tags in index.html are marked with
 * data-rh="true" so react-helmet-async REPLACES them instead of appending
 * duplicates. Every tag marked there must be rendered here (and in the default
 * Helmet in App.tsx), otherwise Helmet removes the static one and puts nothing back.
 */
const PageMeta = ({ title, description }: PageMetaProps) => {
  const { pathname } = useLocation();
  const url = `${SITE_URL}${pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

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
