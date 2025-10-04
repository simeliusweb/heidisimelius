import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import BottomBranding from "./BottomBranding";

const HeroImageAndText = () => {
  // 1. Refs for the main container and the elements to be animated
  const containerRef = useRef<HTMLDivElement>(null);
  const heidiShadowRef = useRef<HTMLHeadingElement>(null);
  const simeliusShadowRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // GSAP animation logic will go here
    const container = containerRef.current;
    if (!container) return;

    // --- Desktop: Mouse Move Animation ---
    const handleMouseMove = (event: MouseEvent) => {
      // Logic to move heidiShadowRef and simeliusShadowRef based on cursor position
      // For example:
      // const { clientX, clientY } = event;
      // const { offsetWidth, offsetHeight } = container;
      // const xPos = (clientX / offsetWidth - 0.5) * 20; // Move up to 10px
      // const yPos = (clientY / offsetHeight - 0.5) * 20; // Move up to 10px
      // gsap.to([heidiShadowRef.current, simeliusShadowRef.current], { x: -xPos, y: -yPos, duration: 0.5 });
    };

    // --- Mobile: Device Orientation (Tilt) Animation ---
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      // Logic to move shadows based on device tilt (beta, gamma angles)
    };

    // --- Mobile: Scroll-based Animation (Fallback) ---
    // You could use GSAP ScrollTrigger here if tilt is not available/reliable

    // Add event listeners based on device capabilities
    const isTouchDevice = "ontouchstart" in window;
    if (!isTouchDevice) {
      container.addEventListener("mousemove", handleMouseMove);
    } else {
      window.addEventListener("deviceorientation", handleDeviceOrientation);
      // Initialize ScrollTrigger as a fallback here
    }

    // Cleanup function
    return () => {
      if (!isTouchDevice) {
        container.removeEventListener("mousemove", handleMouseMove);
      } else {
        window.removeEventListener(
          "deviceorientation",
          handleDeviceOrientation
        );
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[1040px] flex items-center justify-center inset-0 bg-cover bg-center bg-[#000] bg-no-repeat pb-16 pt-8"
    >
      <div className="absolute top-[-180px] left-[-102px]">
        <h2
          ref={heidiShadowRef}
          className="absolute font-santorini text-[hsl(350.45,76.52%,54.9%)] z-1 text-[118px] top-[2px] left-[2px]"
        >
          Heidi
        </h2>
        <h2 className="absolute font-santorini text-foreground z-2 text-[118px]">
          Heidi
        </h2>
      </div>
      <div className="absolute bottom-[-118px] left-[-106px]">
        <h2
          ref={simeliusShadowRef}
          className="absolute font-santorini text-[hsl(350.45,76.52%,54.9%)] z-1 text-[95px]
              bottom-[-2px] left-[2px]"
        >
          Simelius
        </h2>
        <h2 className="absolute font-santorini text-foreground z-2 text-[95px]">
          Simelius
        </h2>
        <img
          src={
            "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2-square.webp"
          }
          alt="Heidi Simelius on laulaja, lauluntekijä ja esiintyjä."
          className="h-auto w-[80vw] max-w-[370px] relative z-3 shadow-lg"
        />
      </div>
      <div className="absolute bottom-0 flex flex-col w-full">
        <BottomBranding />
      </div>
    </div>
  );
};

export default HeroImageAndText;
