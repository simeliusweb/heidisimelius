import { useState } from "react";
import { Helmet } from "react-helmet-async";
import EventGroup from "@/components/EventGroup";
import PastGigCard from "@/components/PastGigCard";
import { Button } from "@/components/ui/button";
import keikatHeroBg from "@/assets/keikat-hero-bg.jpg";

const KeikatPage = () => {
  const [visibleCount, setVisibleCount] = useState(3);

  const tootsieMusical = {
    imageUrl: "/images/placeholder-tootsie.jpg",
    title: "Tootsie-musikaali",
    venue: "Lahden Kaupunginteatteri",
    description: "Kaudella 2023-2024 Heidi nähdään Lahden Kaupunginteatterin Tootsie-musikaalissa.",
    eventPageUrl: "https://example.com/tootsie",
    ticketsUrl: "https://example.com/tickets/tootsie",
    performances: [
      { date: "2025-10-24", time: "19:00" },
      { date: "2025-10-25", time: "13:00" },
      { date: "2025-11-1", time: "20:00" },
      { date: "2025-11-17", time: "19:30" },
      { date: "2025-11-28", time: "18:30" },
      { date: "2025-12-6", time: "17:00" },
      { date: "2025-12-18", time: "20:30" }
    ]
  };

  const heidiTrioLive = {
    imageUrl: "/images/placeholder-trio.jpg",
    title: "Heidi Simelius Trio Live",
    venue: "G Livelab, Tampere",
    description: "Heidi Simelius esittää uuden albuminsa kappaleita trionsa kanssa.",
    ticketsUrl: "https://example.com/tickets/trio",
    performances: [
      { date: "2025-11-15", time: "20:00" }
    ]
  };

  // All past gigs data
  const allPastGigs = [
    {
      imageUrl: "/images/placeholder-evita.jpg",
      title: "Evita-musikaali",
      gigType: 'Teatteri' as const,
      date: "12.05.2023",
      venue: "Porin Teatteri"
    },
    {
      imageUrl: "/images/placeholder-80s.jpg",
      title: "80's kiertue",
      gigType: 'Musiikki' as const,
      date: "22.09.2023",
      venue: "Suomen varusmiessoittokunta"
    },
    {
      imageUrl: "/images/placeholder-tootsie.jpg",
      title: "Cabaret-musikaali",
      gigType: 'Teatteri' as const,
      date: "15.11.2024",
      venue: "Helsingin Kaupunginteatteri"
    },
    {
      imageUrl: "/images/placeholder-trio.jpg",
      title: "Jazz Yö",
      gigType: 'Musiikki' as const,
      date: "03.08.2024",
      venue: "Savoy-teatteri, Helsinki"
    },
    {
      imageUrl: "/images/placeholder-evita.jpg",
      title: "Mamma Mia!",
      gigType: 'Teatteri' as const,
      date: "18.03.2024",
      venue: "Tampereen Teatteri"
    },
    {
      imageUrl: "/images/placeholder-80s.jpg",
      title: "Kesäfestivaali",
      gigType: 'Musiikki' as const,
      date: "25.06.2023",
      venue: "Kauppatori, Turku"
    },
    {
      imageUrl: "/images/placeholder-tootsie.jpg",
      title: "Chicago-musikaali",
      gigType: 'Teatteri' as const,
      date: "10.01.2024",
      venue: "Turun Kaupunginteatteri"
    },
    {
      imageUrl: "/images/placeholder-trio.jpg",
      title: "Joulukonsertti",
      gigType: 'Musiikki' as const,
      date: "20.12.2023",
      venue: "Musiikkitalo, Helsinki"
    },
    {
      imageUrl: "/images/placeholder-evita.jpg",
      title: "Kinky Boots",
      gigType: 'Teatteri' as const,
      date: "05.02.2024",
      venue: "Oulun Teatteri"
    }
  ];

  // Sort past gigs by date in descending order (most recent first)
  const sortedPastGigs = [...allPastGigs].sort((a, b) => {
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    };
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  return (
    <>
      <Helmet>
        <title>Keikat | Heidi Simelius</title>
        <meta
          name="description"
          content="Tulevat keikkapäivät ja tapahtumat - Heidi Simelius"
        />
      </Helmet>

      {/* Page Header with Background Image */}
      <section className="relative w-full h-[50vh] md:h-[60vh] flex items-end justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: `url(${keikatHeroBg})` }}
        />
        
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
        
        {/* Page Title */}
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="text-6xl md:text-8xl lg:text-10xl font-playfair font-extrabold text-center text-primary">
            Keikat
          </h1>
        </div>
      </section>

      {/* Musiikkikeikat Section */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-8 italic">
          Musiikkikeikat
        </h2>
        <EventGroup {...heidiTrioLive} />
      </section>

      {/* Teatteriesitykset Section */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-8 italic">
          Teatteriesitykset
        </h2>
        <EventGroup {...tootsieMusical} />
      </section>

      {/* Past Gigs Section */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-8 italic">
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
                onClick={() => setVisibleCount(prev => prev + 10)}
                size="lg"
                variant="outline"
              >
                Näytä lisää
              </Button>
            ) : (
              <p className="text-lg text-muted-foreground font-source-sans">
                Tässä kaikki!
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default KeikatPage;
