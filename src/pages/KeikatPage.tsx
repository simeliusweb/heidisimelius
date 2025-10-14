import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import EventGroup from "@/components/EventGroup";
import PastGigCard from "@/components/PastGigCard";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/config/metadata";
import { FaInstagram } from "react-icons/fa";
import ShadowHeading from "@/components/ShadowHeading";
import { PageImagesContent } from "@/types/content";
import { defaultPageImagesContent } from "@/lib/utils";
import { Gig } from "@/components/admin/GigsManager";

interface MusicEvent {
  "@context": string;
  "@type": string;
  eventStatus: string;
  name: string;
  startDate: string;
  location: {
    "@type": string;
    name: string;
    address: {
      "@type": string;
      addressLocality: string;
      addressCountry: string;
    };
  };
  image: string;
  description: string;
  performer: {
    "@type": string;
    name: string;
  };
  offers?: {
    "@type": string;
    url: string;
    availability: string;
  };
  organizer?: {
    "@type": string;
    name: string;
    url?: string;
  };
}

const fetchPastGigs = async (): Promise<Gig[]> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("gigs")
    .select("*")
    .lt("performance_date", now)
    .order("performance_date", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data;
};

const fetchUpcomingGigsForKeikat = async (): Promise<Gig[]> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("gigs")
    .select("*")
    .gte("performance_date", now)
    .order("performance_date", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return [];

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

const KeikatPage = () => {
  const [visibleCount, setVisibleCount] = useState(2);

  // Fetch page images content
  const { data: pageImagesContent } = useQuery({
    queryKey: ["page_content", "page_images"],
    queryFn: fetchPageImagesContent,
  });

  // Fetch past gigs
  const {
    data: pastGigsData,
    isLoading: isLoadingPastGigs,
    error: pastGigsError,
  } = useQuery<Gig[]>({
    queryKey: ["past-gigs"],
    queryFn: fetchPastGigs,
  });

  // Fetch upcoming gigs
  const {
    data: upcomingGigsData,
    isLoading: isLoadingUpcomingGigs,
    error: upcomingGigsError,
  } = useQuery<Gig[]>({
    queryKey: ["upcoming-gigs-keikat"],
    queryFn: fetchUpcomingGigsForKeikat,
  });

  // Process and group upcoming gigs
  const groupedUpcomingGigs = upcomingGigsData
    ? (() => {
        const groupedGigs = new Map<
          string,
          { gig: Gig; performances: { date: string; time: string }[] }
        >();

        upcomingGigsData.forEach((gig) => {
          const groupKey = gig.gig_group_id || gig.id;

          if (!groupedGigs.has(groupKey)) {
            // Create new group with this gig as the main event
            const performanceDate = new Date(gig.performance_date);
            groupedGigs.set(groupKey, {
              gig,
              performances: [
                {
                  date: format(performanceDate, "yyyy-MM-dd"),
                  time: format(performanceDate, "HH:mm"),
                },
              ],
            });
          } else {
            // Add performance to existing group
            const existingGroup = groupedGigs.get(groupKey)!;
            const performanceDate = new Date(gig.performance_date);
            existingGroup.performances.push({
              date: format(performanceDate, "yyyy-MM-dd"),
              time: format(performanceDate, "HH:mm"),
            });
          }
        });

        // Sort performances within each group by date
        groupedGigs.forEach((group) => {
          group.performances.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        });

        return Array.from(groupedGigs.values());
      })()
    : [];

  // Filter into music and theatre events
  const musicEventGroups = groupedUpcomingGigs.filter(
    (group) => group.gig.gig_type === "Musiikki"
  );
  const theatreEventGroups = groupedUpcomingGigs.filter(
    (group) => group.gig.gig_type === "Teatteri"
  );

  // Generate MusicEvent structured data for all upcoming gigs
  const musicEventsSchema = upcomingGigsData
    ? upcomingGigsData.map((gig) => {
        const performanceDate = new Date(gig.performance_date);
        const isoDate = performanceDate.toISOString();

        const event: MusicEvent = {
          "@context": "https://schema.org",
          "@type": "MusicEvent",
          eventStatus: "https://schema.org/EventScheduled",
          name: gig.title,
          startDate: isoDate,
          location: {
            "@type": "Place",
            name: gig.venue,
            address: {
              "@type": "PostalAddress",
              addressLocality: gig.address_locality,
              addressCountry: gig.address_country,
            },
          },
          image: gig.image_url,
          description: gig.description,
          performer: {
            "@type": "Person",
            name: "Heidi Simelius",
          },
        };

        // Add conditional offers field
        if (gig.tickets_url) {
          event.offers = {
            "@type": "Offer",
            url: gig.tickets_url,
            availability: "https://schema.org/InStock",
          };
        }

        // Add conditional organizer field
        if (gig.organizer_name) {
          event.organizer = {
            "@type": "Organization",
            name: gig.organizer_name,
            ...(gig.organizer_url && { url: gig.organizer_url }),
          };
        }

        return event;
      })
    : [];

  return (
    <div
      style={{
        backgroundImage: ` 
        linear-gradient(
      24deg,
      hsl(234deg 24% 8%) 0%,
      hsl(234deg 23% 8%) 10%,
      hsl(234deg 23% 9%) 20%,
      hsl(239deg 23% 9%) 32%,
      hsl(238deg 23% 12%) 46%,
      hsl(236deg 23% 8%) 62%,
      hsl(234deg 24% 8%) 75%,
      hsl(238deg 24% 9%) 84%,
      hsl(230deg 24% 8%) 89%,
      hsl(234deg 24% 8%) 93%,
      hsl(239deg 23% 12%) 96%,
      hsl(237deg 23% 10%) 98%,
      hsl(234deg 23% 8%) 100%
    )`,
        backgroundBlendMode: "overlay",
        imageRendering: "pixelated",
      }}
    >
      <PageMeta
        title={pageMetadata.keikat.title}
        description={pageMetadata.keikat.description}
      />
      <StructuredData data={musicEventsSchema} />

      {/* Page Header with Background Image */}
      <section className="relative z-1 w-full h-[50vh] sm:h-[60vh] md:h-[90vh] flex items-end justify-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-bottom bg-no-repeat"
          style={{
            backgroundImage: `url(${
              pageImagesContent?.keikat_hero?.src ||
              "/images/2025-glow-festival-favourites-22.8.2025-ville-huuri-16.webp"
            })`,
          }}
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/0 to-background/100" />

        {/* Page Title */}
        <div className="absolute bottom-[-12px] sm:bottom-[-13px] lg:bottom-[-16px] translate-y-1/2 left-1/2 -translate-x-1/2">
          <h1 className="relative z-1 text-7xl sm:text-[112px] lg:text-[128px] font-playfair font-extrabold text-center text-secondary w-fit mx-auto">
            Keikat
          </h1>
        </div>

        {/* Credits */}
        <p className="absolute bottom-0 right-0 text-muted font-sans italic p-2 bg-border/50 rounded-tl-lg rounded-bl-lg text-[8px] sm:text-[12px] [writing-mode:vertical-rl] sm:[writing-mode:initial]">
          Kuva:{" "}
          {pageImagesContent?.keikat_hero?.photographer_name || "Ville Huuri"}
        </p>
      </section>

      {/* Musiikkikeikat Section */}
      <section className="container mx-auto px-4 pt-24 pb-12 sm:pt-32">
        <ShadowHeading
          title="Musiikkikeikat"
          shadowColorClass="accent"
          shadowOpacity={100}
        />
        {isLoadingUpcomingGigs ? (
          <div className="text-center py-8">
            <p className="text-lg">Ladataan musiikkikeikkoja...</p>
          </div>
        ) : upcomingGigsError ? (
          <div className="text-center py-8">
            <p className="text-lg text-destructive">
              Virhe haettaessa musiikkikeikkoja: {upcomingGigsError.message}
            </p>
          </div>
        ) : musicEventGroups.length > 0 ? (
          <div className="space-y-8">
            {musicEventGroups.map((group) => (
              <EventGroup
                key={group.gig.id}
                imageUrl={group.gig.image_url}
                title={group.gig.title}
                venue={group.gig.venue}
                description={group.gig.description}
                eventPageUrl={group.gig.event_page_url}
                ticketsUrl={group.gig.tickets_url}
                performances={group.performances}
                id={group.gig.title
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, " ")
                  .replace(/\s+/g, "-")
                  .trim()}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto px-4">
            <p className="max-w-[290px] text-sm text-center mx-auto text-foreground">
              Tulevia musiikkikeikkoja ei ole juuri nyt kalenterissa. Seuraa
              minua Instagramissa, niin pysyt parhaiten ajan tasalla tulevista
              esiintymisistä!
            </p>
            <a
              href="https://www.instagram.com/Heidisimelius/"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 flex justify-center items-center gap-3 text-secondary-foreground transition-all duration-300 w-fit mx-auto"
              aria-label="Seuraa Heidi Simeliusta Instagramissa"
            >
              <FaInstagram className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-lg font-semibold group-hover:underline">
                @heidisimelius
              </span>
            </a>
          </div>
        )}
      </section>

      {/* Teatteriesitykset Section */}
      <section className="container mx-auto px-4 py-12">
        <ShadowHeading
          title="Teatteriesitykset"
          shadowColorClass="accent"
          shadowOpacity={100}
        />
        {isLoadingUpcomingGigs ? (
          <div className="text-center py-8">
            <p className="text-lg">Ladataan teatteriesityksiä...</p>
          </div>
        ) : upcomingGigsError ? (
          <div className="text-center py-8">
            <p className="text-lg text-destructive">
              Virhe haettaessa teatteriesityksiä: {upcomingGigsError.message}
            </p>
          </div>
        ) : theatreEventGroups.length > 0 ? (
          <div className="space-y-8">
            {theatreEventGroups.map((group) => (
              <EventGroup
                key={group.gig.id}
                imageUrl={group.gig.image_url}
                title={group.gig.title}
                venue={group.gig.venue}
                description={group.gig.description}
                eventPageUrl={group.gig.event_page_url}
                ticketsUrl={group.gig.tickets_url}
                performances={group.performances}
                id={group.gig.title
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, " ")
                  .replace(/\s+/g, "-")
                  .trim()}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto px-4">
            <p className="max-w-[290px] text-sm text-center mx-auto text-foreground">
              Tulevia teatteriesityksiä ei ole juuri nyt kalenterissa. Seuraa
              minua Instagramissa, niin pysyt parhaiten ajan tasalla tulevista
              esiintymisistä!
            </p>
            <a
              href="https://www.instagram.com/Heidisimelius/"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 flex justify-center items-center gap-3 text-secondary-foreground transition-all duration-300 w-fit mx-auto"
              aria-label="Seuraa Heidi Simeliusta Instagramissa"
            >
              <FaInstagram className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-lg font-semibold group-hover:underline">
                @heidisimelius
              </span>
            </a>
          </div>
        )}
      </section>

      {/* Past Gigs Section */}
      <section className="container mx-auto px-4 py-12 pb-24">
        <ShadowHeading
          title="Menneet keikat"
          shadowColorClass="accent"
          shadowOpacity={100}
        />

        <div className="space-y-8">
          {isLoadingPastGigs ? (
            <div className="text-center py-8">
              <p className="text-lg">Ladataan menneitä keikkoja...</p>
            </div>
          ) : pastGigsError ? (
            <div className="text-center py-8">
              <p className="text-lg text-destructive">
                Virhe haettaessa menneitä keikkoja: {pastGigsError.message}
              </p>
            </div>
          ) : pastGigsData && pastGigsData.length > 0 ? (
            <>
              <div className="space-y-4 max-w-[800px] mx-auto">
                {pastGigsData.slice(0, visibleCount).map((gig) => (
                  <PastGigCard
                    key={gig.id}
                    imageUrl={gig.image_url}
                    title={gig.title}
                    venue={gig.venue}
                    gigType={gig.gig_type}
                    date={format(new Date(gig.performance_date), "d.M.yyyy")}
                  />
                ))}
              </div>

              <div className="flex justify-center">
                {visibleCount < pastGigsData.length ? (
                  <Button
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    size="lg"
                    variant="outline"
                    className="element-embedded-effect"
                  >
                    Näytä lisää
                  </Button>
                ) : (
                  <p className="text-lg text-foreground font-source-sans">
                    Tässä kaikki!
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg">Ei menneitä keikkoja löytynyt.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default KeikatPage;
