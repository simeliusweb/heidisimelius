import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { ArrowDown, CalendarIcon, ExternalLink, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";
import PageMeta from "@/components/PageMeta";
import { pageMetadata } from "@/config/metadata";
import StructuredData from "@/components/StructuredData";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect } from "react";
import { gsap } from "gsap";
import { toast } from "@/hooks/use-toast";

const bookingFormSchema = z.object({
  name: z.string().min(2, { message: "Nimi on pakollinen" }),
  phone: z.string().min(5, { message: "Puhelinnumero on pakollinen" }),
  email: z.string().email({ message: "Virheellinen sähköpostiosoite" }),
  date: z.date({ required_error: "Päivämäärä on pakollinen" }),
  location: z.string().min(2, { message: "Sijainti on pakollinen" }),
  eventType: z.string().min(2, { message: "Tilaisuus on pakollinen" }),
  message: z.string().min(10, { message: "Viesti on liian lyhyt" }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const BilebandiPage = () => {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      location: "",
      eventType: "",
      message: "",
    },
  });

  const onSubmit = async (data: BookingFormValues) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formType: "booking",
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message,
          date: data.date,
          location: data.location,
          eventType: data.eventType,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send booking request");
      }

      toast({
        title: "Viestisi lähetetty!",
        description: "Olemme yhteydessä sinuun pian.",
      });
      form.reset();
    } catch (error) {
      toast({
        title: "Virhe lähetyksessä",
        description:
          error instanceof Error ? error.message : "Yritä uudelleen myöhemmin.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const mm = gsap.matchMedia();

    // --- MOBILE PARALLAX ANIMATION ---
    mm.add("(max-width: 767px)", () => {
      // Target all mobile image containers
      const mobileImages = gsap.utils.toArray(".mobile-image-mask");

      mobileImages.forEach((mask: HTMLElement) => {
        // Find the actual <img> tag inside the mask
        const image = mask.querySelector("img");

        gsap.fromTo(
          image,
          {
            x: 15, // Start from the right
            y: 25, // Start from the bottom
            scale: 1.15, // Scale up slightly to hide edges
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

  const bilebandiSchema = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "Heidi & The Hot Stuff",
    description:
      "Energistä bilemusiikkia ja hittejä eri vuosikymmeniltä juhliin ja tapahtumiin.",
    url: "https://www.heidisimelius.fi/bilebandi-heidi-and-the-hot-stuff",
    image:
      "https://www.heidisimelius.fi/images/Heidi-and-the-hot-stuff/bilebandi-Heidi-Simelius-hot-stuff.jpg",
    genre: ["Pop", "Cover Band"],
    sameAs: ["https://www.instagram.com/heidiandthehotstuff/"],
    member: [
      { "@type": "Person", name: "Heidi Simelius", roleName: "solisti" },
      { "@type": "Person", name: "Valtteri Gutev", roleName: "sähköpiano" },
      { "@type": "Person", name: "Waltteri Pahlama", roleName: "kitara" },
      { "@type": "Person", name: "Leevi Könttä", roleName: "basso" },
      { "@type": "Person", name: "Richard Söderlund", roleName: "rummut" },
    ],
  };

  return (
    <div
      style={{
        backgroundImage: `
        linear-gradient(
      16deg,
      hsl(234deg 24% 8%) 0%,
      hsl(234deg 23% 8%) 10%,
      hsl(234deg 23% 9%) 20%,
      hsl(239deg 23% 9%) 32%,
      hsl(234deg 23% 8%) 46%,
      hsl(236deg 23% 8%) 62%,
      hsl(238deg 24% 12%) 75%,
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
        title={pageMetadata.bilebandi.title}
        description={pageMetadata.bilebandi.description}
      />
      <StructuredData data={bilebandiSchema} />

      {/* Hero Section */}
      <section className="relative h-[60vh] xxs:h-[70vh] xs:h-[80vh] sm:h-[100vh] xl:h-[110vh] 2xl:h-[120vh] flex items-end justify-center">
        {/* Hero Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-[center_20%] md:bg-top lg:bg-[center_5%] xl:bg-[center_5%]
               md:bg-[url('/images/Heidi-and-the-hot-stuff/bilebandi-Heidi-Simelius-hot-stuff.jpg')] 
               bg-[url('/images/Heidi-and-the-hot-stuff/bilebandi-Heidi-Simelius-hot-stuff-mobile.webp')]"
        />
      </section>

      {/* Band Introduction Section */}
      <section className="max-w-[1000px] mx-auto px-6 pt-8 pb-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-extrabold text-secondary mb-8 mt-4 text-center">
          Bilebändi sinun ja yrityksesi juhliin
        </h1>
        <div className="flex flex-col items-center text-center">
          <p className="max-w-xl md:text-xl leading-relaxed">
            Heidi & the Hot Stuff tarjoaa kuumaa groovea ja hittejä eri
            vuosikymmeniltä nykypäivään. Bändi koostuu huipputason
            ammattimuusikoista jotka takaavat kansainvälisen tason bileet.{" "}
            <br />
            <br />
            Tilaa meidät keikalle nyt!
          </p>
          <div className="max-w-xl w-full flex flex-col md:flex-row items-center md:justify-between mt-4 gap-6 md:gap-4">
            <a
              href="mailto:heidiandthehotstuff@gmail.com"
              className="group inline-flex justify-center items-center gap-2 text-secondary-foreground transition-all duration-300 w-fit"
            >
              <Mail className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="font-semibold group-hover:underline">
                heidiandthehotstuff@gmail.com
              </span>
            </a>
            <Button
              variant="outline"
              className="element-embedded-effect w-fit element-embedded-effect"
              asChild
            >
              <a href="#contact-section">
                Täytä yhteydenottolomake
                <ArrowDown className="w-4 h-4 text-muted-foreground" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Photo and texts */}
      <section>
        {/* Dedicated container for the image mask */}
        <div className="mobile-image-mask overflow-hidden [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]">
          <img
            src={
              "/images/Heidi-and-the-hot-stuff/bilebandi-Pirkanmaa-juhlat-yksityistilaisuus-viihdyttava.webp"
            }
            alt="Heidi & The Hot Stuff"
            className="w-full h-auto shadow-lg origin-top"
          />
        </div>
        <div className="py-8">
          <h2 className="text-2xl xs:text-3xl lg:text-4xl italic font-sans font-extrabold text-foreground p-8 pt-0 text-center">
            Etsitkö energistä bilebändiä juhliisi? 🎶
          </h2>
          <p className="md:text-xl px-8 leading-relaxed max-w-xl mx-auto">
            Groovaavia bileklassikoita soittava Heidi & the Hot Stuff sopii
            häihin, syntymäpäiviin, yritysjuhliin ja kaikkiin muihin tapahtumiin
            Etelä-Suomessa. Katso tästä sudiolive:nä äänitetty 9 biisiä kattava
            hittipotpuri antaa esimakua siitä millaista musiikkia ja meininkiä
            toisimme juhliisi.
            <br />
            <br />
            🎤 Solistina Heidi Simelius, bändin vetäjänä Valtteri Gutev
            (sähköpiano), taustalla ammattimuusikot Waltteri Pahlama (kitara),
            Leevi Könttä (basso) ja Richard Söderlund (rummut) – kaikki sujuu
            helposti ja tilaajan tehtäväksi jää vain nauttia musiikista!
            <br />
            <br />
            Mikään ei kerro bändin energiasta paremmin kuin live-video. Katso
            hittipotpurimme alta ja koe meininki itse!
          </p>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="max-w-6xl mx-auto px-6">
        <figure>
          <div className="max-w-3xl relative w-full aspect-video rounded-lg overflow-hidden element-embedded-effect mx-auto">
            <iframe
              className="absolute inset-0 w-full h-full "
              src="https://www.youtube.com/embed/1IYiuMruQic"
              title="Heidi & The Hot Stuff - Live Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </figure>
      </section>

      <section className="w-full py-4 mt-16">
        {/* Instagram Icon */}
        <a
          href="https://www.instagram.com/heidiandthehotstuff/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-center text-foreground hover:text-secondary-foreground transition-colors w-fit px-4 mx-auto"
          aria-label="Seuraa Heidi & The Hot Stuff Instagramissa"
        >
          <FaInstagram size={36} />
        </a>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="flex element-embedded-effect mx-auto w-fit mt-4"
        >
          <a
            href="https://www.instagram.com/heidiandthehotstuff/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Seuraa meitä Instagramissa
          </a>
        </Button>
      </section>

      {/* Booking & Contact Section */}
      <section
        className="backdrop-blur-sm w-full bg-opacity-50 border-t py-4 mt-16 pb-16"
        style={{
          backgroundImage: `linear-gradient(
      5deg,
      hsl(234deg 24% 8%) 0%,
      hsl(234deg 23% 9%) 10%,
      hsl(234deg 23% 8%) 46%,
      hsl(236deg 24% 11%) 75%,
      hsl(236deg 24% 9%) 84%,
      hsl(234deg 24% 8%) 93%,
      hsl(237deg 23% 10%) 98%,
      hsl(234deg 23% 8%) 100%
    )`,
        }}
        id="contact-section"
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-sans font-extrabold text-foreground mb-4 md:mb-8 mt-4 text-center">
          Buukkaa <br />
          <span className="font-playfair mr-3 italic">
            Heidi <span className="text-[#b0150e]">&</span> The Hot Stuff
          </span>
          <br />
          keikalle!
        </h2>

        <div className="max-w-[300px] sm:max-w-[600px] mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Row 1: Name, Phone and Email (3 columns on sm+) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nimi <span className="text-muted-foreground">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nimi"
                          {...field}
                          className="placeholder:text-accent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Puhelinnumero{" "}
                        <span className="text-muted-foreground">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Puhelinnumero"
                          {...field}
                          className="placeholder:text-accent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sähköposti{" "}
                        <span className="text-muted-foreground">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Sähköposti"
                          {...field}
                          className="placeholder:text-accent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Date, Location, Event Type (3 columns on sm+) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:items-end">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Päivämäärä</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal justify-start hover:bg-transparent hover:border-ring/60 focus:ring-2 focus:ring-ring",
                                !field.value && "text-muted"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "d.M.yyyy")
                              ) : (
                                <span className="text-accent">
                                  Valitse päivämäärä
                                </span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 text-secondary-foreground" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            locale={fi}
                            weekStartsOn={1}
                            fromMonth={new Date()}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sijainti</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sijainti"
                          {...field}
                          className="placeholder:text-accent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tilaisuus</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tilaisuus"
                          {...field}
                          className="placeholder:text-accent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Message field (full width) */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Viesti</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Kerro meille lisää tapahtumastasi..."
                        className="min-h-[120px] placeholder:text-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Honeypot field - invisible to humans */}
              <div className="sr-only">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  name="website"
                  id="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <Button
                type="submit"
                className="w-fit flex mx-auto element-embedded-effect"
                size="lg"
              >
                Lähetä
              </Button>
            </form>
          </Form>
        </div>
      </section>

      {/* Custom Bilebändi Footer */}
      <footer className="w-full">
        {/* Image Section - Full width, no overlays */}
        <div className="w-full aspect-[3000/2197] bg-cover bg-top bg-[url('/images/Heidi-and-the-hot-stuff/Heidi-and-The-Hot-Stuff-bilebandi-Tampere.webp')]" />

        {/* Links Bar with Custom Gradient */}
        <div className="absolute bottom-0 left-0 backdrop-blur-sm w-full bg-opacity-50 border-t border-[#d55b39] pb-4 pt-2 sm:pb-10 sm:pt-4">
          <div className="flex flex-col items-center gap-6">
            {/* Homepage Link */}
            <Link
              to="/"
              className="uppercase tracking-wider text-secondary-foreground transition-colors font-medium text-sm p-2 mb-4"
            >
              • ETUSIVULLE •
            </Link>
          </div>
        </div>
        <p className="flex absolute items-center bottom-0 left-1/2 -translate-x-1/2 text-xs py-4 italic text-secondary-foreground">
          Sivut luonut{" "}
          <a
            href="https://www.linkedin.com/in/janisuoranta/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1 ml-1"
          >
            SuorantaCoding
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </footer>
    </div>
  );
};

export default BilebandiPage;
