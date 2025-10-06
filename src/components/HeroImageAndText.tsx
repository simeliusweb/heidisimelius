import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import BottomBranding from "./BottomBranding";
import { Loader2 } from "lucide-react";

const HeroImageAndText = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heidiShadowRef = useRef<HTMLHeadingElement>(null);
  const simeliusShadowRef = useRef<HTMLHeadingElement>(null);

  // State to manage the loading process
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null); // Ref for the content to animate in

  // Effect for handling text perspective shifts according to cursor movements
  useEffect(() => {
    const container = containerRef.current;
    const heidiShadow = heidiShadowRef.current;
    const simeliusShadow = simeliusShadowRef.current;

    if (!container || !heidiShadow || !simeliusShadow) return;

    const movementStrength = 20; // How much the shadow moves. Adjust this value for more/less effect.

    // --- Desktop: Mouse Move Animation ---
    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      const { offsetWidth, offsetHeight } = container;

      // Calculate position from -1 to 1
      const xPos = (clientX / offsetWidth - 0.5) * 2;
      const yPos = (clientY / offsetHeight - 0.5) * 2;

      // Animate the shadows
      gsap.to([heidiShadow, simeliusShadow], {
        x: -xPos * movementStrength,
        y: -yPos * movementStrength,
        duration: 1.111,
        ease: "power2.out",
      });
    };

    // Add event listener
    container.addEventListener("mousemove", handleMouseMove);

    // Cleanup function
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Effect to handle asset loading and fade-in animation
  useEffect(() => {
    // 1. Immediately set the content to its starting animation state (invisible)
    if (contentRef.current) {
      gsap.set(contentRef.current, { opacity: 0, scale: 0.98 });
    }

    // Create a promise that resolves after a minimum time
    const minDisplayTimePromise = new Promise((resolve) => {
      setTimeout(resolve, 550); // Adjust this value as needed
    });

    // Asset loading promise
    const assetsPromise = new Promise<void>((resolve, reject) => {
      const imageUrl =
        "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2-square.webp";
      const fontPromise = document.fonts.ready;
      const imagePromise = new Promise<void>((resolveImg, rejectImg) => {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => resolveImg();
        img.onerror = () => rejectImg();
      });

      Promise.all([fontPromise, imagePromise])
        .then(() => resolve())
        .catch(reject);
    });

    // 2. Wait for BOTH assets to load AND the minimum time to pass
    Promise.all([assetsPromise, minDisplayTimePromise])
      .then(() => {
        // 3. Hide the loader
        setIsLoading(false);

        // 4. Animate the content in
        if (contentRef.current) {
          gsap.to(contentRef.current, {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: "power2.out",
            // The delay can be slightly reduced or removed now
            delay: 0.1,
          });
        }
      })
      .catch((error) => {
        console.error("Failed to load critical hero assets:", error);
        setIsLoading(false);
        if (contentRef.current) {
          gsap.to(contentRef.current, { opacity: 1, scale: 1 });
        }
      });
  }, []); // Empty dependency array ensures this runs once per mount

  return (
    <div
      ref={containerRef}
      className="relative flex h-[650px] xs:h-[700px] sm:h-[840px] md:h-[1040px] items-center justify-center overflow-hidden bg-[#000] pb-16 pt-8"
    >
      {/* Loader is now overlaid and visibility is toggled independently */}
      {isLoading && (
        <Loader2 className="absolute h-12 w-12 animate-spin text-secondary" />
      )}

      <div ref={contentRef} className="relative">
        {/* Inner container for scaling */}
        <div className="scale-[0.45] xxs:scale-[0.5] xs:scale-[0.55] sm:scale-75 md:scale-90 lg:scale-100">
          {/* --- "Heidi" Word Group --- */}
          <div className="absolute top-[-180px] left-[-102px]">
            <h2
              ref={heidiShadowRef}
              className="absolute z-10 font-santorini text-[118px] text-primary top-[2px] left-[2px]"
              // villi pinkki text-[hsl(350.45,76.52%,54.9%)]
            >
              Heidi
            </h2>
            <h2 className="relative z-20 font-santorini text-[118px] text-foreground">
              Heidi
            </h2>
          </div>

          {/* --- Central Image --- */}
          <img
            src="/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2-square.webp"
            alt="Heidi Simelius on laulaja, lauluntekijä ja esiintyjä."
            className="relative z-30 h-auto w-[370px] shadow-lg"
          />

          {/* --- "Simelius" Word Group --- */}
          <div className="absolute bottom-[-118px] left-[-106px]">
            <h2
              ref={simeliusShadowRef}
              className="absolute z-10 font-santorini text-[95px] text-primary top-[2px] left-[2px]"
              // text-[hsl(350.45,76.52%,54.9%)]
            >
              Simelius
            </h2>
            <h2 className="relative z-20 font-santorini text-[95px] text-foreground">
              Simelius
            </h2>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 flex w-full flex-col">
        <BottomBranding />
      </div>
    </div>
  );
};

export default HeroImageAndText;
