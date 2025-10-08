import { Helmet } from "react-helmet-async";
import { HashLink } from "react-router-hash-link";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import VideosSection from "@/components/VideosSection";
import UpcomingGigCard from "@/components/UpcomingGigCard";
import PageMeta from "@/components/PageMeta";
import { pageMetadata } from "@/config/metadata";
import HeroImageAndText from "@/components/HeroImageAndText";
import ShadowHeading from "@/components/ShadowHeading";

const HomePage = () => {
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
            backgroundImage: `url('/noise7colorful.webp'), 
      linear-gradient(
        18deg,
        hsl(234deg 24% 8%) 0%,
        hsl(234deg 23% 8%) 10%,
        hsl(234deg 23% 8%) 20%,
        hsl(239deg 23% 9%) 32%,
        hsl(238deg 23% 12%) 46%,
        hsl(236deg 23% 8%) 62%,
        hsl(234deg 24% 8%) 75%,
        hsl(234deg 24% 11%) 84%,
        hsl(234deg 24% 10%) 89%,
        hsl(234deg 24% 8%) 93%,
        hsl(235deg 23% 9%) 96%,
        hsl(234deg 23% 8%) 98%,
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
              {(() => {
                // Event data with performances
                const upcomingEvents = [
                  // {
                  //   imageUrl: "/images/demo/placeholder-trio.jpg",
                  //   title: "Heidi Simelius Trio Live",
                  //   venue: "G Livelab, Tampere",
                  //   slug: "heidi-simelius-trio-live",
                  //   performances: [{ date: "2025-11-15", time: "20:00" }],
                  // },
                  {
                    imageUrl:
                      "/images/Kinky-Boots-musikaali-Oulun-teatteri-promokuva-1.jpeg",
                    title: "Kinky Boots -musikaali",
                    venue: "Oulun teatteri",
                    slug: "kinkyboots-musikaali",
                    performances: [
                      { date: "2025-10-10", time: "19:00" },
                      { date: "2025-10-11", time: "13:00" },
                      { date: "2025-10-17", time: "19:00" },
                      { date: "2025-10-18", time: "19:00" },
                      { date: "2025-10-23", time: "19:00" },
                      { date: "2025-10-24", time: "19:00" },
                      { date: "2025-10-30", time: "19:00" },
                      { date: "2025-10-31", time: "13:00" },
                      { date: "2025-11-07", time: "19:00" },
                      { date: "2025-11-08", time: "13:00" },
                      { date: "2025-11-26", time: "19:00" },
                      { date: "2025-11-28", time: "19:00" },
                      { date: "2025-11-29", time: "19:00" },
                    ],
                  },
                ];

                // Process data to find soonest upcoming date for each event
                const upcomingGigPreviews = upcomingEvents
                  .map((event) => {
                    const soonestPerformance = event.performances[0];
                    const date = parse(
                      soonestPerformance.date,
                      "yyyy-MM-dd",
                      new Date()
                    );

                    return {
                      imageUrl: event.imageUrl,
                      title: event.title,
                      venue: event.venue,
                      slug: event.slug,
                      nextDate: format(date, "dd.MM.yyyy"),
                      nextTime: soonestPerformance.time,
                      dateObj: date,
                    };
                  })
                  .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
                  .slice(0, 3);

                return upcomingGigPreviews.map((gig, index) => (
                  <HashLink
                    key={index}
                    to={`/keikat#${gig.slug}`}
                    className="basis-full md:basis-[calc(33.333%-1rem)] hover:opacity-80 transition-opacity"
                  >
                    <UpcomingGigCard
                      imageUrl={gig.imageUrl}
                      title={gig.title}
                      nextDate={gig.nextDate}
                      nextTime={gig.nextTime}
                      venue={gig.venue}
                    />
                  </HashLink>
                ));
              })()}
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
