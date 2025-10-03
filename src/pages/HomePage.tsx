import { Helmet } from "react-helmet-async";
import { HashLink } from "react-router-hash-link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import BottomBranding from "@/components/BottomBranding";
import VideosSection from "@/components/VideosSection";
import UpcomingGigCard from "@/components/UpcomingGigCard";
import PageMeta from "@/components/PageMeta";
import { pageMetadata } from "@/config/metadata";

gsap.registerPlugin(ScrollTrigger);

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
      <div className="relative min-h-screen">
        {/* Art-Directed Background Images */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat md:hidden"
          style={{
            backgroundImage: `url(/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-1.jpg)`,
          }}
        />
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
          style={{
            backgroundImage: `url(/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2.jpg)`,
          }}
        />

        {/* Content Container */}
        <div className="relative overflow-visible z-10 min-h-screen flex flex-col">
          {/* Bottom Branding Overlay */}
          <BottomBranding />
        </div>

        {/* Content Sections */}
        <div className="relative z-11 bg-background">
          {/* Intro & Tagline Section */}
          <section className="container mx-auto px-6 pb-16 md:pb-24 text-center">
            {/* Large Stylized Name */}
            <h2 className="text-4xl md:text-5xl font-santorini text-primary mb-20 z-10 relative">
              Heidi Simelius
            </h2>
            <p className="text-xl md:text-2xl text-foreground font-source mb-8">
              on laulaja, lauluntekijä ja esiintyjä.
            </p>
            <Button asChild size="lg" className="font-medium">
              <a href="/bio">Tutustu Heidiin</a>
            </Button>
          </section>

          {/* Upcoming Gigs Section */}
          <section className="container mx-auto px-6 py-16 md:py-24">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold italic text-primary mb-8 text-center">
              Tulevat keikat
            </h2>
            <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto mb-8">
              {(() => {
                // Event data with performances
                const upcomingEvents = [
                  {
                    imageUrl: "/images/demo/placeholder-trio.jpg",
                    title: "Heidi Simelius Trio Live",
                    venue: "G Livelab, Tampere",
                    slug: "heidi-simelius-trio-live",
                    performances: [{ date: "2025-11-15", time: "20:00" }],
                  },
                  {
                    imageUrl: "/images/demo/placeholder-tootsie.jpg",
                    title: "Tootsie-musikaali",
                    venue: "Lahden Kaupunginteatteri",
                    slug: "tootsie-musikaali",
                    performances: [
                      { date: "2025-10-24", time: "19:00" },
                      { date: "2025-10-25", time: "13:00" },
                      { date: "2025-11-01", time: "20:00" },
                      { date: "2025-11-17", time: "19:30" },
                      { date: "2025-11-28", time: "18:30" },
                      { date: "2025-12-06", time: "17:00" },
                      { date: "2025-12-18", time: "20:30" },
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
              <Button asChild size="lg" variant="outline">
                <a href="/keikat">Katso kaikki keikat</a>
              </Button>
            </div>
          </section>

          {/* Spotify Player Section */}
          <section className="container mx-auto px-6 py-16 md:py-24">
            <div className="max-w-3xl mx-auto">
              <iframe
                data-testid="embed-iframe"
                style={{ borderRadius: "12px" }}
                src="https://open.spotify.com/embed/artist/7wmdyUKDAcJfmWbgsARwl9?utm_source=generator&theme=0"
                width="100%"
                height="352"
                frameBorder="0"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            </div>
          </section>

          {/* Videos Section */}
          <VideosSection
            sectionTitle="Videot"
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
          <section className="container mx-auto px-6 py-16 md:py-24">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold italic text-primary mb-8 text-center">
              Instagram
            </h2>
            <div className="max-w-4xl mx-auto mb-8">
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
