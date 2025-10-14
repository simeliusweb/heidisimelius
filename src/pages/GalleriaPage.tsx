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
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import PageMeta from "@/components/PageMeta";
import { pageMetadata } from "@/config/metadata";
import ShadowHeading from "@/components/ShadowHeading";
import { MasonryPhotoAlbum, Photo } from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "react-photo-album/masonry.css";
import { breakpointValues, useBreakpoint } from "@/hooks/useBreakpoint";
import { PageImagesContent } from "@/types/content";
import { defaultPageImagesContent } from "@/lib/utils";

export type PhotoSet = Tables<"photo_sets">;
export type Video = Tables<"videos">;

interface PhotoData {
  src: string;
  width: number;
  height: number;
  alt: string;
  photographer_name?: string;
  photographer_url?: string;
}

interface VideoData {
  url: string;
  title?: string;
  description?: string;
  isFeatured?: boolean;
}

// Fetch photo sets from Supabase
const fetchPhotoSets = async (): Promise<PhotoSet[]> => {
  const { data, error } = await supabase
    .from("photo_sets")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

// Fetch videos from Supabase
const fetchVideos = async (): Promise<Video[]> => {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const fetchPageImagesContent = async (): Promise<PageImagesContent> => {
  const { data, error } = await supabase
    .from("page_content")
    .select("content")
    .eq("page_name", "page_images")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No data found, return default content
      return defaultPageImagesContent;
    }
    throw new Error(error.message);
  }

  return data.content as unknown as PageImagesContent;
};

const GalleriaPage = () => {
  // State for the single lightbox
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [activeSlides, setActiveSlides] = useState<Photo[]>([]);
  const isXl = useBreakpoint("xl");
  const isSm = useBreakpoint("sm");

  // Fetch page images content
  const { data: pageImagesContent } = useQuery({
    queryKey: ["page_content", "page_images"],
    queryFn: fetchPageImagesContent,
  });

  // Fetch data from Supabase
  const {
    data: photoSets,
    isLoading: photoSetsLoading,
    error: photoSetsError,
  } = useQuery<PhotoSet[]>({
    queryKey: ["photo_sets"],
    queryFn: fetchPhotoSets,
  });

  const {
    data: videos,
    isLoading: videosLoading,
    error: videosError,
  } = useQuery<Video[]>({ queryKey: ["videos"], queryFn: fetchVideos });

  // Filter photo sets
  const pressKit = photoSets?.find((set) => set.is_press_kit);
  const galleries = useMemo(
    () => photoSets?.filter((set) => !set.is_press_kit) || [],
    [photoSets]
  );

  // Initialize state with a default (e.g., 2 photos)
  const [setsState, setSetsState] = useState(
    galleries.map((set) => ({
      visiblePhotos: (set.photos as unknown as PhotoData[]).slice(0, 2), // Default to 2
      allPhotosShown: (set.photos as unknown as PhotoData[]).length <= 2,
      isLoading: false,
    }))
  );

  // Use an effect to update the state when the breakpoint changes
  useEffect(() => {
    const initialSlice = isXl ? 4 : isSm ? 3 : 2;

    // Use the functional update form: setSetsState(prevState => newState)
    setSetsState((currentSetsState) =>
      galleries.map((set, index) => {
        // Get the corresponding state for the current set from the argument
        const currentSetState = currentSetsState[index];

        return {
          // Only update if all photos aren't already shown
          visiblePhotos: currentSetState?.allPhotosShown
            ? (set.photos as unknown as PhotoData[])
            : (set.photos as unknown as PhotoData[]).slice(0, initialSlice),
          allPhotosShown:
            (set.photos as unknown as PhotoData[]).length <= initialSlice,
          isLoading: false,
        };
      })
    );
  }, [isXl, isSm, galleries]);

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
              visiblePhotos: galleries[setIndex]
                ? (galleries[setIndex].photos as unknown as PhotoData[])
                : [],
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

  // Transform videos data for VideosSection components
  const musicVideos: VideoData[] =
    videos
      ?.filter((video) => video.section === "Musavideot")
      .map((video) => ({
        url: video.url,
        isFeatured: video.is_featured || false,
      })) || [];

  const otherVideos: VideoData[] =
    videos
      ?.filter((video) => video.section === "Muut videot")
      .map((video) => ({
        url: video.url,
        title: video.title || undefined,
        description: video.description || undefined,
      })) || [];

  if (photoSetsLoading || videosLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (photoSetsError || videosError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>
          Virhe haettaessa tietoja: {(photoSetsError || videosError)?.message}
        </p>
      </div>
    );
  }

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
          className="absolute inset-0 bg-cover bg-[40%_top]"
          style={{
            backgroundImage: `url(${
              pageImagesContent?.galleria_hero?.src ||
              "/images/Ma-vastaan-kuvat-Valosanni/Heidi-Simelius-Ma-vastaan-kuvat-Valosanni-8.jpg"
            })`,
          }}
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
        {pressKit && (
          <section className="mb-20 pt-12">
            <ShadowHeading
              title="Pressikuvat"
              shadowColorClass="accent"
              shadowOpacity={100}
            />
            <div className="flex flex-wrap justify-center gap-8 gap-y-16 mb-12">
              {(pressKit.photos as unknown as PhotoData[]).map(
                (photo, index) => (
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
                      {photo.photographer_url ? (
                        <a
                          href={photo.photographer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group hover:underline inline-flex items-center gap-1"
                        >
                          {photo.photographer_name}
                          <ExternalLink className="w-3 h-3 text-accent group-hover:text-foreground transition-colors" />
                        </a>
                      ) : (
                        <span>{photo.photographer_name}</span>
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
                )
              )}
            </div>
            {pressKit.press_kit_zip_url && (
              <div className="flex justify-center pb-8">
                <Button size="lg" asChild className="element-embedded-effect">
                  <a href={pressKit.press_kit_zip_url} download>
                    <Download className="w-5 h-5" />
                    Lataa kaikki pressikuvat (.zip)
                  </a>
                </Button>
              </div>
            )}
          </section>
        )}

        {/* Kuvagalleria Section */}
        {galleries.length > 0 && (
          <section>
            <ShadowHeading
              title="Kuvagalleria"
              shadowColorClass="accent"
              shadowOpacity={100}
            />
            {galleries.map((photoSet, setIndex) => {
              const currentState = setsState[setIndex];
              if (!currentState) return null;

              return (
                <div key={photoSet.id} className="mb-32 xl:mb-48 last:mb-0">
                  <div className="mb-6">
                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-sans font-bold text-foreground pb-2">
                      {photoSet.title}
                    </h3>
                    <div className="text-base md:text-lg italic">
                      Kuvat:{" "}
                      {photoSet.photographer_url ? (
                        <a
                          href={photoSet.photographer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group hover:underline inline-flex items-center gap-1"
                        >
                          {photoSet.photographer_name}
                          <ExternalLink className="w-4 h-4 text-accent group-hover:text-foreground transition-colors" />
                        </a>
                      ) : (
                        <span>{photoSet.photographer_name}</span>
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
        )}

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
      {musicVideos.length > 0 && (
        <VideosSection
          sectionTitle="Musavideot"
          variant="featured"
          videos={musicVideos}
        />
      )}

      {/* Muut videot Section */}
      {otherVideos.length > 0 && (
        <VideosSection
          sectionTitle="Muut videot"
          variant="list"
          videos={otherVideos}
        />
      )}
    </div>
  );
};

export default GalleriaPage;
