import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import bioPress1 from "@/assets/bio-press-1.jpg";
import bioPress2 from "@/assets/bio-press-2.jpg";
import bioPress3 from "@/assets/bio-press-3.jpg";

const GalleriaPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Placeholder images for the photo gallery
  const galleryImages = [
    { src: bioPress1, alt: "Galleriakuva 1" },
    { src: bioPress2, alt: "Galleriakuva 2" },
    { src: bioPress3, alt: "Galleriakuva 3" },
    { src: bioPress1, alt: "Galleriakuva 4" },
    { src: bioPress2, alt: "Galleriakuva 5" },
    { src: bioPress3, alt: "Galleriakuva 6" },
  ];

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setDialogOpen(true);
  };
  return (
    <>
      <Helmet>
        <title>Galleria - Heidi Simelius</title>
        <meta name="description" content="Heidi Simeliuksen valokuvagalleria - pressikuvat ja kuvagalleria" />
      </Helmet>
      
      <main className="container mx-auto px-6 py-16 md:py-24">
        <h1 className="text-6xl md:text-8xl lg:text-10xl font-playfair font-extrabold text-primary mb-12 text-center">
          Galleria
        </h1>

        {/* Pressikuvat Section */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-8">
            Pressikuvat
          </h2>

          {/* Press Photos Grid */}
          <div className="flex flex-wrap justify-center gap-12 md:gap-8 mb-12">
            {[
              { src: bioPress1, alt: "Heidi Simelius pressikuva 1" },
              { src: bioPress2, alt: "Heidi Simelius pressikuva 2" },
              { src: bioPress3, alt: "Heidi Simelius pressikuva 3" },
            ].map((photo, index) => (
              <div key={index} className="w-full md:w-[45%] lg:w-[30%] flex flex-col gap-4">
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

        {/* Kuvagalleria Section */}
        <section>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-8">
            Kuvagalleria
          </h2>

          <h3 className="text-2xl md:text-3xl font-playfair font-bold text-foreground mb-6">
            Ensimmäisen albumin kuvasessio | Kuvat: Kuvaajan Nimi
          </h3>

          {/* Mosaic Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className={`${index === 0 ? 'col-span-2' : ''} aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity`}
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Show More Button */}
          <div className="flex justify-center">
            <Button variant="outline" size="lg">
              Näytä lisää
            </Button>
          </div>
        </section>

        {/* Image Dialog with Carousel */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl">
            <Carousel
              opts={{
                startIndex: selectedImageIndex,
              }}
              className="w-full"
            >
              <CarouselContent>
                {galleryImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-[4/3] overflow-hidden rounded-lg">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
};

export default GalleriaPage;
