import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import BottomBranding from "@/components/BottomBranding";
import VideosSection from "@/components/VideosSection";
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
    const bottomBranding = document.querySelector(".bottom-branding");

    if (!bottomBranding) return;

    const ctx = gsap.context(() => {
      const calculateDistanceToTravel = () => {
        // Get the absolute top position of the branding element from the top of the document
        const brandingAbsoluteTop =
          bottomBranding.getBoundingClientRect().top + window.scrollY;

        // Get the absolute top position of the portrait element in its starting state
        const portraitAbsoluteTop_initial =
          portrait.getBoundingClientRect().top + window.scrollY;

        // Calculate the desired FINAL absolute top position for the portrait.
        // This is where the portrait's top edge should be when its bottom is 20px above the branding's top.
        const portraitAbsoluteTop_final =
          brandingAbsoluteTop - portrait.offsetHeight - 20;

        // The distance to travel is simply the difference between the final and initial positions minus branding element's height.
        return portraitAbsoluteTop_final - portraitAbsoluteTop_initial;
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
    <>
      <Helmet>
        {/* Helmet handles the LightWidget script tag correctly */}
        <script src="https://cdn.lightwidget.com/widgets/lightwidget.js"></script>
      </Helmet>
      <div ref={containerRef} className="relative min-h-screen">
        {/* Art-Directed Background Images */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat md:hidden"
          style={{
            backgroundImage: `url(${heroBgMobile})`,
            filter: "blur(2px)",
          }}
        />
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
          style={{
            backgroundImage: `url(${heroBgDesktop})`,
            filter: "blur(2px)",
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
          <BottomBranding />
        </div>

        {/* Content Sections */}
        <div className="relative z-10 bg-background">
          {/* Intro & Tagline Section */}
          <section className="container mx-auto px-6 py-16 md:py-24 text-center">
            <p className="text-xl md:text-2xl text-foreground font-source mb-8">
              Heidi Simelius on laulaja, lauluntekijä ja esiintyjä.
            </p>
            <Button asChild size="lg" className="font-medium">
              <a href="/bio">Tutustu Heidiin</a>
            </Button>
          </section>

          {/* Upcoming Gigs Section */}
          <section className="container mx-auto px-6 py-16 md:py-24">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold italic text-primary mb-8 text-center">
              Tulevat keikat
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto mb-8">
              {[1, 2, 3].map((gig) => (
                <div
                  key={gig}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
                >
                  <h3 className="text-xl font-playfair text-foreground mb-2">
                    Keikka {gig}
                  </h3>
                  <p className="text-muted mb-1">25.12.2025 klo 19:00</p>
                  <p className="text-foreground">Tapahtumapaikka {gig}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button asChild size="lg" variant="outline">
                <a href="/keikat">Katso kaikki keikat</a>
              </Button>
            </div>
          </section>

          {/* Spotify Player Section */}
          <section className="container mx-auto px-6 py-16 md:py-24">
            <div className="max-w-3xl mx-auto">
              <iframe
                data-testid="embed-iframe"
                style={{ borderRadius: "12px" }}
                src="https://open.spotify.com/embed/artist/7wmdyUKDAcJfmWbgsARwl9?utm_source=generator&theme=0"
                width="100%"
                height="352"
                frameBorder="0"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            </div>
          </section>

          {/* Videos Section */}
          <VideosSection
            sectionTitle="Videot"
            variant="featured"
            videos={[
              { url: "https://www.youtube.com/watch?v=nNooz5tHV6U", isFeatured: true },
              { url: "https://www.youtube.com/watch?v=lR4VJkIKmZ0" },
              { url: "https://www.youtube.com/watch?v=m-ZMCIMdZrQ" },
              { url: "https://www.youtube.com/watch?v=xeI9fczPexk" },
              { url: "https://www.youtube.com/watch?v=eqQEVrCPCxQ" },
              { url: "https://www.youtube.com/watch?v=EMVUePUaVAY" },
              { url: "https://www.youtube.com/watch?v=Ikfy983tspw" },
              { url: "https://www.youtube.com/watch?v=wmpajFyxkVE" },
            ]}
          />

          {/* Instagram Feed Section */}
          <section className="container mx-auto px-6 py-16 md:py-24">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold italic text-primary mb-8 text-center">
              Instagram
            </h2>
            <div className="max-w-4xl mx-auto mb-8">
              {/* LightWidget embed */}
              <iframe
                src="https://cdn.lightwidget.com/widgets/71dd661fedf55720848701cf279e6d14.html"
                className="lightwidget-widget"
                style={{ width: "100%", border: 0, overflow: "hidden" }}
              ></iframe>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg">
                <a
                  href="https://www.instagram.com/heidisimelius/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Seuraa
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a
                  href="https://www.instagram.com/heidisimelius/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Katso lisää julkaisuja
                </a>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default HomePage;
