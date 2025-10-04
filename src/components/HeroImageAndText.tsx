import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import BottomBranding from "./BottomBranding";

const HeroImageAndText = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heidiShadowRef = useRef<HTMLHeadingElement>(null);
  const simeliusShadowRef = useRef<HTMLHeadingElement>(null);

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

    // --- Mobile: Device Orientation (Tilt) Animation ---
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      const { gamma, beta } = event; // gamma: left-to-right tilt, beta: front-to-back tilt

      if (gamma === null || beta === null) return;

      // Clamp values for a more controlled effect (e.g., max 30 degrees tilt)
      const clamp = (val: number, min: number, max: number) =>
        Math.max(min, Math.min(val, max));
      const clampedGamma = clamp(gamma, -30, 30);
      const clampedBeta = clamp(beta, -30, 30);

      // Normalize from -1 to 1
      const xPos = clampedGamma / 30;
      const yPos = clampedBeta / 30;

      gsap.to([heidiShadow, simeliusShadow], {
        x: -xPos * movementStrength,
        y: -yPos * movementStrength,
        duration: 1.111,
        ease: "power2.out",
      });
    };

    // Add event listeners based on device capabilities
    const isTouchDevice = "ontouchstart" in window;
    if (!isTouchDevice) {
      container.addEventListener("mousemove", handleMouseMove);
    } else {
      // NOTE: iOS requires permission for device orientation. This might not work out-of-the-box
      // without a user interaction to request access.
      window.addEventListener("deviceorientation", handleDeviceOrientation);
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
      <div className="relative">
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

        <img
          src={
            "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2-square.webp"
          }
          alt="Heidi Simelius on laulaja, lauluntekijä ja esiintyjä."
          className="h-auto w-[80vw] max-w-[370px] relative z-3 shadow-lg"
        />

        <div className="absolute bottom-[-118px] left-[-106px]">
          <h2
            ref={simeliusShadowRef}
            className="absolute font-santorini text-[hsl(350.45,76.52%,54.9%)] z-1 text-[95px] bottom-[-2px] left-[2px]"
          >
            Simelius
          </h2>
          <h2 className="absolute font-santorini text-foreground z-2 text-[95px] bottom-0 left-0">
            Simelius
          </h2>
        </div>
      </div>
      <div className="absolute bottom-0 flex flex-col w-full">
        <BottomBranding />
      </div>
    </div>
  );
};

export default HeroImageAndText;
