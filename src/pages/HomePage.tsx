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

    // Calculate the end position: 20px above BottomBranding
    const bottomBranding = document.querySelector('.bottom-branding');
    if (!bottomBranding) return;

    const calculateEndPosition = () => {
      const brandingRect = bottomBranding.getBoundingClientRect();
      const portraitHeight = portrait.offsetHeight;
      const containerTop = container.getBoundingClientRect().top + window.scrollY;
      
      // Calculate how far down we want the portrait to go
      // It should stop when its bottom is 20px above BottomBranding
      const endY = brandingRect.top + window.scrollY - containerTop - portraitHeight - 20;
      
      return endY;
    };

    // Set up parallax animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: () => {
          const endPos = calculateEndPosition();
          return `+=${endPos}`;
        },
        scrub: 1,
        invalidateOnRefresh: true,
      }
    });

    tl.to(portrait, {
      y: calculateEndPosition(),
      ease: "none"
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
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
        {/* Portrait Placeholder with Parallax - starts higher than center */}
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
