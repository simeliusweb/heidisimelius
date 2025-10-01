import { Helmet } from "react-helmet-async";

const GalleriaPage = () => {
  return (
    <>
      <Helmet>
        <title>Galleria - Heidi Simelius</title>
        <meta name="description" content="Heidi Simeliuksen valokuvagalleria - pressikuvat ja kuvagalleria" />
      </Helmet>
      
      <main className="container mx-auto px-6 py-16 md:py-24">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-playfair font-extrabold text-primary mb-12 text-center">
          Galleria
        </h1>
      </main>
    </>
  );
};

export default GalleriaPage;
