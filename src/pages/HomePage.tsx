import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BottomBranding from "@/components/BottomBranding";
import heroBgMobile from "@/assets/hero-bg-mobile.jpg";
import heroBgDesktop from "@/assets/hero-bg-desktop.jpg";

gsap.registerPlugin(ScrollTrigger);

const HomePage = () => {
  const portraitRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!portraitRef.current || !containerRef.current) return;

    const portrait = portraitRef.current;
    const container = containerRef.current;
    const bottomBranding = document.querySelector('.bottom-branding');

    if (!bottomBranding) return;

    const ctx = gsap.context(() => {
      const calculateDistanceToTravel = () => {
        // Get the absolute top position of the branding element from the top of the document
        const brandingAbsoluteTop = bottomBranding.getBoundingClientRect().top + window.scrollY;
        
        // Get the absolute top position of the portrait element in its starting state
        const portraitAbsoluteTop_initial = portrait.getBoundingClientRect().top + window.scrollY;

        // Calculate the desired FINAL absolute top position for the portrait.
        // This is where the portrait's top edge should be when its bottom is 20px above the branding's top.
        const portraitAbsoluteTop_final = brandingAbsoluteTop - portrait.offsetHeight - 20;

        // The distance to travel is simply the difference between the final and initial positions minus branding element's height.
        return portraitAbsoluteTop_final - portraitAbsoluteTop_initial - bottomBranding.clientHeight;
      };

      gsap.to(portrait, {
        y: calculateDistanceToTravel,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: () => `+=${calculateDistanceToTravel()}`,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Art-Directed Background Images */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat md:hidden"
        style={{ 
          backgroundImage: `url(${heroBgMobile})`,
          filter: 'blur(2px)',
        }}
      />
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
        style={{ 
          backgroundImage: `url(${heroBgDesktop})`,
          filter: 'blur(2px)',
        }}
      />
      
      {/* Dark overlay for better text visibility */}
      <div className="fixed inset-0 bg-background/40" />
      
      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Portrait Placeholder with Parallax */}
        {/* The pt-32 class correctly sets the initial position */}
        <div className="flex-1 flex items-start justify-center pt-32 md:pt-32 pb-32">
          <div 
            ref={portraitRef}
            className="w-64 h-96 md:w-80 md:h-[30rem] bg-card/50 backdrop-blur-sm border-2 border-primary/30 rounded-lg flex items-center justify-center"
          >
            <span className="text-muted text-sm">Portrait Placeholder</span>
          </div>
        </div>
        
        {/* Bottom Branding Overlay */}
        <div className="bottom-branding">
          <BottomBranding />
        </div>
      </div>
    </div>
  );
};

export default HomePage;