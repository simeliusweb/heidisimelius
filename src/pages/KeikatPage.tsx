import { Helmet } from "react-helmet-async";
import EventGroup from "@/components/EventGroup";
import { Button } from "@/components/ui/button";

const KeikatPage = () => {
  const tootsieMusical = {
    imageUrl: "/images/placeholder-tootsie.jpg",
    title: "Tootsie-musikaali",
    venue: "Lahden Kaupunginteatteri",
    description: "Kaudella 2023-2024 Heidi nähdään Lahden Kaupunginteatterin Tootsie-musikaalissa.",
    performances: [
      { date: "Pe 24.10.2025", time: "klo 19:00", ticketUrl: "#" },
      { date: "La 25.10.2025", time: "klo 13:00", ticketUrl: "#" },
      { date: "La 25.10.2025", time: "klo 19:00", ticketUrl: "#" }
    ]
  };

  const heidiTrioLive = {
    imageUrl: "/images/placeholder-trio.jpg",
    title: "Heidi Simelius Trio Live",
    venue: "G Livelab, Tampere",
    description: "Heidi Simelius esittää uuden albuminsa kappaleita trionsa kanssa.",
    performances: [
      { date: "La 15.11.2025", time: "klo 20:00", ticketUrl: "#" }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Keikat | Heidi Simelius</title>
        <meta
          name="description"
          content="Tulevat keikkapäivät ja tapahtumat - Heidi Simelius"
        />
      </Helmet>

      {/* Page Header with Video Placeholder */}
      <section className="relative w-full h-[50vh] md:h-[60vh] flex items-end justify-center overflow-hidden">
        {/* Background Video Placeholder */}
        <div className="absolute inset-0 bg-card" />
        
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
        <h2 className="text-4xl md:text-5xl font-playfair font-extrabold text-foreground mb-8">
          Musiikkikeikat
        </h2>
        <EventGroup {...heidiTrioLive} />
        <div className="flex justify-center mt-8">
          <Button variant="outline" size="lg">
            Näytä kaikki
          </Button>
        </div>
      </section>

      {/* Teatteriesitykset Section */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-4xl md:text-5xl font-playfair font-extrabold text-foreground mb-8">
          Teatteriesitykset
        </h2>
        <EventGroup {...tootsieMusical} />
        <div className="flex justify-center mt-8">
          <Button variant="outline" size="lg">
            Näytä kaikki
          </Button>
        </div>
      </section>
    </>
  );
};

export default KeikatPage;
