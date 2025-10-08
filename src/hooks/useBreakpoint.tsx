import { useState, useEffect } from "react";

// Default Tailwind breakpoints. You can customize this object to match your tailwind.config.js
const breakpoints = {
  xxs: "360px",
  xs: "420px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

type BreakpointKey = keyof typeof breakpoints;

/**
 * A custom React hook to check if a Tailwind CSS breakpoint is active.
 * Returns true if the viewport width is greater than or equal to the specified breakpoint.
 *
 * @param breakpoint The Tailwind breakpoint key (e.g., 'sm', 'md', 'lg').
 * @returns {boolean} True if the breakpoint is active, false otherwise.
 */
export const useBreakpoint = (breakpoint: BreakpointKey): boolean => {
  const [isMatch, setIsMatch] = useState(false);

  useEffect(() => {
    // Guard against running this on the server (e.g., with SSR)
    if (typeof window === "undefined") {
      return;
    }

    const mediaQueryString = `(min-width: ${breakpoints[breakpoint]})`;
    const mediaQueryList = window.matchMedia(mediaQueryString);

    // Function to update state when the media query match status changes
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMatch(event.matches);
    };

    // Set the initial state
    setIsMatch(mediaQueryList.matches);

    // Add the event listener
    // Note: Safari < 14 uses the deprecated `addListener` method
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleChange);
    } else {
      mediaQueryList.addListener(handleChange);
    }

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [breakpoint]); // Re-run the effect if the breakpoint prop changes

  return isMatch;
};
