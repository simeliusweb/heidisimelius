import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/config/metadata";
import {
  BioContent,
  Credit,
  StudioItem,
  PageImagesContent,
} from "@/types/content";
import { defaultPageImagesContent } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const BioPage = () => {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const image1Ref = useRef<HTMLDivElement>(null);
  const image2Ref = useRef<HTMLDivElement>(null);
  const image3Ref = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);
  const teatteriHeadingRef = useRef<HTMLHeadingElement>(null);
  const suomennoksetHeadingRef = useRef<HTMLHeadingElement>(null);

  // Fetch bio content from database
  const fetchBioContent = async (): Promise<BioContent> => {
    const { data, error } = await supabase
      .from("page_content")
      .select("content")
      .eq("page_name", "bio")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No data found, return default content
        return {
          introParagraphs:
            'Heidi Simelius on laulaja, lauluntekijä ja esiintyjä. Hän keikkailee esittäen omaa musiikkiaan ja julkaisi vuonna 2023 ensimmäisen EP:nsä Mä vastaan. Viiden biisin EP sisältää nimikkokappaleen lisäksi mm. kappaleet Missä sä oot? ja Meitä ei ole enää. Heidi on julkaissut aiemmin seitsemän singleä, mm. kappaleet Mun sydän on mun ja Upee. Heidin kappaleet ovat suomenkielisiä sekä vahvasti tekstilähtöisiä ja musiikki on tyyliltään soulahtavaa poppia.\n\nHeidi oli mukana Voice of Finlandin uusimmalla kaudella, jossa hän lauloi tiensä semifinaaliin. Heidi esiintyy vaihtelevasti myös erilaisten kokoonpanojen kanssa ja hänet on voitu nähdä mm. Suomen varusmiessoittokunnan "80\'s kiertueen" ja Gospel Helsinki -kuoron vierailevana solistina sekä keikoilla Pekka Simojoen kanssa.',
          featuredVideoUrl: "https://www.youtube.com/embed/3iOHoeFv4ZE",
          featuredVideoCaption:
            "Tässä esitin Knockout-vaiheessa Jennifer Rushin kappaleen The Power Of Love!",
          quoteText:
            "Olen The Voice of Finland -ohjelman musiikkituottaja ja minulla oli ilo tehdä kaudella 2023-24 Heidi Simeliuksen kanssa useita musiikkinumeroita harjoituksineen ja suunnitteluineen. Tällä yli 6kk periodilla minulle on muodostunut Heidistä hyvin määrätietoinen, eteenpäin pyrkivä ja oman tiensä poikkkeuksellisen hyvin näkevä artisti, jonka musikaalisuus on ilmeistä. Suosittelen ja kannustan lämpimästi Heidiä oman musan tekemiseen ja esilletuomiseen joten tsekatkaa tää tyyppi❤️",
          quoteAuthor: "Lenni-Kalle Taipale",
          concludingParagraphs:
            "Heidi on valmistunut Tampereen Ammattikorkeakoulussa musiikkiteatterin ammattilaiskesi vuonna 2023 sekä Metropolia Ammattikorkeakoulusta muusikoksi esiintyjä-linjalta pääaineenaan pop/jazz-laulu vuonna 2019.\n\nKaudella 2023 – 2024 Heidi nähtiin Lahden Kaupunginteatterin Tootsie-musikaalissa. Kaudella 2022 – 2023 hän ihastutti Porin Teatterin Evita-musikaalissa Rakastajattaren roolissa. Tulevalla kaudella 2025 Heidi nähdään Oulun teatterin Kinky Boots -musikaalissa. Heidi tekee nimeä myös musikaali-suomentajana ja hänen ensimmäinen kokonaan suomentamansa musikaali Laillisesti Blondi nähtiin Sellosalissa keväällä 2022.",
          bioImage1: {
            src: "/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-1.jpg",
            alt: "Heidi Simelius Seuraa singlen kuvauksissa.",
            description: "Heidi Simelius Seuraa singlen kuvauksissa.",
            photographerName: "Titta Toivanen",
          },
          bioImage2: {
            src: "/images/Heidi-Simelius-Kinky-Boots-Oulun-teatteri-musikaali.jpeg",
            alt: "Heidi Simelius Oulun teatterin Kinky Boots -musikaalin promokuvassa.",
            description: 'Musikaalissa "Kinky Boots" Oulun teatterissa.',
            photographerName: "Kati Leinonen",
          },
          bioImage3: {
            src: "/images/Heidi-Simelius-koskettimet-ja-laulu-kuva-AWA.webp",
            alt: "Heidi Simelius Seuraa singlen kuvauksissa.",
            description: "Heidi Simelius Seuraa singlen kuvauksissa.",
            photographerName: "AWA",
          },
          theatreCredits: [],
          translationCredits: [],
          soloAlbums: [],
          singles: [],
          collaborations: [],
        };
      }
      throw new Error(error.message);
    }

    // Sort all credit types by year in descending order before returning
    const content = data.content as unknown as BioContent;
    return {
      ...content,
      theatreCredits:
        content.theatreCredits?.sort((a, b) => b.year - a.year) || [],
      translationCredits:
        content.translationCredits?.sort((a, b) => b.year - a.year) || [],
      soloAlbums: content.soloAlbums?.sort((a, b) => b.year - a.year) || [],
      singles: content.singles?.sort((a, b) => b.year - a.year) || [],
      collaborations:
        content.collaborations?.sort((a, b) => b.year - a.year) || [],
    };
  };

  const {
    data: bioContent,
    isLoading: isBioLoading,
    error: bioError,
  } = useQuery<BioContent>({
    queryKey: ["bio-content"],
    queryFn: fetchBioContent,
  });

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

  // Fetch page images content
  const { data: pageImagesContent } = useQuery({
    queryKey: ["page_content", "page_images"],
    queryFn: fetchPageImagesContent,
  });

  const heidiSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Heidi Simelius",
    jobTitle: "Laulaja, lauluntekijä ja esiintyjä",
    url: "https://www.heidisimelius.fi/bio",
    image:
      "https://www.heidisimelius.fi/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-1.jpg",
    sameAs: [
      "https://www.instagram.com/Heidisimelius",
      "https://www.facebook.com/HeidiSimelius",
      "https://www.tiktok.com/@heidisimelius",
      "https://open.spotify.com/artist/7wmdyUKDAcJfmWbgsARwl9",
      "https://music.apple.com/gb/artist/heidi-simelius/1486952057",
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

  // Handle loading state
  if (isBioLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Ladataan bion sisältöä...</div>
      </div>
    );
  }

  // Handle error state
  if (bioError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">
          Virhe bion sisällön lataamisessa: {bioError.message}
        </div>
      </div>
    );
  }

  // Helper function to render paragraphs from newline-separated text
  const renderParagraphs = (text: string) => {
    return text
      .split("\\n")
      .map((paragraph, index) => <p key={index}>{paragraph}</p>);
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
        title={pageMetadata.bio.title}
        description={pageMetadata.bio.description}
      />
      <StructuredData data={heidiSchema} />

      {/* Hero Section */}
      <section className="relative h-[80vh] md:h-[90vh] flex items-end justify-center">
        {/* Hero Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-top"
          style={{
            backgroundImage: `url(${
              pageImagesContent?.bio_hero?.mobile?.src ||
              "/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-3.jpg"
            })`,
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-top hidden sm:block"
          style={{
            backgroundImage: `url(${
              pageImagesContent?.bio_hero?.desktop?.src ||
              "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-4.jpg"
            })`,
          }}
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/0 to-background/100" />

        {/* Hero Content */}
        <div className="absolute bottom-[-12px] sm:bottom-[-13px] lg:bottom-[-16px] translate-y-1/2 left-1/2 -translate-x-1/2">
          <h1 className="relative z-1 text-8xl sm:text-[112px] lg:text-[128px] font-playfair font-extrabold text-center text-secondary w-fit mx-auto">
            Bio
          </h1>
        </div>

        {/* Credits */}
        <p className="absolute bottom-0 right-0 text-muted font-sans italic p-2 bg-border/50 rounded-tl-lg text-[8px] sm:text-[12px] [writing-mode:vertical-rl] sm:[writing-mode:initial]">
          Kuva: Titta Toivanen
        </p>
      </section>

      {/* Main Content */}
      <div className="main-content-bio-page pt-16 overflow-hidden">
        {/* Tagline */}
        <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-santorini text-muted-foreground pt-8 md:pt-12 pb-8 leading-loose text-center italic">
          Suurta ja sielukasta saundia
        </p>

        <div className="md:container px-0 py-8 md:py-12">
          {/* Two-Column Layout on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-7xl mx-auto">
            {/* Left Column - Text Content */}
            <div ref={textContentRef} className="md:col-span-7 space-y-16">
              {/* Narrative Introduction */}
              <section className="px-8 md:pb-8">
                <div className="prose prose-lg max-w-none text-foreground font-source space-y-6">
                  {bioContent && renderParagraphs(bioContent.introParagraphs)}

                  <figure className="not-prose">
                    <div className="aspect-video w-full">
                      <iframe
                        className="h-full w-full rounded-lg shadow-lg"
                        src={
                          bioContent?.featuredVideoUrl ||
                          "https://www.youtube.com/embed/3iOHoeFv4ZE"
                        }
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <figcaption className="mt-2 text-center text-base italic">
                      {bioContent?.featuredVideoCaption ||
                        "Tässä esitin Knockout-vaiheessa Jennifer Rushin kappaleen The Power Of Love!"}
                    </figcaption>
                  </figure>

                  {/* Place this <figure> element right after the previous </figure> for the video */}
                  <figure className="relative not-prose my-12 sm:my-16 mx-auto max-w-3xl rounded-lg bg-card p-8">
                    <span
                      className="absolute top-0 left-0 -translate-x-4 -translate-y-4 text-9xl font-serif text-accent opacity-20 select-none"
                      aria-hidden="true"
                    >
                      “
                    </span>
                    <blockquote className="relative z-10 text-md italic leading-relaxed text-foreground/80">
                      <p>
                        {bioContent?.quoteText ||
                          "Olen The Voice of Finland -ohjelman musiikkituottaja ja minulla oli ilo tehdä kaudella 2023-24 Heidi Simeliuksen kanssa useita musiikkinumeroita harjoituksineen ja suunnitteluineen. Tällä yli 6kk periodilla minulle on muodostunut Heidistä hyvin määrätietoinen, eteenpäin pyrkivä ja oman tiensä poikkkeuksellisen hyvin näkevä artisti, jonka musikaalisuus on ilmeistä. Suosittelen ja kannustan lämpimästi Heidiä oman musan tekemiseen ja esilletuomiseen joten tsekatkaa tää tyyppi❤️"}
                      </p>
                    </blockquote>
                    <figcaption className="relative z-10 mt-6 text-right font-semibold text-foreground">
                      – {bioContent?.quoteAuthor || "Lenni-Kalle Taipale"}
                    </figcaption>
                  </figure>

                  {bioContent &&
                    renderParagraphs(bioContent.concludingParagraphs)}
                </div>

                {/* CV Download Button */}
                {bioContent?.cvUrl && (
                  <div className="mt-12 w-fit mx-auto">
                    <Button
                      size="lg"
                      asChild
                      className="element-embedded-effect"
                    >
                      <a
                        href={bioContent.cvUrl}
                        download="CV Simelius Heidi.pdf"
                      >
                        Lataa CV (PDF)
                      </a>
                    </Button>
                  </div>
                )}
              </section>

              {/* Mobile Image 1 */}
              <figure className="md:hidden">
                <div className="md:hidden mobile-image-mask [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]">
                  <img
                    src={
                      bioContent?.bioImage1?.src ||
                      "images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-1.jpg"
                    }
                    alt={
                      bioContent?.bioImage1?.alt ||
                      "Heidi Simelius Seuraa singlen kuvauksissa."
                    }
                    className="w-full h-auto sm:w-auto md:max-h-[500px] sm:h-auto sm:mx-auto md:rounded-lg shadow-lg [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]"
                  />
                </div>
                <figcaption className="mt-2 px-8 text-center text-base italic">
                  {bioContent?.bioImage1?.description &&
                  bioContent?.bioImage1?.photographerName
                    ? `${bioContent.bioImage1.description} Kuva: ${bioContent.bioImage1.photographerName}`
                    : `Kuva: ${bioContent.bioImage1.photographerName}`}
                </figcaption>
              </figure>

              {/* Theatre Section */}
              {bioContent?.theatreCredits &&
                bioContent.theatreCredits.length > 0 && (
                  <section className="px-8 md:px-6">
                    <h2
                      ref={teatteriHeadingRef}
                      className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-4 sm:mb-8 pt-4"
                    >
                      Teatteri
                    </h2>
                    <div className="space-y-6 font-source text-foreground">
                      {(() => {
                        // Group credits by year
                        const groupedCredits = bioContent.theatreCredits.reduce(
                          (acc, credit) => {
                            (acc[credit.year] = acc[credit.year] || []).push(
                              credit
                            );
                            return acc;
                          },
                          {} as Record<number, Credit[]>
                        );

                        // Sort years in descending order and render
                        return Object.keys(groupedCredits)
                          .sort((a, b) => Number(b) - Number(a))
                          .map((year) => (
                            <div key={year}>
                              <h3 className="text-xl font-semibold italic">
                                {year}
                              </h3>
                              <ul className="list-disc list-inside space-y-1 text-accent">
                                {groupedCredits[Number(year)].map(
                                  (credit, index) => (
                                    <li key={index} className="list-none">
                                      <span className="text-foreground">
                                        {credit.title}
                                      </span>{" "}
                                      | {credit.details}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          ));
                      })()}
                    </div>
                  </section>
                )}

              {/* Mobile Image 2 */}
              <figure className="md:hidden">
                <div className="overflow-hidden mobile-image-mask [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]">
                  <img
                    src={
                      bioContent?.bioImage2?.src ||
                      "/images/Heidi-Simelius-Kinky-Boots-Oulun-teatteri-musikaali.jpeg"
                    }
                    alt={
                      bioContent?.bioImage2?.alt ||
                      "Heidi Simelius Oulun teatterin Kinky Boots -musikaalin promokuvassa."
                    }
                    className="w-full h-auto sm:w-auto md:max-h-[500px] sm:h-auto sm:mx-auto md:rounded-lg shadow-lg [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]"
                  />
                </div>
                <figcaption className="mt-2 px-8 text-center text-base italic">
                  {bioContent?.bioImage2?.description &&
                  bioContent?.bioImage2?.photographerName
                    ? `${bioContent.bioImage2.description} Kuva: ${bioContent.bioImage2.photographerName}`
                    : `Kuva: ${bioContent.bioImage2.photographerName}`}
                </figcaption>
              </figure>

              {/* Translations Section */}
              {bioContent?.translationCredits &&
                bioContent.translationCredits.length > 0 && (
                  <section className="px-8 md:px-6">
                    <h2
                      ref={suomennoksetHeadingRef}
                      className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-4 sm:mb-8 pt-8"
                    >
                      Suomennokset
                    </h2>
                    <div className="space-y-4 font-source text-foreground">
                      {(() => {
                        // Group credits by year
                        const groupedCredits =
                          bioContent.translationCredits.reduce(
                            (acc, credit) => {
                              (acc[credit.year] = acc[credit.year] || []).push(
                                credit
                              );
                              return acc;
                            },
                            {} as Record<number, Credit[]>
                          );

                        // Sort years in descending order and render
                        return Object.keys(groupedCredits)
                          .sort((a, b) => Number(b) - Number(a))
                          .map((year) => (
                            <div key={year}>
                              <h3 className="text-xl font-semibold italic">
                                {year}
                              </h3>
                              <ul className="list-disc list-inside space-y-1 text-accent">
                                {groupedCredits[Number(year)].map(
                                  (credit, index) => (
                                    <li key={index} className="list-none">
                                      <span className="text-foreground">
                                        {credit.title}
                                      </span>{" "}
                                      | {credit.details}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          ));
                      })()}
                    </div>
                  </section>
                )}

              {/* Studio Section */}
              <section className="px-8 md:px-6">
                <h2 className="text-4xl md:text-5xl font-sans font-extrabold text-secondary-foreground mb-4 sm:mb-8 pt-8">
                  Studio
                </h2>
                <div className="space-y-4 md:space-y-8 font-source text-foreground">
                  {/* Solo Albums */}
                  {bioContent?.soloAlbums &&
                    bioContent.soloAlbums.length > 0 && (
                      <div className="pb-4">
                        <h3 className="text-2xl font-semibold mb-2">
                          Sooloalbumit
                        </h3>
                        <ul className="space-y-2 text-accent">
                          {bioContent.soloAlbums.map((album, index) => (
                            <li
                              key={index}
                              className="border-l-2 border-primary pl-4"
                            >
                              <span className="text-foreground">
                                {album.title}
                                {album.subtitle && ` ${album.subtitle}`}
                              </span>{" "}
                              | {album.artistOrCollaborator} | ({album.year})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Singles */}
                  {bioContent?.singles && bioContent.singles.length > 0 && (
                    <div className="pb-4">
                      <h3 className="text-2xl font-semibold mb-2">Singlet</h3>
                      <ul className="space-y-2 text-accent">
                        {bioContent.singles.map((single, index) => (
                          <li
                            key={index}
                            className="border-l-2 border-primary pl-4"
                          >
                            <span className="text-foreground">
                              {single.title}
                            </span>{" "}
                            | {single.artistOrCollaborator} | ({single.year})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Collaborations */}
                  {bioContent?.collaborations &&
                    bioContent.collaborations.length > 0 && (
                      <div>
                        <h3 className="text-2xl font-semibold mb-2">
                          Yhteistyöt
                        </h3>
                        <ul className="space-y-2 text-accent">
                          {bioContent.collaborations.map(
                            (collaboration, index) => (
                              <li
                                key={index}
                                className="border-l-2 border-primary pl-4"
                              >
                                <span className="text-foreground">
                                  {collaboration.title}
                                </span>{" "}
                                | {collaboration.artistOrCollaborator} | (
                                {collaboration.year})
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              </section>

              {/* Mobile Image 3 */}
              <figure className="md:hidden">
                <div className="md:hidden overflow-hidden mobile-image-mask [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]">
                  <img
                    src={
                      bioContent?.bioImage3?.src ||
                      "/images/Heidi-Simelius-koskettimet-ja-laulu-kuva-AWA.webp"
                    }
                    alt={
                      bioContent?.bioImage3?.alt ||
                      "Heidi Simelius Seuraa singlen kuvauksissa."
                    }
                    className="w-full h-auto sm:w-auto md:max-h-[500px] sm:h-auto sm:mx-auto md:rounded-lg shadow-lg [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]"
                  />
                </div>
                <figcaption className="mt-2 px-8 text-center text-base italic">
                  {bioContent?.bioImage3?.description &&
                  bioContent?.bioImage3?.photographerName
                    ? `${bioContent.bioImage3.description} Kuva: ${bioContent.bioImage3.photographerName}`
                    : `Kuva: ${bioContent.bioImage3.photographerName}`}
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
                      bioContent?.bioImage1?.src ||
                      "images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-1.jpg"
                    }
                    alt={
                      bioContent?.bioImage1?.alt ||
                      "Heidi Simelius Seuraa singlen kuvauksissa."
                    }
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                  <figcaption className="absolute bottom-0 w-full rounded-b-lg bg-gradient-to-t from-black/60 to-transparent p-3 text-center text-base italic text-white">
                    {bioContent?.bioImage1?.description &&
                    bioContent?.bioImage1?.photographerName
                      ? `${bioContent.bioImage1.description} Kuva: ${bioContent.bioImage1.photographerName}`
                      : `Kuva: ${bioContent.bioImage1.photographerName}`}
                  </figcaption>
                </div>
                {/* Image 2 - Initially hidden */}
                <div ref={image2Ref} className="absolute inset-0 opacity-0">
                  <img
                    src={
                      bioContent?.bioImage2?.src ||
                      "/images/Heidi-Simelius-Kinky-Boots-Oulun-teatteri-musikaali.jpeg"
                    }
                    alt={
                      bioContent?.bioImage2?.alt ||
                      "Heidi Simelius Oulun teatterin Kinky Boots -musikaalin promokuvassa."
                    }
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                  <figcaption className="absolute bottom-0 w-full rounded-b-lg bg-gradient-to-t from-black/60 to-transparent p-3 text-center text-base italic text-white">
                    {bioContent?.bioImage2?.description &&
                    bioContent?.bioImage2?.photographerName
                      ? `${bioContent.bioImage2.description} Kuva: ${bioContent.bioImage2.photographerName}`
                      : `Kuva: ${bioContent.bioImage2.photographerName}`}
                  </figcaption>
                </div>
                {/* Image 3 - Initially hidden */}
                <div ref={image3Ref} className="absolute inset-0 opacity-0">
                  <img
                    src={
                      bioContent?.bioImage3?.src ||
                      "/images/Heidi-Simelius-koskettimet-ja-laulu-kuva-AWA.webp"
                    }
                    alt={
                      bioContent?.bioImage3?.alt ||
                      "Heidi Simelius Seuraa singlen kuvauksissa."
                    }
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                  <figcaption className="absolute bottom-0 w-full rounded-b-lg bg-gradient-to-t from-black/60 to-transparent p-3 text-center text-base italic text-white">
                    {bioContent?.bioImage3?.description &&
                    bioContent?.bioImage3?.photographerName
                      ? `${bioContent.bioImage3.description} Kuva: ${bioContent.bioImage3.photographerName}`
                      : `Kuva: ${bioContent.bioImage3.photographerName}`}
                  </figcaption>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BioPage;
