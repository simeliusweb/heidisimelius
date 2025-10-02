import { Helmet } from "react-helmet-async";

const BilebandiPage = () => {
  return (
    <>
      <Helmet>
        <title>Heidi & The Hot Stuff - Bilebändi | Heidi Simelius</title>
        <meta
          name="description"
          content="Heidi & The Hot Stuff - energinen bilebändi joka tekee bileistäsi unohtumattoman"
        />
      </Helmet>

      {/* Hero Header */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-4 tracking-tight">
            Heidi & The Hot Stuff
          </h1>
        </div>
      </section>

      {/* Band Introduction Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-8 text-center">
          Bändiesittely
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-center">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
      </section>

      {/* Demo Video Section */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-12 text-center">
          Katso meidät livenä!
        </h2>
        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl">
          <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="Heidi & The Hot Stuff - Live Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {/* Booking & Contact Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-8">
          Varaa bilebändi
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
          Kiinnostuitko? Ota yhteyttä sähköpostitse ja pyydä tarjous! Heidi & The Hot Stuff tekee juhlistasi ikimuistoiset.
        </p>
        <p className="text-xl md:text-2xl text-foreground font-semibold">
          booking@heidisimelius.fi
        </p>
      </section>
    </>
  );
};

export default BilebandiPage;
