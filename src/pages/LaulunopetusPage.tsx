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

const defaultContent: LaulunopetusContent = {
  tagline: "Laulunopettaja Tampereen keskustassa",
  introLeadParagraph:
    "Etsitkö laadukasta laulunopetusta Tampereella? Haluaisitko varmuutta tekniikkaan, tulkita suuria tunteita tai laulaa korkealta ja kovaa?",
  introBodyParagraphs:
    "Tarjoan yksilöllistä pop/jazz-laulunopetusta Tampereen keskustassa rautatieaseman tuntumassa. Erityisosaamistani on rytmimusiikki, musikaalikappaleiden vocal coaching ja esiintymisvalmennus.\n\nLaulunopettajana haluan luoda positiivisen pedagogian keinoin rennon ja luovan oppimisilmapiirin, jossa on helppo heittäytyä ja kokeilla uutta. Tunneillani saa olla oma itsensä ja lähdemme liikkeelle jokaisen oppilaan omista lähtökohdista, vahvuuksista ja tavoitteista.\n\nVoit tulla laulutunneille aloittelijana tai jo pidempään laulua harrastaneena tai ammattilaisena!",
  practiceItems: [
    "laulutekniikkaa ja äänen fysiologiaa",
    "tulkintaa ja tarinankerrontaa (ATS eli Acting Through Song)",
    "pääsykoekappaleita musiikkialan hakuihin",
    "esiintymisvarmuutta karaokelavoille tai keikoille",
  ],
  ctaButtonText:
    "Varaa kokeilutunti ottamalla yhteyttä alla olevan lomakkeen kautta!",
  testimonials: [
    {
      id: "testimonial-1",
      text: "Suosittelen lämpimästi Heidin laulutunteja. Olen ottanut pariin otteeseen 5x laulutuntipaketit, joiden aikana ehtii mainiosti treenata tekniikkaa, itse kappaletta ja vielä pohtia esiintymistäkin. Näihin kaikkiin osa-alueisiin Heidiltä saa rautaisen ammattitaitoista ohjausta/opetusta - tietenkin rennossa ja positiivisessa ilmapiirissä. Heidin laulutunnit sopivat sekä aloittelijoille että kokeneemmillekin laulajille 🩷🥰",
      author: "Annemari",
    },
    {
      id: "testimonial-2",
      text: "Menin Heidille ekalle laulutunnilleni ikinä ja oon maailman onnellisin et löysin hänet! Heidin kanssa oli tosi helppoa olla ihan alusta lähtien ja sain jo ekalla tunnilla tosi paljon vinkkejä laulamiseen ja tekniikkaan. Opin tosi kokonaisvaltasesti ihmisen äänestä, joka konkretisoi paljon niitä kysymysmerkkejä, joita mulla on laulamiseen liittyen ollut. Ostin heti 5 laulutuntia lisää, koska Heidi on super!",
      author: "Aino",
    },
  ],
  pricingTitle: "Hinnat – Laulunopetus Tampere",
  pricingTiers: [
    {
      id: "tier-1",
      name: "Ensimmäinen kokeilutunti",
      price: "40€",
      duration: "45 min",
    },
    {
      id: "tier-2",
      name: "Yksittäiset tunnit",
      price: "60€",
      duration: "45 min",
    },
    {
      id: "tier-3",
      name: "Tuntipaketti",
      price: "280€",
      duration: "5 x 45 min",
      isFeatured: true,
    },
  ],
  backgroundTitle: "Taustani laulunopettajana",
  backgroundParagraphs:
    "Opiskelen tällä hetkellä pop/jazz-laulun pedagogiikkaa Metropolia ammattikorkeakoulussa. Laulunopettajana olen toiminut yksityisesti vuodesta 2016 ja sijaistanut mm. Pirkanmaan musiikkiopistossa, Tampereen laulukoululla sekä Tampereenseudun työväenopistossa.\n\nAiemmat opiskeluvuoteni Metropolia ammattikorkeakoulun muusikko-opinnoissa esiintyjä-linjalta toivat minulle erikoisosaamista pop/jazz-laulun eri tyylisuunissa. Vahvuuksiini kuuluu soul ja rnb musiikin äänenkäyttötavat ja melismat. Minulla on kokemusta myös CVT ja Estill -laulutekniikoista.\n\nOpinnot Tampereen ammattikorkeakoulun Musiikkiteatteriopinnoissa toivat erikoisosaamista musikaalilaulun, eläytymisen ja tarinankerronnan parissa. Kokemusta on karttunut myös työskentelystä musikaaleissa.\n\nOlen keikkaillut laulajana yli kymmenen vuoden ajan niin solistina kuin taustalaulajanakin sekä toiminut myös studiolaulajana. Teen keikkaa ja omaa musiikkia myös artistina. Laulunopettajana ammennan tietotaitoa siis hyvin käytännönläheisesti monenlaisesta työkokemuksesta musiikin kentällä.",
  closingCta:
    "Laulaminen on minulle tapa ilmaista itseäni ja tulkita tunteita. Tule laulutunneille Tampereelle kokemaan laulamisen iloa!",
  finalCtaButtonText: "Ota yhteyttä ja varaa aikasi!",
  heroImageCredit: "Sanni Majamaa",
};

const fetchLaulunopetusContent =
  async (): Promise<LaulunopetusContent> => {
    const { data, error } = await supabase
      .from("page_content")
      .select("content")
      .eq("page_name", "laulunopetus")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return defaultContent;
      }
      throw new Error(error.message);
    }

    return data.content as unknown as LaulunopetusContent;
  };

const LaulunopetusPage = () => {
  const { data: content } = useQuery<LaulunopetusContent>({
    queryKey: ["laulunopetus-content"],
    queryFn: fetchLaulunopetusContent,
  });

  const c = content || defaultContent;

  const heroImageLoaded = useImagePreload("/images/Heidi-Simelius-laulunopettaja-tampere.jpg");
  const santoriniLoaded = useFontLoaded("Santorini");

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
    offers: c.pricingTiers.map((tier) => ({
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
  const firstTestimonial = c.testimonials?.[0];
  const remainingTestimonials = c.testimonials?.slice(1) || [];

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
          Kuva: {c.heroImageCredit}
        </p>
      </section>

      {/* Main Content */}
      <div className="main-content pt-16 overflow-hidden">
        {/* Tagline */}
        {santoriniLoaded ? (
          <p className="text-lg xs:text-xl sm:text-2xl md:text-2xl font-santorini text-muted-foreground pt-8 md:pt-12 pb-8 leading-loose text-center italic px-4">
            {c.tagline}
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
              {c.introLeadParagraph}
            </p>

            <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
              {c.introBodyParagraphs.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}

              <p className="font-semibold">
                Laulutunneilla voimme harjoitella esim.
              </p>
              <ul className="list-disc list-inside space-y-2 text-accent ml-4">
                {c.practiceItems.map((item, i) => (
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
                {c.ctaButtonText}
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
              {c.pricingTitle}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {c.pricingTiers.map((tier) => (
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
              {c.backgroundTitle}
            </h2>

            <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
              {c.backgroundParagraphs.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}

              <p className="text-primary font-semibold text-xl">
                {c.closingCta}
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
              {c.finalCtaButtonText}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LaulunopetusPage;
