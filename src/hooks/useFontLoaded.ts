import { useState, useEffect } from "react";

const useFontLoaded = (fontFamily: string): boolean => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      if (document.fonts.check(`16px "${fontFamily}"`)) {
        setLoaded(true);
      }
    });

    // Also listen for individual font load events
    const checkFont = () => {
      if (document.fonts.check(`16px "${fontFamily}"`)) {
        setLoaded(true);
      }
    };

    document.fonts.addEventListener("loadingdone", checkFont);
    // Check immediately in case already loaded
    checkFont();

    return () => {
      document.fonts.removeEventListener("loadingdone", checkFont);
    };
  }, [fontFamily]);

  return loaded;
};

export default useFontLoaded;
