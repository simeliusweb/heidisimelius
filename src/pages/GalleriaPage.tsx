import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  ExternalLink,
  CircleChevronLeft,
  CircleChevronRight,
  X,
} from "lucide-react";
import VideosSection from "@/components/VideosSection";
import { useEffect, useState } from "react";
import PageMeta from "@/components/PageMeta";
import { pageMetadata } from "@/config/metadata";
import ShadowHeading from "@/components/ShadowHeading";
import { MasonryPhotoAlbum, Photo } from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "react-photo-album/masonry.css";
import { breakpointValues, useBreakpoint } from "@/hooks/useBreakpoint";

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
 */
const generatePhotoArray = (
  folderName: string,
  fileNamePrefix: string,
  photographer: string,
  imageCount: number,
  extension: "jpg" | "webp",
  dimensions: readonly { width: number; height: number }[]
): Photo[] => {
  if (dimensions.length !== imageCount) {
    console.warn(
      `Warning for '${folderName}': You have ${imageCount} images but provided ${dimensions.length} dimensions. Please ensure they match.`
    );
  }
  return Array.from({ length: imageCount }, (_, i) => ({
    src: `/images/${folderName}/${fileNamePrefix}-${i + 1}.${extension}`,
    width: dimensions[i]?.width || 1,
    height: dimensions[i]?.height || 1,
    alt: `Heidi Simelius ${folderName.split("-")[0]} -kuvat ${photographer} ${
      i + 1
    }`,
  }));
};

// List the presets (portrait, landscape, etc.) in the correct order for the images.
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

const GalleriaPage = () => {
  // State for the single lightbox
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [activeSlides, setActiveSlides] = useState<Photo[]>([]);
  const isXl = useBreakpoint("xl");
  const isSm = useBreakpoint("sm");

  // Initialize state with a default (e.g., 2 photos)
  const [setsState, setSetsState] = useState(
    allPhotoSets.map((set) => ({
      visiblePhotos: set.photos.slice(0, 2), // Default to 2
      allPhotosShown: set.photos.length <= 2,
      isLoading: false,
    }))
  );

  // Use an effect to update the state when the breakpoint changes
  useEffect(() => {
    const initialSlice = isXl ? 4 : isSm ? 3 : 2;

    // Use the functional update form: setSetsState(prevState => newState)
    setSetsState((currentSetsState) =>
      allPhotoSets.map((set, index) => {
        // Get the corresponding state for the current set from the argument
        const currentSetState = currentSetsState[index];

        return {
          // Only update if all photos aren't already shown
          visiblePhotos: currentSetState.allPhotosShown
            ? set.photos
            : set.photos.slice(0, initialSlice),
          allPhotosShown: set.photos.length <= initialSlice,
          isLoading: false,
        };
      })
    );
  }, [isXl, isSm]);

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
    {
      src: "/images/Simelius%20Heidi.jpg",
      alt: "Heidi Simelius pressikuva 3",
      photographerName: "Valosanni",
      photographerUrl: "https://www.instagram.com/valosanni",
    },
  ];

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

  // Updated click handler to set the active slides for the single lightbox
  const handlePhotoClick = (index: number, photos: Photo[]) => {
    setActiveSlides(photos);
    setLightboxIndex(index);
  };

  return (
    <div
      style={{
        backgroundImage: ` 
        linear-gradient(
      12deg,
      hsl(234deg 24% 8%) 0%,
      hsl(234deg 23% 8%) 10%,
      hsl(234deg 23% 11%) 20%,
      hsl(239deg 23% 9%) 32%,
      hsl(238deg 23% 12%) 46%,
      hsl(236deg 23% 8%) 62%,
      hsl(234deg 24% 8%) 75%,
      hsl(234deg 24% 11%) 84%,
      hsl(234deg 24% 10%) 89%,
      hsl(234deg 24% 8%) 93%,
      hsl(235deg 23% 9%) 96%,
      hsl(235deg 23% 10%) 98%,
      hsl(234deg 23% 8%) 100%
    )`,
        backgroundBlendMode: "overlay",
        imageRendering: "pixelated",
      }}
    >
      <PageMeta
        title={pageMetadata.galleria.title}
        description={pageMetadata.galleria.description}
      />

      {/* Hero Section */}
      <section className="relative h-[80vh] md:h-[90vh] flex items-end justify-center">
        {/* Hero Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-[40%_top] 
               bg-[url('/images/Ma-vastaan-kuvat-Valosanni/Heidi-Simelius-Ma-vastaan-kuvat-Valosanni-8.jpg')]"
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/0 to-background/100" />
        {/* Hero Content */}
        <div className="absolute bottom-[-12px] sm:bottom-[-13px] lg:bottom-[-16px] translate-y-1/2 left-1/2 -translate-x-1/2">
          <h1 className="relative z-1 text-7xl xs:text-[92px] sm:text-[112px] lg:text-[128px] font-playfair font-extrabold text-center text-secondary w-fit mx-auto">
            Galleria
          </h1>
        </div>
        {/* Credits */}
        <p className="absolute bottom-0 right-0 text-muted font-sans italic p-2 bg-border/50 rounded-tl-lg text-[8px] sm:text-[12px] [writing-mode:vertical-rl] sm:[writing-mode:initial]">
          Kuva: Titta Toivanen
        </p>
      </section>

      <main className="container mx-auto px-6 pb-12 pt-12 sm:pt-16 lg:pt-24">
        {/* Pressikuvat Section */}
        <section className="mb-20 pt-12">
          <ShadowHeading
            title="Pressikuvat"
            shadowColorClass="accent"
            shadowOpacity={100}
          />
          <div className="flex flex-wrap justify-center gap-8 gap-y-16 mb-12">
            {pressPhotos.map((photo, index) => (
              <div
                key={index}
                className="w-full md:w-[45%] lg:w-[30%] flex flex-col gap-2"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-lg element-embedded-effect">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm">
                  Kuva:{" "}
                  {photo.photographerUrl ? (
                    <a
                      href={photo.photographerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group hover:underline inline-flex items-center gap-1"
                    >
                      {photo.photographerName}
                      <ExternalLink className="w-3 h-3 text-accent group-hover:text-foreground transition-colors" />
                    </a>
                  ) : (
                    <span>{photo.photographerName}</span>
                  )}
                </p>
                <Button
                  variant="outline"
                  className="w-full element-embedded-effect"
                  asChild
                >
                  <a href={photo.src} download>
                    <Download className="w-4 h-4 text-accent" />
                    Lataa kuva
                  </a>
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-center pb-8">
            <Button size="lg" asChild className="element-embedded-effect">
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
          <ShadowHeading
            title="Kuvagalleria"
            shadowColorClass="accent"
            shadowOpacity={100}
          />
          {allPhotoSets.map((photoSet, setIndex) => {
            const currentState = setsState[setIndex];
            return (
              <div key={photoSet.title} className="mb-32 xl:mb-48 last:mb-0">
                <div className="mb-6">
                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-sans font-bold text-foreground pb-2">
                    {photoSet.title}
                  </h3>
                  <div className="text-base md:text-lg italic">
                    Kuvat:{" "}
                    {photoSet.photographerUrl ? (
                      <a
                        href={photoSet.photographerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group hover:underline inline-flex items-center gap-1"
                      >
                        {photoSet.photographerName}
                        <ExternalLink className="w-4 h-4 text-accent group-hover:text-foreground transition-colors" />
                      </a>
                    ) : (
                      <span>{photoSet.photographerName}</span>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <MasonryPhotoAlbum
                    photos={currentState.visiblePhotos}
                    columns={(containerWidth) => {
                      if (containerWidth < breakpointValues.sm) return 2; // Use 'sm' for mobile
                      if (containerWidth < breakpointValues.lg) return 3; // Use 'lg' for tablet
                      return 4; // Default for larger screens
                    }}
                    onClick={({ index }) =>
                      handlePhotoClick(index, currentState.visiblePhotos)
                    }
                    spacing={16}
                  />
                </div>

                {!currentState.allPhotosShown && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleShowMore(setIndex)}
                      disabled={currentState.isLoading}
                      className="element-embedded-effect"
                    >
                      {currentState.isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-accent" />
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

        {/* Single Lightbox instance for the entire page */}
        <Lightbox
          open={lightboxIndex >= 0}
          index={lightboxIndex}
          close={() => setLightboxIndex(-1)}
          slides={activeSlides}
          render={{
            iconPrev: () => <CircleChevronLeft />,
            iconNext: () => <CircleChevronRight />,
            iconClose: () => <X />,
          }}
        />
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
            url: "https://www.youtube.com/watch?v=3iOHoeFv4ZE",
            title:
              "The Power Of Love – Heidi Simelius | Knockout | The Voice of Finland 2024",
            description:
              "Tässä esitin Knockout-vaiheessa Jennifer Rushin kappaleen The Power Of Love!",
          },
          {
            url: "https://www.youtube.com/watch?v=86wVhe3WLXM",
            title:
              "Proud Mary – Heidi Simelius | Semifinaali | The Voice of Finland 2024",
            description:
              "Esitin suorassa semifinaalissa Tina Turnerin version CCR:n kappaleesta Proud Mary.",
          },
        ]}
      />
    </div>
  );
};

export default GalleriaPage;
