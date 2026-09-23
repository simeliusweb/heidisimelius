import { useState, useEffect } from "react";

/**
 * true once `src` has loaded (or failed). Pass `giveUp` when the src itself can't be
 * known (its query failed), so callers stop showing a spinner forever.
 */
const useImagePreload = (src: string | undefined, giveUp = false): boolean => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;

    setLoaded(false);
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true); // Show content even on error
    img.src = src;

    // If image is already cached
    if (img.complete) {
      setLoaded(true);
    }
  }, [src]);

  return loaded || giveUp;
};

export default useImagePreload;
