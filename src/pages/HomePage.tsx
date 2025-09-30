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

    // A context for GSAP to properly scope the animations and cleanup
    const ctx = gsap.context(() => {
      // Get the portrait's initial layout position determined by CSS (Tailwind classes)
      const initialY = portrait.offsetTop;

      const calculateFinalY = () => {
        const brandingRect = bottomBranding.getBoundingClientRect();
        const portraitHeight = portrait.offsetHeight;
        const containerTop = container.getBoundingClientRect().top + window.scrollY;
        
        // Calculate the target Y position where portrait's BOTTOM is 20px ABOVE branding's TOP
        // This is the final destination relative to the container's top edge.
        return brandingRect.top + window.scrollY - containerTop - portraitHeight - 20;
      };

      const calculateDistanceToTravel = () => {
        const finalY = calculateFinalY();
        // The distance we need to animate is the destination minus the starting point
        return finalY - initialY;
      };

      gsap.to(portrait, {
        y: calculateDistanceToTravel, // Animate *by* this distance
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: () => `+=${calculateDistanceToTravel()}`, // The scroll duration is the same as the travel distance
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, container); // Scope the context to the container

    return () => ctx.revert(); // Cleanup function to kill animations and triggers
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