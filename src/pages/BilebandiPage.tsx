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
    </>
  );
};

export default BilebandiPage;
