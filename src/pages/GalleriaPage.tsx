import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";
import Gallery from "react-photo-gallery";
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
import galleryWidescreen from "@/assets/gallery-widescreen.jpg";
import gallerySquare from "@/assets/gallery-square.jpg";
import galleryPanoramic from "@/assets/gallery-panoramic.jpg";
import galleryPortrait from "@/assets/gallery-portrait.jpg";

const GalleriaPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [allPhotosShown, setAllPhotosShown] = useState(false);

  // Press photos data
  const pressPhotos = [
    {
      src: bioPress1,
      alt: "Heidi Simelius pressikuva 1",
      photographerName: "Kuvaajan Nimi 1",
      photographerUrl: "https://instagram.com/photographer1"
    },
    {
      src: bioPress2,
      alt: "Heidi Simelius pressikuva 2",
      photographerName: "Kuvaajan Nimi 2",
      photographerUrl: "https://instagram.com/photographer2"
    },
    {
      src: bioPress3,
      alt: "Heidi Simelius pressikuva 3",
      photographerName: "Kuvaajan Nimi 3",
      photographerUrl: "https://instagram.com/photographer3"
    },
  ];

  // Photo gallery data with dimensions for masonry layout
  const photoSetData = {
    title: "Ensimmäisen albumin kuvasessio",
    photographerName: "Kuvaajan Nimi",
    photographerUrl: "https://example.com",
    photos: [
      { src: bioPress1, width: 4, height: 5, alt: "Galleriakuva 1" },
      { src: galleryWidescreen, width: 1920, height: 1080, alt: "Lavaesiintyminen" },
      { src: bioPress2, width: 3, height: 4, alt: "Galleriakuva 2" },
      { src: gallerySquare, width: 1024, height: 1024, alt: "Taiteellinen muotokuva" },
      { src: bioPress3, width: 4, height: 3, alt: "Galleriakuva 3" },
      { src: galleryPanoramic, width: 1920, height: 640, alt: "Panoraamanäkymä lavalta" },
      { src: bioPress1, width: 5, height: 4, alt: "Galleriakuva 4" },
      { src: galleryPortrait, width: 1080, height: 1920, alt: "Pystymuotokuva" },
    ]
  };

  // Initialize visible photos with first 3 images
  const [visiblePhotos, setVisiblePhotos] = useState(photoSetData.photos.slice(0, 3));

  const handleImageClick = (_event: React.MouseEvent, { index }: { index: number }) => {
    setSelectedImageIndex(index);
    setDialogOpen(true);
  };

  const handleShowMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVisiblePhotos(photoSetData.photos);
      setIsLoading(false);
      setAllPhotosShown(true);
    }, 1500);
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
            {pressPhotos.map((photo, index) => (
              <div key={index} className="w-full md:w-[45%] lg:w-[30%] flex flex-col gap-4">
                <div className="aspect-[3/4] overflow-hidden rounded-lg">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Kuvat:{" "}
                  <a 
                    href={photo.photographerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group hover:underline inline-flex items-center gap-1"
                  >
                    {photo.photographerName}
                    <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </a>
                </p>
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
            <div>{photoSetData.title}</div>
            <div className="text-base md:text-lg italic text-muted-foreground">
              Kuvat:{" "}
              <a 
                href={photoSetData.photographerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group hover:underline inline-flex items-center gap-1"
              >
                {photoSetData.photographerName}
                <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </h3>

          {/* Masonry Gallery */}
          <div className="mb-8 [&_img]:object-cover">
            <Gallery photos={visiblePhotos} onClick={handleImageClick} />
          </div>

          {/* Show More Button */}
          {!allPhotosShown && photoSetData.photos.length > 3 && (
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleShowMore}
                disabled={isLoading || allPhotosShown}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Ladataan...
                  </>
                ) : (
                  "Näytä lisää"
                )}
              </Button>
            </div>
          )}
        </section>

        {/* Image Dialog with Carousel */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="h-[85vh] w-[calc(100vw-64px)] md:w-[calc(100vw-128px)] block max-w-none">
            <Carousel
              opts={{
                startIndex: selectedImageIndex,
              }}
              className="w-full h-full flex"
            >
              <CarouselContent className="h-full items-center">
                {visiblePhotos.map((image, index) => (
                  <CarouselItem key={index} className="h-full w-full p-0">
                    <div className="flex items-center justify-center h-full w-full">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="object-contain max-h-full max-w-full w-auto h-auto"
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
