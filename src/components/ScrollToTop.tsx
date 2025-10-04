import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * This component automatically scrolls the page to the top
 * whenever the route changes.
 */
const ScrollToTop = () => {
  // Extracts pathname property from location object
  const { pathname } = useLocation();

  // This effect runs whenever the pathname changes
  useEffect(() => {
    // "document.documentElement.scrollTo" is the same as "window.scrollTo"
    // but works better in modern browsers and edge cases.
    document.documentElement.scrollTo(0, 0);
  }, [pathname]);

  // This component does not render anything to the DOM
  return null;
};

export default ScrollToTop;
