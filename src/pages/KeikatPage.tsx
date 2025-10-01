import { Helmet } from "react-helmet-async";

const KeikatPage = () => {
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
      <section className="relative w-full h-[50vh] md:h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Background Video Placeholder */}
        <div className="absolute inset-0 bg-card" />
        
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
        
        {/* Page Title */}
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="font-playfair font-extrabold text-4xl md:text-5xl lg:text-6xl text-center text-foreground">
            Keikat
          </h1>
        </div>
      </section>
    </>
  );
};

export default KeikatPage;
