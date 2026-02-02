import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/config/metadata";

const LaulunopetusPage = () => {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Laulunopetus ja äänivalmennus",
    description:
      "Henkilökohtaista laulunopetusta ja äänenkäytön valmennusta. Tarjolla kokeilutunteja, yksittäisiä tunteja ja sarjakortteja.",
    provider: {
      "@type": "Person",
      name: "Heidi Simelius",
      jobTitle: "Laulaja, lauluntekijä, esiintyjä ja laulunopettaja",
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
      "@type": "Country",
      name: "Finland",
    },
    offers: [
      {
        "@type": "Offer",
        name: "Ensimmäinen kokeilutunti",
        description:
          "Kertaluontoinen kokeilutunti uusille oppilaille (45 min).",
        price: "40.00",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: "https://www.heidisimelius.fi/laulunopetus",
      },
      {
        "@type": "Offer",
        name: "Yksittäinen laulutunti",
        description: "Yksi henkilökohtainen laulutunti (45 min).",
        price: "60.00",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: "https://www.heidisimelius.fi/laulunopetus",
      },
      {
        "@type": "Offer",
        name: "Tuntipaketti (5x45min)",
        description: "Viiden kerran paketti laulutunteja (yhteensä 225 min).",
        price: "280.00",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: "https://www.heidisimelius.fi/laulunopetus",
      },
    ],
  };

  const scrollToFooter = () => {
    const footer = document.querySelector("footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth" });
    }
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
        title={pageMetadata.laulunopetus.title}
        description={pageMetadata.laulunopetus.description}
      />
      <StructuredData data={serviceSchema} />

      {/* Hero Section */}
      <section className="relative h-[70vh] md:h-[85vh] flex items-end justify-center">
        {/* Hero Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-top"
          style={{
            backgroundImage: `url(/images/Heidi-Simelius-laulunopettaja-tampere.jpg)`,
          }}
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/0 to-background/100" />

        {/* Hero Content */}
        <div className="absolute bottom-[-12px] sm:bottom-[-13px] lg:bottom-[-16px] translate-y-1/2 left-1/2 -translate-x-1/2 w-full px-4">
          <h1 className="relative z-1 text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-playfair font-extrabold text-center text-secondary w-fit mx-auto leading-tight">
            Laulunopetus
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <div className="main-content pt-16 overflow-hidden">
        {/* Tagline */}
        <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-santorini text-muted-foreground pt-8 md:pt-12 pb-8 leading-loose text-center italic px-4">
          Tampereen keskustassa
        </p>

        <div className="container px-6 md:px-8 py-8 md:py-12 max-w-4xl mx-auto">
          {/* Intro Section */}
          <section className="mb-16">
            <p className="text-xl md:text-2xl font-source text-primary mb-8 text-center leading-relaxed">
              Haluaisitko varmuutta laulutekniikkaan ja esiintymiseen?
              Haluisitko tulkita suuria tunteita ja laulaa korkealta kovaa?
            </p>

            <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
              <p>
                Tarjoan yksilöllistä pop/jazz-laulunopetusta Tampereen
                keskustassa rautatieaseman tuntumassa. Erityisosaamistani on
                rytmimusiikki, musikaalikappaleiden vocal coaching ja
                esiintymisvalmennus.
              </p>

              <p>
                Opettajana haluan luoda positiivisen pedagogian keinoin rennon
                ja luovan oppimisilmapiirin, jossa on helppo heittäytyä ja
                kokeilla uutta. Tunneillani saa olla oma itsensä ja lähdemme
                liikkeelle jokaisen oppilaan omista lähtökohdista, vahvuuksista
                ja tavoitteista.
              </p>

              <p>
                Voit tulla tunneilleni aloittelijana tai jo pidempään laulua
                harrastaneena/ammattilaisena!
              </p>

              <p className="font-semibold">Voimme harjoitella esim.</p>
              <ul className="list-disc list-inside space-y-2 text-accent ml-4">
                <li>
                  <span className="text-foreground">
                    tekniikkaa ja laulun fysiologiaa
                  </span>
                </li>
                <li>
                  <span className="text-foreground">
                    tulkintaa ja tarinankerrontaa (ATS eli Acting Through Song)
                  </span>
                </li>
                <li>
                  <span className="text-foreground">pääsykoekappaleita</span>
                </li>
                <li>
                  <span className="text-foreground">
                    esiintymisvarmuutta karaokelavoille
                  </span>
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mt-12 text-center">
              <Button
                size="lg"
                onClick={scrollToFooter}
                className="element-embedded-effect h-auto text-wrap py-2"
              >
                Varaa kokeilutunti ottamalla yhteyttä alla olevan lomakkeen
                kautta!
              </Button>
            </div>
          </section>

          {/* Pricing Section */}
          <section className="mb-16">
            <h2 className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-8 text-center">
              Hinnat
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Trial Lesson */}
              <div className="relative bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-colors">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Ensimmäinen kokeilutunti
                  </h3>
                  <div className="text-4xl font-bold text-primary mb-1">
                    40€
                  </div>
                  <p className="text-muted-foreground text-sm">45 min</p>
                </div>
              </div>

              {/* Single Lesson */}
              <div className="relative bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-colors">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Yksittäiset tunnit
                  </h3>
                  <div className="text-4xl font-bold text-primary mb-1">
                    60€
                  </div>
                  <p className="text-muted-foreground text-sm">45 min</p>
                </div>
              </div>

              {/* Package */}
              <div className="relative bg-card rounded-lg p-6 border-2 border-primary/70 hover:border-primary transition-colors">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Suosituin
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Tuntipaketti
                  </h3>
                  <div className="text-4xl font-bold text-primary mb-1">
                    280€
                  </div>
                  <p className="text-muted-foreground text-sm">5 x 45 min</p>
                </div>
              </div>
            </div>
          </section>

          {/* Background Section */}
          <section className="mb-16">
            <h2 className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-8">
              Taustani laulunopettajana
            </h2>

            <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
              <p>
                Opiskelen tällä hetkellä pop/jazz-laulun pedagogiikkaa
                Metropolia ammattikorkeakoulussa. Lauluopettajana olen toiminut
                yksityisesti vuodesta 2016 ja sijaistanut mm. Pirkanmaan
                musiikkiopistossa, Tampereen laulukoululla sekä Tampereenseudun
                työväenopistossa.
              </p>

              <p>
                Aiemmat opiskeluvuoteni Metropolia ammattikorkeakoulun
                muusikko-opinnoissa esiintyjä-linjalta toivat minulle
                erikoisosaamista pop/jazz-laulun eri tyylisuunissa. Vahvuuksiini
                kuuluu soul ja rnb musiikin äänenkäyttötavat ja melismat.
                Minulla on kokemusta myös CVT ja Estill -laulutekniikoista.
              </p>

              <p>
                Opinnot Tampereen ammattikorkeakoulun Musiikkiteatteriopinnoissa
                toivat erikoisosaamista musikaalilaulun, eläytymisen ja
                tarinankerronnan parissa. Kokemusta on karttunut myös
                työskentelystä musikaaleissa.
              </p>

              <p>
                Olen keikkaillut laulajana yli kymmenen vuoden ajan niin
                solistina kuin taustalaulajanakin sekä toiminut myös
                studiolaulajana. Teen keikkaa ja omaa musiikkia myös artistina.
                Opettajana ammennan tietotaitoa siis hyvin käytännönläheisesti
                monenlaisesta työkokemuksesta musiikin kentällä.
              </p>

              <p className="text-primary font-semibold text-xl">
                Laulaminen on minulle tapa ilmaista itseäni ja tulkita tunteita.
                Tule laulutunneille kokemaan laulamisen iloa!
              </p>
            </div>
          </section>

          {/* Testimonial Quote */}
          <section className="mb-16">
            <figure className="relative mx-auto max-w-3xl rounded-lg bg-card p-8">
              <span
                className="absolute top-0 left-0 -translate-x-4 -translate-y-4 text-9xl font-serif text-accent opacity-20 select-none"
                aria-hidden="true"
              >
                "
              </span>
              <blockquote className="relative z-10 text-md italic leading-relaxed text-foreground/80">
                <p>
                  Menin Heidille ekalle laulutunnilleni ikinä ja oon maailman
                  onnellisin et löysin hänet! Heidin kanssa oli tosi helppoa
                  olla ihan alusta lähtien ja sain jo ekalla tunnilla tosi
                  paljon vinkkejä laulamiseen ja tekniikkaan. Opin tosi
                  kokonaisvaltasesti ihmisen äänestä, joka konkretisoi paljon
                  niitä kysymysmerkkejä, joita mulla on laulamiseen liittyen
                  ollut. Ostin heti 5 laulutuntia lisää, koska Heidi on super!
                </p>
              </blockquote>
              <figcaption className="relative z-10 mt-6 text-right font-semibold text-foreground">
                – Aino
              </figcaption>
            </figure>
          </section>

          {/* Final CTA */}
          <section className="text-center pb-8">
            <Button
              size="lg"
              onClick={scrollToFooter}
              className="element-embedded-effect"
            >
              Ota yhteyttä ja varaa aikasi!
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LaulunopetusPage;
