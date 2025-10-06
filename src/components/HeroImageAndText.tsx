import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import BottomBranding from "./BottomBranding";
import { Loader2 } from "lucide-react";

const HeroImageAndText = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heidiShadowRef = useRef<HTMLHeadingElement>(null);
  const simeliusShadowRef = useRef<HTMLHeadingElement>(null);
  const brandingRef = useRef<HTMLDivElement>(null);

  // State to manage the loading process
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinnerVisible, setIsSpinnerVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null); // Ref for the content to animate in

  // Effect for handling text perspective shifts according to cursor movements
  useEffect(() => {
    const container = containerRef.current;
    const heidiShadow = heidiShadowRef.current;
    const simeliusShadow = simeliusShadowRef.current;

    if (!container || !heidiShadow || !simeliusShadow) return;

    const movementStrength = 4; // How much the shadow moves. Adjust this value for more/less effect.

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

  // Effect to handle asset loading and fade-in animation with a threshold
  useEffect(() => {
    // We'll store the animation instance here to clean it up later
    let heroScrollAnimation: gsap.core.Tween;

    // 1. Set the content to its starting animation state (invisible)
    if (contentRef.current) {
      gsap.set(contentRef.current, { opacity: 0 });
    }

    // 2. Set a timer to show the spinner only if loading is slow
    const spinnerTimeoutId: number = window.setTimeout(() => {
      setIsSpinnerVisible(true);
    }, 200); // 200ms threshold

    // 3. Asset loading promise
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

      // Correctly chain the promises by passing the resolve/reject handlers directly.
      Promise.all([fontPromise, imagePromise])
        .then(() => resolve())
        .catch(reject);
    });

    // 4. Wait for assets to load
    assetsPromise
      .then(() => {
        // Clear the timer immediately so the spinner doesn't flash.
        clearTimeout(spinnerTimeoutId);

        // Mark loading as complete and hide the spinner
        setIsLoading(false);
        setIsSpinnerVisible(false);

        // Animate the content in
        if (contentRef.current) {
          gsap.fromTo(
            contentRef.current,
            { opacity: 0, scale: 0.98 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.8,
              ease: "power2.out",
              delay: 0.1,
            }
          );
        }

        // Create the parallax animation.
        heroScrollAnimation = gsap.to(contentRef.current, {
          y: 140,
          ease: "none",
          scrollTrigger: {
            trigger: contentRef.current,
            start: "top top", // When top of trigger hits top of viewport
            end: "bottom top", // When bottom of trigger hits top of viewport
            scrub: true, // Smoothly link animation to scroll position
          },
        });
      })
      .catch((error) => {
        clearTimeout(spinnerTimeoutId);
        console.error("Failed to load critical hero assets:", error);
        setIsLoading(false);
        setIsSpinnerVisible(false);
        if (contentRef.current) {
          gsap.to(contentRef.current, { opacity: 1, scale: 1 });
        }
      });

    // 5. Cleanup function for when the component unmounts
    return () => {
      clearTimeout(spinnerTimeoutId);
      // If the scroll animation was created, kill its ScrollTrigger instance
      if (heroScrollAnimation) {
        heroScrollAnimation.scrollTrigger?.kill();
      }
    };
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        y: 140,
        ease: "none",
        scrollTrigger: {
          trigger: contentRef.current,
          start: "top top", // When top of trigger hits top of viewport
          end: "bottom top", // When bottom of trigger hits top of viewport
          scrub: true, // Smoothly link animation to scroll position
        },
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[650px] xs:h-[700px] sm:h-[840px] md:h-[1040px] items-center justify-center overflow-hidden bg-background pb-16 pt-8"
      style={{
        backgroundImage: `linear-gradient(
      55deg,
      hsl(234deg 24% 8%) 0%,
      hsl(236deg 23% 8%) 10%,
      hsl(238deg 23% 8%) 20%,
      hsl(240deg 23% 8%) 32%,
      hsl(238deg 23% 8%) 46%,
      hsl(236deg 23% 8%) 62%,
      hsl(234deg 24% 8%) 75%,
      hsl(234deg 24% 8%) 84%,
      hsl(234deg 24% 8%) 89%,
      hsl(234deg 24% 8%) 93%,
      hsl(235deg 23% 9%) 96%,
      hsl(235deg 23% 10%) 98%,
      hsl(235deg 23% 10%) 100%
    )`,
      }}
    >
      {isLoading && isSpinnerVisible && (
        <Loader2 className="absolute h-12 w-12 animate-spin text-primary" />
      )}

      <div ref={contentRef} className="relative">
        {/* Inner container for scaling */}
        <div className="scale-[0.45] xxs:scale-[0.5] xs:scale-[0.55] sm:scale-75 md:scale-90 lg:scale-100">
          {/* --- "Heidi" Word Group --- */}
          <div className="absolute top-[-180px] left-[-102px]">
            <h2
              ref={heidiShadowRef}
              className="absolute z-10 font-santorini text-[118px] text-primary top-[6px] left-[-6px]"
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
            className="relative z-30 h-auto w-[370px] shadow-lg image-glow-home-hero"
          />

          {/* --- "Simelius" Word Group --- */}
          <div className="absolute bottom-[-118px] left-[-106px]">
            <h2
              ref={simeliusShadowRef}
              className="absolute z-10 font-santorini text-[95px] text-primary top-[6px] left-[-6px]"
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

      <div className="absolute bottom-0 left-0 right-0 w-full">
        <BottomBranding />
      </div>
    </div>
  );
};

export default HeroImageAndText;
