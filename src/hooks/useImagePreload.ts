import { useState, useEffect } from "react";

const useImagePreload = (src: string | undefined): boolean => {
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

  return loaded;
};

export default useImagePreload;
