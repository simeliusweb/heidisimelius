import { Button } from "@/components/ui/button";
import { Download, Loader2, ExternalLink } from "lucide-react";
import VideosSection from "@/components/VideosSection";
import { useState } from "react";
import Gallery, { PhotoProps } from "react-photo-gallery";
import PageMeta from "@/components/PageMeta";
import { pageMetadata } from "@/config/metadata";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// --- Data and Helpers ---

// Dimension presets
const portrait = { width: 1709, height: 2560 };
const landscape = { width: 2560, height: 1709 };
const square = { width: 2560, height: 2560 };
const square1000 = { width: 1000, height: 1000 };
const huuletPortrait = { width: 668, height: 1000 };
const upeeLandscape = { width: 1000, height: 617 };
const tahanJaaPortrait = { width: 1707, height: 2560 };
const tahanJaaLandscape = { width: 2560, height: 1707 };

/**
 * Generates an array of photo objects for a given photo set.
 * It now maps each photo to a specific dimension object from the dimensions array.
 */
const generatePhotoArray = (
  folderName: string,
  fileNamePrefix: string,
  photographer: string,
  imageCount: number,
  extension: "jpg" | "webp",
  dimensions: readonly { width: number; height: number }[]
): PhotoProps[] => {
  // This check helps ensure you have a dimension for every photo.
  if (dimensions.length !== imageCount) {
    console.warn(
      `Warning for '${folderName}': You have ${imageCount} images but provided ${dimensions.length} dimensions. Please ensure they match.`
    );
  }

  return Array.from({ length: imageCount }, (_, i) => ({
    src: `/images/${folderName}/${fileNamePrefix}-${i + 1}.${extension}`,
    width: dimensions[i]?.width || 1, // Fallback to 1x1 if a dimension is missing
    height: dimensions[i]?.height || 1,
    alt: `Heidi Simelius ${folderName.split("-")[0]} -kuvat ${photographer} ${
      i + 1
    }`,
  }));
};

// 2. EDIT THE 'dimensions' ARRAY FOR EACH PHOTO SET
// Simply list the presets (portrait, landscape, etc.) in the correct order for your images.
const photoSetData = [
  {
    title: "Mä vastaan",
    photographerName: "Valosanni",
    photographerUrl: "https://www.instagram.com/valosanni",
    imageCount: 9,
    folderName: "Ma-vastaan-kuvat-Valosanni",
    fileNamePrefix: "Heidi-Simelius-Ma-vastaan-kuvat-Valosanni",
    extension: "jpg",
    dimensions: [
      portrait,
      landscape,
      portrait,
      portrait,
      landscape,
      portrait,
      portrait,
      landscape,
      portrait,
    ],
  },
  {
    title: "Seuraa",
    photographerName: "Valosanni",
    photographerUrl: "https://www.instagram.com/valosanni",
    imageCount: 5,
    folderName: "Seuraa-kuvat-Valosanni",
    fileNamePrefix: "Heidi-Simelius-Seuraa-kuvat-Valosanni",
    extension: "jpg",
    dimensions: [portrait, square, portrait, portrait, landscape],
  },
  {
    title: "Huulet",
    photographerName: "Valosanni",
    photographerUrl: "https://www.instagram.com/valosanni",
    imageCount: 6,
    folderName: "Huulet-kuvat-Valosanni",
    fileNamePrefix: "Heidi-Simelius-Huulet-kuvat-Valosanni",
    extension: "webp",
    dimensions: [
      square1000,
      square1000,
      square1000,
      huuletPortrait,
      huuletPortrait,
      huuletPortrait,
    ],
  },
  {
    title: "Upee",
    photographerName: "Joel Järvinen",
    photographerUrl: "https://www.instagram.com/joeljarvinenphotography",
    imageCount: 5,
    folderName: "Upee-kuvat-Joel-Jarvinen",
    fileNamePrefix: "Heidi-Simelius-Upee-kuvat-Joel-Jarvinen",
    extension: "webp",
    dimensions: [upeeLandscape, square1000, square1000, square1000, square1000],
  },
  {
    title: "Tähän jää",
    photographerName: "Joel Järvinen",
    photographerUrl: "https://www.instagram.com/joeljarvinenphotography",
    imageCount: 6,
    folderName: "Tahan-jaa-kuvat-Joel-Jarvinen",
    fileNamePrefix: "Heidi-Simelius-Tahan-jaa-kuvat-Joel-Jarvinen",
    extension: "webp",
    dimensions: [
      tahanJaaPortrait,
      tahanJaaPortrait,
      tahanJaaLandscape,
      tahanJaaLandscape,
      tahanJaaPortrait,
      tahanJaaPortrait,
    ],
  },
] as const;

const allPhotoSets = photoSetData.map((set) => ({
  ...set,
  photos: generatePhotoArray(
    set.folderName,
    set.fileNamePrefix,
    set.photographerName,
    set.imageCount,
    set.extension,
    set.dimensions
  ),
}));

// --- Component ---

const GalleriaPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [dialogPhotos, setDialogPhotos] = useState<PhotoProps[]>([]);

  // State to manage each photo set's visibility, loading, etc.
  const [setsState, setSetsState] = useState(
    allPhotoSets.map((set) => ({
      visiblePhotos: set.photos.slice(0, 3),
      allPhotosShown: set.photos.length <= 3,
      isLoading: false,
    }))
  );

  // Press photos data
  const pressPhotos = [
    {
      src: "/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-1.jpg",
      alt: "Heidi Simelius pressikuva 1",
      photographerName: "Titta Toivanen",
      photographerUrl: "https://www.instagram.com/tittatoivanen",
    },
    {
      src: "/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-3.jpg",
      alt: "Heidi Simelius pressikuva 2",
      photographerName: "Titta Toivanen",
      photographerUrl: "https://www.instagram.com/tittatoivanen",
    },
  ];

  const handleImageClick = (
    _event: React.MouseEvent,
    { index }: { index: number },
    currentSetVisiblePhotos: PhotoProps[]
  ) => {
    setSelectedImageIndex(index);
    setDialogPhotos(currentSetVisiblePhotos);
    setDialogOpen(true);
  };

  const handleShowMore = (setIndex: number) => {
    setSetsState((currentStates) =>
      currentStates.map((state, index) =>
        index === setIndex ? { ...state, isLoading: true } : state
      )
    );

    setTimeout(() => {
      setSetsState((currentStates) =>
        currentStates.map((state, index) => {
          if (index === setIndex) {
            return {
              ...state,
              visiblePhotos: allPhotoSets[setIndex].photos,
              isLoading: false,
              allPhotosShown: true,
            };
          }
          return state;
        })
      );
    }, 1500);
  };

  return (
    <>
      <PageMeta
        title={pageMetadata.galleria.title}
        description={pageMetadata.galleria.description}
      />

      <main className="container mx-auto px-6 py-16 md:py-24">
        <h1 className="text-6xl md:text-8xl lg:text-10xl font-playfair font-extrabold text-primary mb-12 text-center">
          Galleria
        </h1>

        {/* Pressikuvat Section */}
        <section className="mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-8">
            Pressikuvat
          </h2>

          <div className="flex flex-wrap justify-center gap-12 md:gap-8 mb-12">
            {pressPhotos.map((photo, index) => (
              <div
                key={index}
                className="w-full md:w-[45%] lg:w-[30%] flex flex-col gap-4"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-lg">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Kuva:{" "}
                  {photo.photographerUrl ? (
                    <a
                      href={photo.photographerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group hover:underline inline-flex items-center gap-1"
                    >
                      {photo.photographerName}
                      <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <span>{photo.photographerName}</span>
                  )}
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

          <div className="flex justify-center">
            <Button size="lg" asChild>
              <a
                href="/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-pressikuvat.zip"
                download
              >
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

          {allPhotoSets.map((photoSet, setIndex) => {
            const currentState = setsState[setIndex];
            return (
              <div key={photoSet.title} className="mb-32 xl:mb-48 last:mb-0">
                <h3 className="text-2xl md:text-3xl font-playfair font-bold text-foreground mb-6">
                  <div className="text-primary">{photoSet.title}</div>
                  <div className="text-base md:text-lg italic text-muted-foreground">
                    Kuvat:{" "}
                    {photoSet.photographerUrl ? (
                      <a
                        href={photoSet.photographerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group hover:underline inline-flex items-center gap-1"
                      >
                        {photoSet.photographerName}
                        <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <span>{photoSet.photographerName}</span>
                    )}
                  </div>
                </h3>

                <div className="mb-8 [&_img]:object-cover">
                  <Gallery
                    photos={currentState.visiblePhotos}
                    onClick={(event, data) =>
                      handleImageClick(event, data, currentState.visiblePhotos)
                    }
                  />
                </div>

                {!currentState.allPhotosShown && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleShowMore(setIndex)}
                      disabled={currentState.isLoading}
                    >
                      {currentState.isLoading ? (
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
              </div>
            );
          })}
        </section>

        {/* Image Dialog with Carousel */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="h-[85vh] w-[calc(100vw-64px)] md:w-[calc(100vw-128px)] block max-w-none">
            <Carousel
              opts={{
                startIndex: selectedImageIndex,
                loop: true,
              }}
              className="w-full h-full flex"
            >
              <CarouselContent className="h-full items-center">
                {dialogPhotos.map((image, index) => (
                  <CarouselItem key={index} className="h-full w-full p-0">
                    <div className="flex items-center justify-center h-full w-full rounded-md">
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

      {/* Musavideot Section */}
      <VideosSection
        sectionTitle="Musavideot"
        variant="featured"
        videos={[
          {
            url: "https://www.youtube.com/watch?v=nNooz5tHV6U",
            isFeatured: true,
          },
          { url: "https://www.youtube.com/watch?v=lR4VJkIKmZ0" },
          { url: "https://www.youtube.com/watch?v=m-ZMCIMdZrQ" },
          { url: "https://www.youtube.com/watch?v=xeI9fczPexk" },
          { url: "https://www.youtube.com/watch?v=eqQEVrCPCxQ" },
          { url: "https://www.youtube.com/watch?v=EMVUePUaVAY" },
          { url: "https://www.youtube.com/watch?v=Ikfy983tspw" },
          { url: "https://www.youtube.com/watch?v=wmpajFyxkVE" },
        ]}
      />

      {/* Muut videot Section */}
      <VideosSection
        sectionTitle="Muut videot"
        variant="list"
        videos={[
          {
            url: "https://www.youtube.com/watch?v=EMVUePUaVAY",
            title: "Voice of Finland - Esitys 1",
            description:
              "Heidi Simelius esiintyy Voice of Finland -ohjelmassa. Upea tulkinta suosikkikappaleesta.",
          },
          {
            url: "https://www.youtube.com/watch?v=Ikfy983tspw",
            title: "Voice of Finland - Esitys 2",
            description:
              "Toinen vaikuttava esiintyminen Voice of Finland -lavalla.",
          },
          {
            url: "https://www.youtube.com/watch?v=wmpajFyxkVE",
            title: "Akustinen studio-sessio",
            description:
              "Intiimi akustinen versio suosikkikappaleesta studiossa.",
          },
        ]}
      />
    </>
  );
};

export default GalleriaPage;
