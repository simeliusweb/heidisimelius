import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import bioPress1 from "@/assets/bio-press-1.jpg";
import bioPress2 from "@/assets/bio-press-2.jpg";
import bioPress3 from "@/assets/bio-press-3.jpg";

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

        {/* Pressikuvat Section */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-extrabold text-foreground mb-8">
            Pressikuvat
          </h2>

          {/* Press Photos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[
              { src: bioPress1, alt: "Heidi Simelius pressikuva 1" },
              { src: bioPress2, alt: "Heidi Simelius pressikuva 2" },
              { src: bioPress3, alt: "Heidi Simelius pressikuva 3" },
            ].map((photo, index) => (
              <div key={index} className="flex flex-col gap-8 sm:gap-4">
                <div className="aspect-[3/4] overflow-hidden rounded-lg">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href={photo.src} download>
                    <Download className="w-4 h-4" />
                    Lataa kuva
                  </a>
                </Button>
              </div>
            ))}
          </div>

          {/* Download All Button */}
          <div className="flex justify-center">
            <Button size="lg" asChild>
              <a href="#" download>
                <Download className="w-5 h-5" />
                Lataa kaikki pressikuvat (.zip)
              </a>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
};

export default GalleriaPage;
