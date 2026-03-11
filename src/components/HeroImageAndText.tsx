import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomBranding from "./BottomBranding";
import LoadingSpinner from "./LoadingSpinner";
import { PageImagesContent } from "@/types/content";
import { defaultPageImagesContent } from "@/lib/utils";

const fetchPageImagesContent = async (): Promise<PageImagesContent> => {
  const { data, error } = await supabase
    .from("page_content")
    .select("content")
    .eq("page_name", "page_images")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No data found, return default content
      return defaultPageImagesContent;
    }
    throw new Error(error.message);
  }

  return data.content as unknown as PageImagesContent;
};

const HeroImageAndText = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heidiShadowRef = useRef<HTMLHeadingElement>(null);
  const simeliusShadowRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  // Fetch page images content
  const {
    data: pageImagesContent,
    isLoading: isDataLoading,
  } = useQuery({
    queryKey: ["page_content", "page_images"],
    queryFn: fetchPageImagesContent,
  });

  // Effect for handling text perspective shifts according to cursor movements
  useEffect(() => {
    const container = containerRef.current;
    const heidiShadow = heidiShadowRef.current;
    const simeliusShadow = simeliusShadowRef.current;

    if (!container || !heidiShadow || !simeliusShadow) return;

    const movementStrength = 4;

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

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Wait for image + font, then fade in
  useEffect(() => {
    if (isDataLoading || !pageImagesContent) return;

    let cancelled = false;
    let heroScrollAnimation: gsap.core.Tween;

    // Show spinner only if loading takes longer than 200ms
    const spinnerTimeout = window.setTimeout(() => {
      if (!cancelled) setShowSpinner(true);
    }, 200);

    const imageUrl = pageImagesContent.home_hero.src;

    // Preload the image
    const imagePromise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image failed to load"));
    });

    // Load the specific font (not just document.fonts.ready which can resolve prematurely)
    const fontPromise = document.fonts.load("1em Santorini").then(() => {
      // Double-check that it actually loaded
      if (!document.fonts.check("1em Santorini")) {
        return document.fonts.ready;
      }
    });

    Promise.all([imagePromise, fontPromise])
      .then(() => {
        if (cancelled) return;
        clearTimeout(spinnerTimeout);
        setShowSpinner(false);
        setIsReady(true);

        // Fade-in animation
        if (contentRef.current) {
          gsap.fromTo(
            contentRef.current,
            { opacity: 0, scale: 0.98 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out", delay: 0.05 },
          );
        }

        // Parallax scroll animation
        heroScrollAnimation = gsap.to(contentRef.current, {
          y: 140,
          ease: "none",
          scrollTrigger: {
            trigger: contentRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load hero assets:", error);
        clearTimeout(spinnerTimeout);
        setShowSpinner(false);
        setIsReady(true);
        // Show content anyway on error
        if (contentRef.current) {
          gsap.set(contentRef.current, { opacity: 1 });
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(spinnerTimeout);
      if (heroScrollAnimation) heroScrollAnimation.scrollTrigger?.kill();
    };
  }, [isDataLoading, pageImagesContent]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[650px] xs:h-[700px] sm:h-[840px] md:h-[900px] lg:h-[870px] items-center justify-center overflow-hidden bg-background pb-16 pt-8"
      style={{
        backgroundImage: `
        linear-gradient(
        18deg,
        hsl(234deg 24% 8%) 0%,
        hsl(234deg 23% 8%) 10%,
        hsl(234deg 23% 8%) 20%,
        hsl(239deg 23% 9%) 32%,
        hsl(238deg 23% 12%) 46%,
        hsl(236deg 23% 8%) 62%,
        hsl(234deg 24% 8%) 75%,
        hsl(234deg 24% 11%) 84%,
        hsl(234deg 24% 10%) 89%,
        hsl(234deg 24% 8%) 93%,
        hsl(235deg 23% 9%) 96%,
        hsl(234deg 23% 8%) 98%,
        hsl(234deg 23% 8%) 100%
      ),
        linear-gradient(
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
      {!isReady && showSpinner && (
        <LoadingSpinner className="absolute" />
      )}

      {/* opacity:0 via inline style prevents flash before GSAP takes over */}
      <div ref={contentRef} className="relative" style={{ opacity: 0 }}>
        {/* Inner container for scaling */}
        <div className="scale-[0.45] xxs:scale-[0.5] xs:scale-[0.55] sm:scale-75 md:scale-90 lg:scale-100">
          {/* --- "Heidi" Word Group --- */}
          <div className="absolute top-[-180px] left-[-102px] lg:top-[-68px] lg:left-[-327px] xl:left-[-377px] lg:z-[31]">
            <h2
              ref={heidiShadowRef}
              className="absolute z-10 font-santorini text-[118px] text-primary top-[2px] left-[2px]"
            >
              Heidi
            </h2>
            <h2 className="relative z-20 font-santorini text-[118px] text-foreground">
              Heidi
            </h2>
          </div>

          {/* --- Central Image --- */}
          <img
            src={
              pageImagesContent?.home_hero?.src ||
              "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2-square.webp"
            }
            alt={
              pageImagesContent?.home_hero?.alt ||
              "Heidi Simelius on laulaja, lauluntekijä, laulunopettaja ja esiintyjä."
            }
            className="relative z-30 h-auto w-[370px] shadow-lg image-glow-home-hero"
          />

          {/* --- "Simelius" Word Group --- */}
          <div className="absolute bottom-[-118px] left-[-106px] lg:left-[182px] xl:left-[240px] lg:bottom-[-58px] lg:z-[31]">
            <h2
              ref={simeliusShadowRef}
              className="absolute z-10 font-santorini text-[95px] text-primary top-[2px] left-[2px]"
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
