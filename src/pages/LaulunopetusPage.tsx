import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/config/metadata";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LaulunopetusContent } from "@/types/content";
import useImagePreload from "@/hooks/useImagePreload";
import useFontLoaded from "@/hooks/useFontLoaded";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";

const fetchLaulunopetusContent =
  async (): Promise<LaulunopetusContent> => {
    const { data, error } = await supabase
      .from("page_content")
      .select("content")
      .eq("page_name", "laulunopetus")
      .single();

    if (error) throw new Error(error.message);

    return data.content as unknown as LaulunopetusContent;
  };

const LaulunopetusPage = () => {
  const {
    data: content,
    isLoading,
    error,
  } = useQuery<LaulunopetusContent>({
    queryKey: ["laulunopetus-content"],
    queryFn: fetchLaulunopetusContent,
  });

  const heroImageLoaded = useImagePreload("/images/Heidi-Simelius-laulunopettaja-tampere.jpg");
  const santoriniLoaded = useFontLoaded("Santorini");

  if (isLoading) {
    return (
      <div style={{
        backgroundImage: `linear-gradient(12deg, hsl(234deg 24% 8%) 0%, hsl(234deg 23% 8%) 10%, hsl(234deg 23% 11%) 20%, hsl(239deg 23% 9%) 32%, hsl(238deg 23% 12%) 46%, hsl(236deg 23% 8%) 62%, hsl(234deg 24% 8%) 75%, hsl(234deg 24% 11%) 84%, hsl(234deg 24% 10%) 89%, hsl(234deg 24% 8%) 93%, hsl(235deg 23% 9%) 96%, hsl(235deg 23% 10%) 98%, hsl(234deg 23% 8%) 100%)`,
        backgroundBlendMode: "overlay",
      }}>
        <section className="relative h-[70vh] md:h-[85vh] flex items-end justify-center bg-background">
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner />
          </div>
          <div className="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2">
            <Skeleton className="h-12 sm:h-16 lg:h-20 w-48 sm:w-72 lg:w-80 rounded-lg" />
          </div>
        </section>
        <div className="container px-6 md:px-8 py-24 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-6 sm:h-8 w-72 sm:w-96 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">
          Virhe sisällön lataamisessa: {error?.message}
        </div>
      </div>
    );
  }

  // Build structured data from dynamic pricing
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Laulunopetus Tampere ja äänivalmennus",
    description:
      "Henkilökohtaista laulunopetusta ja äänenkäytön valmennusta Tampereen keskustassa. Tarjolla kokeilutunteja, yksittäisiä laulutunteja ja sarjakortteja.",
    provider: {
      "@type": "Person",
      name: "Heidi Simelius",
      jobTitle: "Laulaja, lauluntekijä, laulunopettaja ja esiintyjä",
      image:
        "https://www.heidisimelius.fi/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-1.jpg",
      url: "https://www.heidisimelius.fi/bio",
      sameAs: [
        "https://www.instagram.com/Heidisimelius",
        "https://www.facebook.com/HeidiSimelius",
        "https://www.tiktok.com/@heidisimelius",
        "https://open.spotify.com/artist/7wmdyUKDAcJfmWbgsARwl9",
        "https://music.apple.com/gb/artist/heidi-simelius/1486952057",
      ],
    },
    areaServed: {
      "@type": "City",
      name: "Tampere",
    },
    offers: content.pricingTiers.map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      description: `${tier.name} (${tier.duration})`,
      price: tier.price.replace("€", "").replace(",", ".").trim(),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: "https://www.heidisimelius.fi/laulunopetus",
    })),
  };

  const scrollToFooter = () => {
    const footer = document.querySelector("footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Split the first testimonial from the rest (first goes before pricing, rest after background)
  const firstTestimonial = content.testimonials?.[0];
  const remainingTestimonials = content.testimonials?.slice(1) || [];

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
        title={pageMetadata.laulunopetus.title}
        description={pageMetadata.laulunopetus.description}
      />
      <StructuredData data={serviceSchema} />

      {/* Hero Section */}
      <section className="relative h-[70vh] md:h-[85vh] flex items-end justify-center">
        {/* Loading state */}
        {!heroImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <LoadingSpinner />
          </div>
        )}

        {/* Hero Background Image */}
        <div
          className={`absolute inset-0 bg-cover bg-top transition-opacity duration-700 ${heroImageLoaded ? "opacity-100" : "opacity-0"}`}
          style={{
            backgroundImage: `url(/images/Heidi-Simelius-laulunopettaja-tampere.jpg)`,
          }}
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/0 to-background/100" />

        {/* Hero Content */}
        <div className="absolute bottom-[-12px] sm:bottom-[-13px] lg:bottom-[-16px] translate-y-1/2 left-1/2 -translate-x-1/2 w-full px-4 z-20">
          <h1 className="relative text-4xl xs:text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-playfair font-extrabold text-center text-secondary w-fit mx-auto leading-tight">
            Laulunopetus
          </h1>
        </div>

        {/* Credits */}
        <p className="absolute bottom-0 right-0 text-muted font-sans italic p-2 bg-border/50 rounded-tl-lg text-[8px] sm:text-[12px] [writing-mode:vertical-rl] sm:[writing-mode:initial]">
          Kuva: {content.heroImageCredit}
        </p>
      </section>

      {/* Main Content */}
      <div className="main-content pt-16 overflow-hidden">
        {/* Tagline */}
        {santoriniLoaded ? (
          <p className="text-lg xs:text-xl sm:text-2xl md:text-2xl font-santorini text-muted-foreground pt-8 md:pt-12 pb-8 leading-loose text-center italic px-4">
            {content.tagline}
          </p>
        ) : (
          <div className="flex justify-center pt-8 md:pt-12 pb-8 px-4">
            <Skeleton className="h-6 sm:h-8 w-72 sm:w-96" />
          </div>
        )}

        <div className="container px-6 md:px-8 py-8 md:py-12 max-w-4xl mx-auto">
          {/* Intro Section */}
          <section className="mb-16">
            <p className="text-xl md:text-2xl font-source text-primary mb-8 text-center leading-relaxed">
              {content.introLeadParagraph}
            </p>

            <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
              {content.introBodyParagraphs.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}

              <p className="font-semibold">
                Laulutunneilla voimme harjoitella esim.
              </p>
              <ul className="list-disc list-inside space-y-2 text-accent ml-4">
                {content.practiceItems.map((item, i) => (
                  <li key={i}>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mt-12 text-center">
              <Button
                size="lg"
                onClick={scrollToFooter}
                className="element-embedded-effect h-auto text-wrap py-2"
              >
                {content.ctaButtonText}
              </Button>
            </div>
          </section>

          {/* First Testimonial */}
          {firstTestimonial && (
            <section className="mb-16">
              <figure className="relative mx-auto max-w-3xl rounded-lg bg-card p-8">
                <span
                  className="absolute top-0 left-0 -translate-x-4 -translate-y-4 text-9xl font-serif text-accent opacity-20 select-none"
                  aria-hidden="true"
                >
                  &ldquo;
                </span>
                <blockquote className="relative z-10 text-md italic leading-relaxed text-foreground/80">
                  <p>{firstTestimonial.text}</p>
                </blockquote>
                <figcaption className="relative z-10 mt-6 text-right font-semibold text-foreground">
                  – {firstTestimonial.author}
                </figcaption>
              </figure>
            </section>
          )}

          {/* Pricing Section */}
          <section className="mb-16">
            <h2 className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-8 text-center">
              {content.pricingTitle}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {content.pricingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`relative bg-card rounded-lg p-6 ${
                    tier.isFeatured
                      ? "border-2 border-primary/70 hover:border-primary"
                      : "border border-border hover:border-primary/50"
                  } transition-colors`}
                >
                  {tier.isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Suosituin
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {tier.name}
                    </h3>
                    <div className="text-4xl font-bold text-primary mb-1">
                      {tier.price}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {tier.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Background Section */}
          <section className="mb-16">
            <h2 className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-8">
              {content.backgroundTitle}
            </h2>

            <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
              {content.backgroundParagraphs.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}

              <p className="text-primary font-semibold text-xl">
                {content.closingCta}
              </p>
            </div>
          </section>

          {/* Remaining Testimonials */}
          {remainingTestimonials.map((testimonial) => (
            <section key={testimonial.id} className="mb-16">
              <figure className="relative mx-auto max-w-3xl rounded-lg bg-card p-8">
                <span
                  className="absolute top-0 left-0 -translate-x-4 -translate-y-4 text-9xl font-serif text-accent opacity-20 select-none"
                  aria-hidden="true"
                >
                  &ldquo;
                </span>
                <blockquote className="relative z-10 text-md italic leading-relaxed text-foreground/80">
                  <p>{testimonial.text}</p>
                </blockquote>
                <figcaption className="relative z-10 mt-6 text-right font-semibold text-foreground">
                  – {testimonial.author}
                </figcaption>
              </figure>
            </section>
          ))}

          {/* Final CTA */}
          <section className="text-center pb-8">
            <Button
              size="lg"
              onClick={scrollToFooter}
              className="element-embedded-effect"
            >
              {content.finalCtaButtonText}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LaulunopetusPage;
