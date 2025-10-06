import { useState } from "react";
import EventGroup from "@/components/EventGroup";
import PastGigCard from "@/components/PastGigCard";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/config/metadata";
import { FaInstagram } from "react-icons/fa";

const KeikatPage = () => {
  const [visibleCount, setVisibleCount] = useState(2);

  const kinkyBootsMusical = {
    imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
    title: "Kinky Boots -musikaali",
    venue: "Oulun teatteri",
    description:
      "Kaudella 2025 Heidi nähdään Oulun teatterin Kinky Boots -musikaalissa.",
    eventPageUrl: "https://oulunteatteri.fi/naytelma/kinky-boots/",
    ticketsUrl:
      "https://oulunteatteri.lippu.fi/webshop/webticket/eventlist?production=52 ",
    performances: [
      { date: "2025-10-10", time: "19:00" },
      { date: "2025-10-11", time: "13:00" },
      { date: "2025-10-17", time: "19:00" },
      { date: "2025-10-18", time: "19:00" },
      { date: "2025-10-23", time: "19:00" },
      { date: "2025-10-24", time: "19:00" },
      { date: "2025-10-30", time: "19:00" },
      { date: "2025-10-31", time: "13:00" },
      { date: "2025-11-07", time: "19:00" },
      { date: "2025-11-08", time: "13:00" },
      { date: "2025-11-26", time: "19:00" },
      { date: "2025-11-28", time: "19:00" },
      { date: "2025-11-29", time: "19:00" },
    ],
  };

  const heidiTrioLive = {
    imageUrl: "/images/demo/placeholder-trio.jpg",
    title: "Heidi Simelius Trio Live",
    venue: "G Livelab, Tampere",
    description:
      "Heidi Simelius esittää uuden albuminsa kappaleita trionsa kanssa.",
    ticketsUrl: "https://example.com/tickets/trio",
    performances: [{ date: "2025-11-15", time: "20:00" }],
  };

  // All past gigs data
  const allPastGigs = [
    {
      imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
      title: "Kinky Boots -musikaali",
      venue: "Oulun teatteri",
      gigType: "Teatteri" as const,
      date: "5.9.2025",
    },
    {
      imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
      title: "Kinky Boots -musikaali",
      venue: "Oulun teatteri",
      gigType: "Teatteri" as const,
      date: "6.9.2025",
    },
    {
      imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
      title: "Kinky Boots -musikaali",
      venue: "Oulun teatteri",
      gigType: "Teatteri" as const,
      date: "12.9.2025",
    },
    {
      imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
      title: "Kinky Boots -musikaali",
      venue: "Oulun teatteri",
      gigType: "Teatteri" as const,
      date: "13.9.2025",
    },
    {
      imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
      title: "Kinky Boots -musikaali",
      venue: "Oulun teatteri",
      gigType: "Teatteri" as const,
      date: "26.9.2025",
    },
    {
      imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
      title: "Kinky Boots -musikaali",
      venue: "Oulun teatteri",
      gigType: "Teatteri" as const,
      date: "27.9.2025",
    },
    {
      imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
      title: "Kinky Boots -musikaali",
      venue: "Oulun teatteri",
      gigType: "Teatteri" as const,
      date: "2.10.2025",
    },
    {
      imageUrl: "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
      title: "Kinky Boots -musikaali",
      venue: "Oulun teatteri",
      gigType: "Teatteri" as const,
      date: "3.10.2025",
    },
  ];

  // Sort past gigs by date in descending order (most recent first)
  const sortedPastGigs = [...allPastGigs].sort((a, b) => {
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split(".").map(Number);
      return new Date(year, month - 1, day);
    };
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  // Generate MusicEvent structured data for all performances
  const musicEventsSchema = [
    ...heidiTrioLive.performances.map((performance) => ({
      "@context": "https://schema.org",
      "@type": "MusicEvent",
      name: heidiTrioLive.title,
      startDate: `${performance.date}T${performance.time}:00+02:00`,
      location: {
        "@type": "Place",
        name: heidiTrioLive.venue,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Tampere",
          addressCountry: "FI",
        },
      },
      image: heidiTrioLive.imageUrl,
      description: heidiTrioLive.description,
      offers: {
        "@type": "Offer",
        url: heidiTrioLive.ticketsUrl,
        price: "TBA",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
      performer: {
        "@type": "Person",
        name: "Heidi Simelius",
      },
    })),
    ...kinkyBootsMusical.performances.map((performance) => ({
      "@context": "https://schema.org",
      "@type": "MusicEvent",
      name: kinkyBootsMusical.title,
      startDate: `${performance.date}T${performance.time}:00+02:00`,
      location: {
        "@type": "Place",
        name: kinkyBootsMusical.venue,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Lahti",
          addressCountry: "FI",
        },
      },
      image: kinkyBootsMusical.imageUrl,
      description: kinkyBootsMusical.description,
      offers: {
        "@type": "Offer",
        url: kinkyBootsMusical.ticketsUrl,
        price: "TBA",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
      performer: {
        "@type": "Person",
        name: "Heidi Simelius",
      },
    })),
  ];

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(
      24deg,
      hsl(234deg 24% 8%) 0%,
      hsl(234deg 23% 8%) 10%,
      hsl(234deg 23% 9%) 20%,
      hsl(239deg 23% 9%) 32%,
      hsl(238deg 23% 12%) 46%,
      hsl(236deg 23% 8%) 62%,
      hsl(234deg 24% 8%) 75%,
      hsl(238deg 24% 9%) 84%,
      hsl(230deg 24% 8%) 89%,
      hsl(234deg 24% 8%) 93%,
      hsl(239deg 23% 12%) 96%,
      hsl(237deg 23% 10%) 98%,
      hsl(234deg 23% 8%) 100%
    )`,
      }}
    >
      <PageMeta
        title={pageMetadata.keikat.title}
        description={pageMetadata.keikat.description}
      />
      <StructuredData data={musicEventsSchema} />

      {/* Page Header with Background Image */}
      <section className="relative z-1 w-full h-[50vh] sm:h-[60vh] md:h-[90vh] flex items-end justify-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-bottom bg-no-repeat"
          style={{
            backgroundImage: `url(/images/2025-glow-festival-favourites-22.8.2025-ville-huuri-16.webp)`,
          }}
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />

        {/* Page Title */}
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 text-6xl sm:text-8xl md:text-[112px] lg:text-[128px] font-playfair font-extrabold text-center text-primary w-fit">
            Keikat
          </h1>
        </div>

        {/* Credits */}
        <p className="absolute bottom-0 right-0 text-muted text-[12px] font-sans italic p-2 bg-border/50 rounded-tl-lg">
          Kuva: Ville Huuri
        </p>
      </section>

      {/* Musiikkikeikat Section */}
      <section className="container mx-auto px-4 py-12 pt-32">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-sans font-extrabold text-foreground mb-8 sm:mb-12">
          Musiikkikeikat
        </h2>
        {heidiTrioLive ? (
          <EventGroup {...heidiTrioLive} id="heidi-simelius-trio-live" />
        ) : (
          <>
            {/* Show this section when there are no gigs coming */}
            <div className="max-w-[800px] mx-auto">
              <p className="text-lg text-foreground">
                Tulevia keikkoja ei ole juuri nyt kalenterissa. Seuraa minua
                Instagramissa, niin pysyt parhaiten ajan tasalla tulevista
                esiintymisistä!
              </p>
              <a
                href="https://www.instagram.com/Heidisimelius/"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-center gap-3 text-secondary-foreground transition-all duration-300"
                aria-label="Seuraa Heidi Simeliusta Instagramissa"
              >
                <FaInstagram className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-lg font-semibold group-hover:underline">
                  @heidisimelius
                </span>
              </a>
            </div>
          </>
        )}
      </section>

      {/* Teatteriesitykset Section */}
      <section className="container mx-auto px-4 py-12 pt-24">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-sans font-extrabold text-foreground mb-8 sm:mb-12">
          Teatteriesitykset
        </h2>
        <EventGroup {...kinkyBootsMusical} id="kinkyboots-musikaali" />
      </section>

      {/* Past Gigs Section */}
      <section className="container mx-auto px-4 py-12 pb-32">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-sans font-extrabold text-foreground mb-8 sm:mb-12">
          Menneet keikat
        </h2>

        <div className="space-y-8">
          <div className="space-y-4 max-w-[800px] mx-auto">
            {sortedPastGigs.slice(0, visibleCount).map((gig, index) => (
              <PastGigCard key={index} {...gig} />
            ))}
          </div>

          <div className="flex justify-center">
            {visibleCount < sortedPastGigs.length ? (
              <Button
                onClick={() => setVisibleCount((prev) => prev + 10)}
                size="lg"
                variant="outline"
              >
                Näytä lisää
              </Button>
            ) : (
              <p className="text-lg text-foreground font-source-sans">
                Tässä kaikki!
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default KeikatPage;
