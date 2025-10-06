import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PageMeta from "@/components/PageMeta";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/config/metadata";

gsap.registerPlugin(ScrollTrigger);

const BioPage = () => {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const image1Ref = useRef<HTMLDivElement>(null);
  const image2Ref = useRef<HTMLDivElement>(null);
  const image3Ref = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);
  const teatteriHeadingRef = useRef<HTMLHeadingElement>(null);
  const suomennoksetHeadingRef = useRef<HTMLHeadingElement>(null);

  const heidiSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Heidi Simelius",
    jobTitle: "Laulaja, lauluntekijä ja esiintyjä",
    url: "https://www.heidisimelius.fi/bio",
    image:
      "https://www.heidisimelius.fi/images/Heidi-Simelius-kuvat-Titta-Toivanen-1.jpg",
    sameAs: [
      "https://www.instagram.com/Heidisimelius",
      "https://www.facebook.com/HeidiSimelius",
      "https://vm.tiktok.com/ZMJoaem42",
      "https://open.spotify.com/artist/7wmdyUKDAcJfmWbgsARwl9",
      "https://music.apple.com/gb/artist/heidi-simelius/1486952057",
      "https://soundcloud.com/heidi-simelius",
    ],
  };

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      if (
        !imageContainerRef.current ||
        !image1Ref.current ||
        !image2Ref.current ||
        !image3Ref.current ||
        !textContentRef.current ||
        !teatteriHeadingRef.current ||
        !suomennoksetHeadingRef.current
      )
        return;

      // Pin the image container
      ScrollTrigger.create({
        trigger: textContentRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: imageContainerRef.current,
        pinSpacing: false,
      });

      // Teatteri heading trigger for first transition (image 1 -> 2)
      ScrollTrigger.create({
        trigger: teatteriHeadingRef.current,
        start: "top 128px",
        onEnter: () => {
          gsap.to(image1Ref.current, { opacity: 0, duration: 0.8 });
          gsap.to(image2Ref.current, { opacity: 1, duration: 0.8 });
        },
        onLeaveBack: () => {
          gsap.to(image1Ref.current, { opacity: 1, duration: 0.8 });
          gsap.to(image2Ref.current, { opacity: 0, duration: 0.8 });
        },
      });

      // Suomennokset heading trigger for second transition (image 2 -> 3)
      ScrollTrigger.create({
        trigger: suomennoksetHeadingRef.current,
        start: "top 128px",
        onEnter: () => {
          gsap.to(image2Ref.current, { opacity: 0, duration: 0.8 });
          gsap.to(image3Ref.current, { opacity: 1, duration: 0.8 });
        },
        onLeaveBack: () => {
          gsap.to(image2Ref.current, { opacity: 1, duration: 0.8 });
          gsap.to(image3Ref.current, { opacity: 0, duration: 0.8 });
        },
      });

      // Apply parallax to all images (whichever is visible will show the effect)
      [image1Ref.current, image2Ref.current, image3Ref.current].forEach(
        (image) => {
          if (image) {
            gsap.fromTo(
              image,
              { y: -100 }, // Start 100px higher than the natural position
              {
                y: 100, // Animate to 100px further than natural position
                ease: "none",
                scrollTrigger: {
                  trigger: textContentRef.current,
                  start: "top bottom", // Start when the top of the text enters the bottom of the viewport
                  end: "bottom bottom", // End when the bottom of the text is at the bottom of the viewport
                  scrub: 1,
                },
              }
            );
          }
        }
      );
    });

    // --- NEW MOBILE PARALLAX ANIMATION ---
    mm.add("(max-width: 767px)", () => {
      // Target all mobile image containers
      const mobileImages = gsap.utils.toArray(".mobile-image-mask");

      mobileImages.forEach((mask: HTMLElement) => {
        // Find the actual <img> tag inside the mask
        const image = mask.querySelector("img");

        gsap.fromTo(
          image,
          {
            x: 25, // Start from the right
            y: 35, // Start from the bottom
            scale: 1.2, // Scale up slightly to hide edges
          },
          {
            x: 0, // Animate to its natural horizontal position
            y: 0, // Animate to its natural vertical position
            ease: "none",
            scrollTrigger: {
              trigger: mask,
              start: "top bottom", // Start when the top of the mask hits the bottom of the viewport
              end: "bottom top", // End when the bottom of the mask hits the top of the viewport
              scrub: 1, // Smoothly link animation to scroll
            },
          }
        );
      });
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <>
      <PageMeta
        title={pageMetadata.bio.title}
        description={pageMetadata.bio.description}
      />
      <StructuredData data={heidiSchema} />

      {/* Hero Section */}
      <section className="relative h-[80vh] md:h-[90vh] flex items-end justify-center">
        {/* Hero Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-top 
               bg-[url('/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-3.jpg')] 
               sm:bg-[url('/images/Ma-vastaan-kuvat-Valosanni/Heidi-Simelius-Ma-vastaan-kuvat-Valosanni-8.jpg')]"
        />

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6">
          <h1 className="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 text-6xl sm:text-8xl md:text-[112px] lg:text-[128px] font-playfair font-extrabold text-center text-primary w-fit">
            Bio
          </h1>
        </div>

        {/* Credits */}
        <p className="absolute bottom-0 right-0 text-muted text-[12px] font-sans italic p-2 bg-border/50 rounded-tl-lg">
          Kuva: Valosanni
        </p>
      </section>

      {/* Main Content */}
      <div className="bg-background main-content-bio-page pt-16">
        <div className="md:container px-0 py-16 md:py-24">
          {/* Two-Column Layout on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-7xl mx-auto">
            {/* Left Column - Text Content */}
            <div ref={textContentRef} className="md:col-span-7 space-y-16">
              {/* Narrative Introduction */}
              <section className="px-16 md:px-6 pb-16">
                <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
                  <p>
                    Heidi Simelius on laulaja, lauluntekijä ja esiintyjä. Hän
                    keikkailee esittäen omaa musiikkiaan ja julkaisi vuonna 2023
                    ensimmäisen EP:nsä Mä vastaan. Viiden biisin EP sisältää
                    nimikkokappaleen lisäksi mm. kappaleet Missä sä oot? ja
                    Meitä ei ole enää. Heidi on julkaissut aiemmin seitsemän
                    singleä, mm. kappaleet Mun sydän on mun ja Upee. Heidin
                    kappaleet ovat suomenkielisiä sekä vahvasti tekstilähtöisiä
                    ja musiikki on tyyliltään soulahtavaa poppia.
                  </p>
                  <p>
                    Heidi oli mukana Voice of Finlandin uusimmalla kaudella,
                    jossa hän lauloi tiensä semifinaaliin. Heidi esiintyy
                    vaihtelevasti myös erilaisten kokoonpanojen kanssa ja hänet
                    on voitu nähdä mm. Suomen varusmiessoittokunnan " 80's
                    kiertueen" ja Gospel Helsinki -kuoron vierailevana solistina
                    sekä keikoilla Pekka Simojoen kanssa.
                  </p>

                  <figure className="not-prose my-12">
                    <div className="aspect-video w-full">
                      <iframe
                        className="h-full w-full rounded-lg shadow-lg"
                        src="https://www.youtube.com/embed/3iOHoeFv4ZE?si=Y0dJ3DzDAxWcbrjD"
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <figcaption className="mt-4 text-center text-base italic">
                      Tässä esitin Knockout-vaiheessa Jennifer Rushin kappaleen
                      The Power Of Love!
                    </figcaption>
                  </figure>

                  <p>
                    Heidi on valmistunut Tampereen Ammattikorkeakoulussa
                    musiikkiteatterin ammattilaiskesi vuonna 2023 sekä
                    Metropolia Ammattikorkeakoulusta muusikoksi
                    esiintyjä-linjalta pääaineenaan pop/jazz-laulu vuonna 2019.
                  </p>
                  <p>
                    Kaudella 2023 – 2024 Heidi nähtiin Lahden Kaupunginteatterin
                    Tootsie-musikaalissa. Kaudella 2022 – 2023 hän ihastutti
                    Porin Teatterin Evita-musikaalissa Rakastajattaren roolissa.
                    Tulevalla kaudella 2025 Heidi nähdään Oulun teatterin Kinky
                    Boots -musikaalissa. Heidi tekee nimeä myös
                    musikaali-suomentajana ja hänen ensimmäinen kokonaan
                    suomentamansa musikaali Laillisesti Blondi nähtiin
                    Sellosalissa keväällä 2022.
                  </p>
                </div>

                {/* CV Download Button */}
                <div className="mt-12">
                  <Button size="lg" asChild>
                    <a
                      href="/files/CV%20Simelius%20Heidi.pdf"
                      download="CV Simelius Heidi.pdf"
                    >
                      Lataa CV (PDF)
                    </a>
                  </Button>
                </div>
              </section>

              {/* Mobile Image 1 */}
              <figure className="md:hidden">
                <div className="md:hidden overflow-hidden mobile-image-mask [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]">
                  <img
                    src={
                      "/images/Seuraa-kuvat-Valosanni/Heidi-Simelius-Seuraa-kuvat-Valosanni-2.jpg"
                    }
                    alt="Heidi Simelius Seuraa singlen kuvauksissa."
                    className="w-full h-auto sm:w-auto md:max-h-[500px] sm:h-auto sm:mx-auto md:rounded-lg shadow-lg [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]"
                  />
                </div>
                <figcaption className="mt-4 px-16 text-center text-base italic">
                  Kuva: Valosanni
                </figcaption>
              </figure>

              {/* Theatre Section */}
              <section className="px-16 md:px-6">
                <h2
                  ref={teatteriHeadingRef}
                  className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-8 pt-8"
                >
                  Teatteri
                </h2>
                <div className="space-y-6 font-source text-foreground">
                  <div>
                    <h3 className="text-xl font-semibold italic">2025</h3>
                    <ul className="list-disc list-inside space-y-1 text-accent">
                      <li className="list-none">
                        <span className="text-foreground">Kinky Boots</span> |
                        Oulun teatteri | Ensemble / Nicola Us
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold italic">2023</h3>
                    <ul className="list-disc list-inside space-y-1 text-accent">
                      <li className="list-none">
                        <span className="text-foreground">Tootsie</span> |
                        Lahden Kaupunginteatteri | Ensemble
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold italic">2022</h3>
                    <ul className="list-disc list-inside space-y-1 text-accent">
                      <li className="list-none">
                        <span className="text-foreground">Rakastajatar</span> |
                        Porin Teatteri / Ensemble
                      </li>
                      <li className="list-none">
                        <span className="text-foreground">
                          Songs For A New World
                        </span>{" "}
                        | TAMK | Ensemble
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold italic">2018</h3>
                    <ul className="list-disc list-inside space-y-1 text-accent">
                      <li className="list-none">
                        <span className="text-foreground">
                          Spring Awakening
                        </span>{" "}
                        | Falmouth University, Englanti | Ensemble
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold italic">2016</h3>
                    <ul className="list-disc list-inside space-y-1 text-accent">
                      <li className="list-none">
                        <span className="text-foreground">Suruttomat</span> |
                        Sellosali, Juvenalia Musiikkiteatterilinja | Johanna
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold italic">2014</h3>
                    <ul className="list-disc list-inside space-y-1 text-accent">
                      <li className="list-none">
                        <span className="text-foreground">Evita</span> |
                        Tampereen Työväen Teatteri | Ensemble / Rakastajatar Us
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold italic">2011</h3>
                    <ul className="list-disc list-inside space-y-1 text-accent">
                      <li className="list-none">
                        <span className="text-foreground">
                          Onnen Vuori -musikaali
                        </span>{" "}
                        | Suomen Lähetysseura, kiertueita ympäri Suomea |
                        Angelina
                      </li>
                      <li className="list-none">
                        <span className="text-foreground">
                          Stage – Silmistä Pois -musikaali
                        </span>{" "}
                        | Helsinki Peacock ja Tampere-talo | Ensemble
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Mobile Image 2 */}
              <figure className="md:hidden">
                <div className="overflow-hidden mobile-image-mask [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]">
                  <img
                    src={
                      "/images/Heidi-Simelius-Kinky-Boots-Oulun-teatteri-musikaali.jpeg"
                    }
                    alt="Heidi Simelius Oulun teatterin Kinky Boots -musikaalin promokuvassa."
                    className="w-full h-auto sm:w-auto md:max-h-[500px] sm:h-auto sm:mx-auto md:rounded-lg shadow-lg [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]"
                  />
                </div>
                <figcaption className="mt-4 px-16 text-center text-base italic">
                  Musikaalissa "Kinky Boots" Oulun teatterissa. Kuva: Kati
                  Leinonen
                </figcaption>
              </figure>

              {/* Translations Section */}
              <section className="px-16 md:px-6">
                <h2
                  ref={suomennoksetHeadingRef}
                  className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-8 pt-8"
                >
                  Suomennokset
                </h2>
                <div className="space-y-4 font-source text-foreground">
                  <div>
                    <h3 className="text-xl font-semibold italic">2021</h3>
                    <ul className="list-disc list-inside space-y-1 text-accent">
                      <li className="list-none">
                        <span className="text-foreground">
                          Legally Blonde / Laillisesti Blondi
                        </span>{" "}
                        | Musiikkiopisto Juvenalia
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Discography Section */}
              <section className="px-16 md:px-6">
                <h2 className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-8 pt-8">
                  Studio
                </h2>
                <div className="space-y-8 font-source text-foreground">
                  <div className="pb-4">
                    <h3 className="text-2xl font-semibold mb-2">
                      Sooloalbumit
                    </h3>
                    <ul className="space-y-2 text-accent">
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Mä vastaan EP (singlet Meitä ei ole enää ja Missä sä
                          oot?)
                        </span>{" "}
                        | Heidi Simelius | (2023)
                      </li>
                    </ul>
                  </div>

                  <div className="pb-4">
                    <h3 className="text-2xl font-semibold mb-2">Singlet</h3>
                    <ul className="space-y-2 text-accent">
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Mun sydän on mun
                        </span>{" "}
                        | Heidi Simelius | (2021)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Seuraa</span> | Heidi
                        Simelius | (2021)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Huulet</span> | Heidi
                        Simelius | (2021)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Upee</span> | Heidi
                        Simelius | (2021)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Tähän jää</span> |
                        Heidi Simelius | (2020)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Ikiaikojen taa</span>{" "}
                        | Heidi Simelius | (2019)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Sun sylissä (akustinen)
                        </span>{" "}
                        | Heidi Simelius | (2019)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold mb-2">Yhteistyöt</h3>
                    <ul className="space-y-2 text-accent">
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Rautalanka-autot
                        </span>{" "}
                        | Pekka Simojoki | (2022)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Keskiyön Auringon Maa
                        </span>{" "}
                        | Saila | Yksityinen | (2019)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Häikäisevän kirkas
                        </span>{" "}
                        | Pekka Simojoki | Sisandi | (2018)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Valon samba -lattariylistyslevy
                        </span>{" "}
                        | Yksityinen | (2017)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Avara</span> | Pekka
                        Simojoki | (2016)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Parasta laatua -lastenlevy
                        </span>{" "}
                        | Pekka Simojoki | Rainmaker | (2016)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Kutsu</span> | Poika &
                        Maria | Päivä Osakeyhtiö | (2015)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Maksettu on – Lauluja riihikirkosta
                        </span>{" "}
                        | Rainmaker | (2014)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Ylistys</span> | Pekka
                        Simojoki | Rainmaker | (2012)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Onnen vuori</span> |
                        Pekka Simojoki ja Anna-Mari Kaskinen | Rainmaker |
                        (2011)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">Uniikki</span> |
                        Aikamedia Oy | (2009)
                      </li>
                      <li className="border-l-2 border-primary pl-4">
                        <span className="text-foreground">
                          Tuhatta ja sataa
                        </span>{" "}
                        | Pekka Simojoki | Rainmaker | (2005)
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Mobile Image 3 */}
              <figure className="md:hidden">
                <div className="md:hidden overflow-hidden mobile-image-mask [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]">
                  <img
                    src={
                      "/images/Heidi-Simelius-koskettimet-ja-laulu-kuva-AWA.webp"
                    }
                    alt="Heidi Simelius Seuraa singlen kuvauksissa."
                    className="w-full h-auto sm:w-auto md:max-h-[500px] sm:h-auto sm:mx-auto md:rounded-lg shadow-lg [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]"
                  />
                </div>
                <figcaption className="mt-4 px-16 text-center text-base italic">
                  Kuva: AWA
                </figcaption>
              </figure>
            </div>

            {/* Right Column - Stacked Images with Scrollytelling (Desktop Only) */}
            <div className="hidden md:block md:col-span-5 pt-24">
              <div ref={imageContainerRef} className="relative h-[600px]">
                {/* Image 1 - Initially visible */}
                <div ref={image1Ref} className="absolute inset-0 opacity-100">
                  <img
                    src={
                      "/images/Seuraa-kuvat-Valosanni/Heidi-Simelius-Seuraa-kuvat-Valosanni-2.jpg"
                    }
                    alt="Heidi Simelius Seuraa singlen kuvauksissa."
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                  <figcaption className="absolute bottom-0 w-full rounded-b-lg bg-gradient-to-t from-black/60 to-transparent p-3 text-center text-base italic text-white">
                    Kuva: Valosanni
                  </figcaption>
                </div>
                {/* Image 2 - Initially hidden */}
                <div ref={image2Ref} className="absolute inset-0 opacity-0">
                  <img
                    src={
                      "/images/Heidi-Simelius-Kinky-Boots-Oulun-teatteri-musikaali.jpeg"
                    }
                    alt="Heidi Simelius Mä vastaan EP:n promokuvauksissa."
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                  <figcaption className="absolute bottom-0 w-full rounded-b-lg bg-gradient-to-t from-black/60 to-transparent p-3 text-center text-base italic text-white">
                    Musikaalissa "Kinky Boots" Oulun teatterissa. Kuva: Kati
                    Leinonen
                  </figcaption>
                </div>
                {/* Image 3 - Initially hidden */}
                <div ref={image3Ref} className="absolute inset-0 opacity-0">
                  <img
                    src={
                      "/images/Heidi-Simelius-koskettimet-ja-laulu-kuva-AWA.webp"
                    }
                    alt="Heidi Simelius Seuraa singlen kuvauksissa."
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                  <figcaption className="absolute bottom-0 w-full rounded-b-lg bg-gradient-to-t from-black/60 to-transparent p-3 text-center text-base italic text-white">
                    Kuva: AWA
                  </figcaption>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BioPage;
