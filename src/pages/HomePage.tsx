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
import HeroImageAndText from "@/components/HeroImageAndText";

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
      <div className="relative">
        {/* <div className="relative min-h-screen"> */}
        {/* Art-Directed Background Images */}
        {/* Orginaalit taustat <div
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
        /> */}
        {/* <div className="relative h-[1040px] flex items-center justify-center inset-0 bg-cover bg-center bg-[#000] bg-no-repeat pb-16 pt-8">
          <div className="relative">
            <h2
              className="absolute font-santorini text-[hsl(350.45,76.52%,54.9%)] z-1
              top-[-178px] left-[-100px] 
              text-[118px] 
            "
            >
              Heidi
            </h2>
            <h2
              className="absolute font-santorini text-foreground z-2
              top-[-180px] left-[-102px] 
              text-[118px] 
            "
            >
              Heidi
            </h2>
            <h2
              className="absolute font-santorini text-[hsl(350.45,76.52%,54.9%)] z-1 
              bottom-[-120px] left-[-104px] 
              text-[95px] 
            "
            >
              Simelius
            </h2>
            <h2
              className="absolute font-santorini text-foreground z-2 
              bottom-[-118px] left-[-106px] 
              text-[95px] 
            "
            >
              Simelius
            </h2>
            <img
              src={
                "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2-square.webp"
              }
              alt="Heidi Simelius on laulaja, lauluntekijä ja esiintyjä."
              className="h-auto w-[80vw] max-w-[370px] relative z-3 shadow-lg"
            />
          </div>
          <div className="absolute bottom-0 flex flex-col w-full">
            <BottomBranding />
          </div>
        </div> */}
        <HeroImageAndText />

        {/* Content Sections */}
        <div className="relative z-11 bg-background">
          {/* Intro & Tagline Section */}
          <section className="container mx-auto px-6 pb-16 md:pb-24 text-center">
            {/* Large Stylized Name */}
            <h2 className="text-2xl xs:text-3xl font-santorini text-primary pt-4 pb-8 leading-loose translate-y-[-12px] sm:pt-0 sm:mb-4 z-20 relative">
              Heidi Simelius
            </h2>
            <p className="text-xl md:text-2xl text-foreground font-source mb-8 relative z-19">
              on laulaja, lauluntekijä ja esiintyjä.
            </p>
            <Button asChild variant="outline" size="lg" className="font-medium">
              <a href="/bio">Tutustu Heidiin</a>
            </Button>
          </section>

          {/* Upcoming Gigs Section */}
          <section className="container mx-auto px-6 py-16 md:py-24">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold italic text-primary mb-8 sm:mb-16 text-center">
              Tulevat keikat
            </h2>
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
              <Button asChild size="lg" variant="outline">
                <a href="/keikat">Katso kaikki keikat</a>
              </Button>
            </div>
          </section>

          {/* Spotify Player Section */}
          <section className="container mx-auto px-6 py-16 md:py-24">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-sans font-extrabold text-foreground mb-8 sm:mb-12 text-center">
              Kuuntele Spotifyssa
            </h2>
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
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold italic text-primary mb-8 sm:mb-16 text-center">
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
