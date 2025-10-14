import { Helmet } from "react-helmet-async";
import { HashLink } from "react-router-hash-link";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import VideosSection from "@/components/VideosSection";
import UpcomingGigCard from "@/components/UpcomingGigCard";
import PageMeta from "@/components/PageMeta";
import { pageMetadata } from "@/config/metadata";
import HeroImageAndText from "@/components/HeroImageAndText";
import ShadowHeading from "@/components/ShadowHeading";
import { Gig } from "@/components/admin/GigsManager";
import { Video } from "@/components/admin/videos/VideosManager";

const fetchUpcomingGigs = async (): Promise<Gig[]> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("gigs")
    .select("*")
    .gte("performance_date", now)
    .order("performance_date", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return [];

  // Group gigs by gig_group_id and select the earliest performance for each group
  const groupedGigs = new Map<string, Gig>();

  data.forEach((gig) => {
    const groupKey = gig.gig_group_id || gig.id; // Use gig_group_id or individual gig id

    if (!groupedGigs.has(groupKey)) {
      groupedGigs.set(groupKey, gig);
    } else {
      const existingGig = groupedGigs.get(groupKey)!;
      // Keep the gig with the earlier performance_date
      if (
        new Date(gig.performance_date) < new Date(existingGig.performance_date)
      ) {
        groupedGigs.set(groupKey, gig);
      }
    }
  });

  return Array.from(groupedGigs.values());
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

const HomePage = () => {
  const {
    data: upcomingGigs,
    isLoading,
    error,
  } = useQuery<Gig[]>({
    queryKey: ["upcoming-gigs"],
    queryFn: fetchUpcomingGigs,
  });

  const {
    data: videosData,
    isLoading: videosLoading,
    error: videosError,
  } = useQuery<Video[]>({
    queryKey: ["videos"],
    queryFn: fetchVideos,
  });

  // Filter and map music videos for VideosSection
  const musicVideos =
    videosData
      ?.filter((video) => video.section === "Musavideot")
      .map((video) => ({
        url: video.url,
        title: video.title || undefined,
        description: video.description || undefined,
        isFeatured: video.is_featured || false,
      })) || [];

  return (
    <>
      <PageMeta
        title={pageMetadata.home.title}
        description={pageMetadata.home.description}
      />
      <Helmet>
        {/* Helmet handles the LightWidget script tag correctly */}
        <script src="https://cdn.lightwidget.com/widgets/lightwidget.js"></script>
      </Helmet>
      <div className="relative">
        <HeroImageAndText />

        {/* Content Sections */}
        <div
          className="relative z-11"
          style={{
            backgroundImage: ` 
      linear-gradient(
        18deg,
        hsl(234deg 24% 8%) 0%,
        hsl(234deg 23% 8%) 10%,
        hsl(234deg 23% 8%) 20%,
        hsl(239deg 23% 9%) 32%,
        hsl(238deg 23% 12%) 46%,
        hsl(236deg 23% 8%) 62%,
        hsl(239deg 24% 8%) 75%,
        hsl(234deg 24% 11%) 84%,
        hsl(234deg 24% 8%) 89%,
        hsl(234deg 24% 8%) 93%,
        hsl(235deg 23% 9%) 96%,
        hsl(234deg 23% 8%) 100%
      )
    `,
            backgroundBlendMode: "overlay",
            imageRendering: "pixelated",
          }}
        >
          {/* Intro & Tagline Section */}
          <section className="container mx-auto px-6 pb-16 text-center">
            {/* Large Stylized Name */}
            <h2 className="text-2xl xs:text-3xl font-santorini text-primary pt-8 sm:pt-4 pb-8 leading-loose translate-y-[-12px] sm:mb-4 z-20 relative">
              Heidi Simelius
            </h2>
            <p className="text-xl md:text-2xl text-foreground font-source mb-8 relative z-19">
              laulaja, lauluntekijä ja esiintyjä.
            </p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="relative font-medium custom-lifted-primary heroimg"
            >
              <a href="/bio">Tutustu Heidiin</a>
            </Button>
          </section>

          {/* Upcoming Gigs Section */}
          <section className="container mx-auto px-6 py-16">
            <ShadowHeading
              title="Tulevat keikat"
              shadowColorClass="accent"
              shadowOpacity={100}
            />
            <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto mb-8">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-lg">Ladataan keikkoja...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-lg text-destructive">
                    Virhe haettaessa keikkoja: {error.message}
                  </p>
                </div>
              ) : upcomingGigs && upcomingGigs.length > 0 ? (
                upcomingGigs.slice(0, 3).map((gig) => {
                  const performanceDate = new Date(gig.performance_date);
                  const nextDate = format(performanceDate, "dd.MM.yyyy");
                  const nextTime = format(performanceDate, "HH:mm");

                  // Generate slug from title for navigation
                  const slug = gig.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .trim();

                  return (
                    <HashLink
                      key={gig.id}
                      to={`/keikat#${slug}`}
                      className="basis-full md:basis-[calc(33.333%-1rem)] hover:opacity-80 transition-opacity"
                    >
                      <UpcomingGigCard
                        imageUrl={gig.image_url}
                        title={gig.title}
                        nextDate={nextDate}
                        nextTime={nextTime}
                        venue={gig.venue}
                      />
                    </HashLink>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-lg">Ei tulevia keikkoja tällä hetkellä.</p>
                </div>
              )}
            </div>
            <div className="text-center">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="custom-lifted-primary"
              >
                <a href="/keikat">Katso kaikki keikat</a>
              </Button>
            </div>
          </section>

          {/* Spotify Player Section */}
          <section className="container mx-auto px-6 py-16">
            <ShadowHeading
              title="Kuuntele Spotifyssa"
              shadowColorClass="accent"
              shadowOpacity={100}
            />
            <div className="max-w-3xl mx-auto element-embedded-effect">
              <iframe
                data-testid="embed-iframe"
                style={{ borderRadius: "12px" }}
                src="https://open.spotify.com/embed/artist/7wmdyUKDAcJfmWbgsARwl9?utm_source=generator&theme=0"
                width="100%"
                height="352"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            </div>
          </section>

          {/* Videos Section */}
          {videosLoading ? (
            <section className="container mx-auto px-6 py-16">
              <div className="text-center">
                <p className="text-lg">Ladataan videoita...</p>
              </div>
            </section>
          ) : videosError ? (
            <section className="container mx-auto px-6 py-16">
              <div className="text-center">
                <p className="text-lg text-destructive">
                  Virhe haettaessa videoita: {videosError.message}
                </p>
              </div>
            </section>
          ) : musicVideos.length > 0 ? (
            <VideosSection
              sectionTitle="Musavideot"
              variant="featured"
              videos={musicVideos}
            />
          ) : (
            <section className="container mx-auto px-6 py-16">
              <div className="text-center">
                <p className="text-lg">Ei videoita saatavilla.</p>
              </div>
            </section>
          )}

          {/* Instagram Feed Section */}
          <section className="container mx-auto px-6 py-16">
            <ShadowHeading
              title="Instagram"
              shadowColorClass="accent"
              shadowOpacity={100}
            />
            <div className="max-w-4xl mx-auto mb-8 element-embedded-effect">
              {/* LightWidget embed */}
              <iframe
                src="https://cdn.lightwidget.com/widgets/71dd661fedf55720848701cf279e6d14.html"
                className="lightwidget-widget"
                style={{ width: "100%", border: 0, overflow: "hidden" }}
              ></iframe>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default HomePage;
