import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import useFontLoaded from "@/hooks/useFontLoaded";
import { Skeleton } from "@/components/ui/skeleton";

const quickLinks = [
  { label: "Keikat", href: "/keikat" },
  { label: "Bio", href: "/bio" },
  { label: "Galleria", href: "/galleria" },
  { label: "Laulunopetus", href: "/laulunopetus" },
  {
    label: "Heidi & The Hot Stuff",
    href: "/bilebandi-heidi-and-the-hot-stuff",
  },
];

const NotFound = () => {
  const location = useLocation();
  const santoriniLoaded = useFontLoaded("Santorini");

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div
      style={{
        backgroundImage: `
        linear-gradient(
      12deg,
      hsl(234deg 24% 8%) 0%,
      hsl(234deg 23% 8%) 10%,
      hsl(234deg 23% 11%) 20%,
      hsl(239deg 23% 9%) 32%,
      hsl(238deg 23% 12%) 46%,
      hsl(236deg 23% 8%) 62%,
      hsl(234deg 24% 8%) 75%,
      hsl(234deg 24% 11%) 84%,
      hsl(234deg 24% 10%) 89%,
      hsl(234deg 24% 8%) 93%,
      hsl(235deg 23% 9%) 96%,
      hsl(235deg 23% 10%) 98%,
      hsl(234deg 23% 8%) 100%
    )`,
        backgroundBlendMode: "overlay",
      }}
    >
      <PageMeta
        title="Sivua ei löytynyt | Heidi Simelius"
        description="Etsimääsi sivua ei löytynyt. Palaa etusivulle tai tutustu Heidi Simeliuksen keikkoihin, musiikkiin ja laulunopetukseen."
      />
      {/* A 404 should never be indexed */}
      <Helmet>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <main className="min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center">
        {/* 404 */}
        <p
          className="font-playfair font-extrabold leading-none text-secondary text-7xl xs:text-8xl sm:text-9xl select-none"
          aria-hidden="true"
        >
          404
        </p>

        {/* Script accent. Santorini's flourishes overflow the line box, so this needs
            more vertical room than the measured box height suggests. */}
        {santoriniLoaded ? (
          <p className="font-santorini text-muted-foreground text-xl sm:text-2xl md:text-3xl mt-10 mb-4 leading-loose italic px-4">
            Hups, nyt meni ohi nuotin
          </p>
        ) : (
          <div className="flex justify-center mt-10 mb-4">
            <Skeleton className="h-7 sm:h-9 w-56 sm:w-72" />
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mt-6">
          Sivua ei löytynyt
        </h1>

        <p className="max-w-xl mt-6 text-foreground/80 text-base sm:text-lg leading-relaxed">
          Etsimääsi sivua ei valitettavasti löytynyt. Se on voitu siirtää tai
          poistaa – tai osoitteessa on kirjoitusvirhe.
        </p>

        {/* Primary action */}
        <div className="mt-10">
          <Button asChild size="lg" className="element-embedded-effect">
            <Link to="/">Palaa etusivulle</Link>
          </Button>
        </div>

        {/* Quick links so a lost visitor still finds the right page */}
        <nav aria-label="Pikalinkit" className="mt-12 w-full max-w-2xl">
          <p className="text-accent text-sm uppercase tracking-wider mb-4">
            Tai siirry suoraan
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
            {quickLinks.map((link, index) => (
              <li key={link.href} className="flex items-center gap-4">
                <Link
                  to={link.href}
                  className="uppercase tracking-wider text-sm font-medium text-secondary-foreground hover:text-secondary transition-colors"
                >
                  {link.label}
                </Link>
                {index < quickLinks.length - 1 && (
                  <span aria-hidden="true" className="text-secondary-foreground">
                    •
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
};

export default NotFound;
