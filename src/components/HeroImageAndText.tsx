import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { Hand } from "lucide-react";
import BottomBranding from "./BottomBranding";
import { Button } from "./ui/button";

// Define a type for the permission state
type PermissionState = "prompt" | "granted" | "denied";

// Create a custom interface for the event
interface DeviceOrientationEventWithPermission extends DeviceOrientationEvent {
  requestPermission?: () => Promise<"granted" | "denied">;
}

const HeroImageAndText = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heidiShadowRef = useRef<HTMLHeadingElement>(null);
  const simeliusShadowRef = useRef<HTMLHeadingElement>(null);

  // Cast the event constructor to our custom type
  const doe =
    DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;

  // State to handle device motion permission on iOS
  const [permissionState, setPermissionState] =
    useState<PermissionState>("prompt");

  // Function to request permission on user click
  const requestMotionPermission = async () => {
    // This is the specific API for Webkit/Safari
    if (typeof doe.requestPermission === "function") {
      try {
        const permission = await doe.requestPermission();
        if (permission === "granted") {
          setPermissionState("granted");
        } else {
          setPermissionState("denied");
        }
      } catch (error) {
        console.error("Device orientation permission request failed:", error);
        setPermissionState("denied");
      }
    } else {
      // For non-iOS devices, permission is usually granted by default
      setPermissionState("granted");
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    const heidiShadow = heidiShadowRef.current;
    const simeliusShadow = simeliusShadowRef.current;

    if (!container || !heidiShadow || !simeliusShadow) return;

    const movementStrength = 20;

    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      const { offsetWidth, offsetHeight } = container;
      const xPos = (clientX / offsetWidth - 0.5) * 2;
      const yPos = (clientY / offsetHeight - 0.5) * 2;
      gsap.to([heidiShadow, simeliusShadow], {
        x: -xPos * movementStrength,
        y: -yPos * movementStrength,
        duration: 1.111,
        ease: "power2.out",
      });
    };

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      const { gamma, beta } = event;
      if (gamma === null || beta === null) return;
      const clamp = (val: number, min: number, max: number) =>
        Math.max(min, Math.min(val, max));
      const clampedGamma = clamp(gamma, -30, 30);
      const clampedBeta = clamp(beta, -30, 30);
      const xPos = clampedGamma / 30;
      const yPos = clampedBeta / 30;
      gsap.to([heidiShadow, simeliusShadow], {
        x: -xPos * movementStrength,
        y: -yPos * movementStrength,
        duration: 1.111,
        ease: "power2.out",
      });
    };

    const isTouchDevice = "ontouchstart" in window;
    if (!isTouchDevice) {
      container.addEventListener("mousemove", handleMouseMove);
    } else if (permissionState === "granted") {
      // Only listen for tilt if permission has been granted
      window.addEventListener("deviceorientation", handleDeviceOrientation);
    }

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
    // Re-run effect if permission state changes
  }, [permissionState]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[650px] xs:h-[700px] sm:h-[840px] md:h-[1040px] items-center justify-center overflow-hidden bg-[#000] pb-16 pt-8"
    >
      {/* Inner container for scaling */}
      <div className="relative scale-[0.45] xxs:scale-[0.5] xs:scale-[0.55] sm:scale-75 md:scale-90 lg:scale-100">
        {/* --- "Heidi" Word Group --- */}
        <div className="absolute top-[-180px] left-[-102px]">
          <h2
            ref={heidiShadowRef}
            className="absolute z-10 font-santorini text-[118px] text-[hsl(350.45,76.52%,54.9%)]"
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
            className="absolute z-10 font-santorini text-[95px] text-[hsl(350.45,76.52%,54.9%)]"
          >
            Simelius
          </h2>
          <h2 className="relative z-20 font-santorini text-[95px] text-foreground">
            Simelius
          </h2>
        </div>
      </div>

      {/* Permission button for mobile */}
      {typeof window !== "undefined" &&
        "ontouchstart" in window &&
        permissionState === "prompt" && (
          <Button
            variant="outline"
            onClick={requestMotionPermission}
            className="absolute bottom-32 z-50 animate-pulse"
          >
            <Hand className="mr-2 h-4 w-4" />
            Salli animaatiot
          </Button>
        )}

      <div className="absolute bottom-0 flex w-full flex-col">
        <BottomBranding />
      </div>
    </div>
  );
};

export default HeroImageAndText;
