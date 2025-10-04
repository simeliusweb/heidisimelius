import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { CalendarIcon, ExternalLink, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";
import PageMeta from "@/components/PageMeta";
import { pageMetadata } from "@/config/metadata";
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

  const onSubmit = (data: BookingFormValues) => {
    // Form submission logic will be implemented later
    console.log(data);
  };
  return (
    <>
      <PageMeta
        title={pageMetadata.bilebandi.title}
        description={pageMetadata.bilebandi.description}
      />

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
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-playfair italic font-extrabold text-foreground mb-8 text-center">
          Bilebändi sinun ja yrityksesi juhliin
        </h1>
        <div className="text-center">
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Heidi & the Hot Stuff tarjoaa kuumaa groovea ja hittejä eri
            vuosikymmeniltä nykypäivään. Bändi koostuu huipputason
            ammattimuusikoista jotka takaavat kansainvälisen tason bileet.{" "}
            <br />
            Tilaa meidät keikalle nyt!
          </p>
          <a
            href="mailto:heidiandthehotstuff@gmail.com"
            className="group mt-6 inline-flex items-center gap-2 text-secondary-foreground transition-all duration-300"
          >
            <Mail className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            <span className="font-semibold group-hover:underline">
              heidiandthehotstuff@gmail.com
            </span>
          </a>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground">
            Katso meidät livenä!
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Mikään ei kerro bändin energiasta paremmin kuin live-video.
            <br />
            Katso hittipotpurimme ja koe meininki itse!
          </p>
        </div>
        <figure>
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/1IYiuMruQic"
              title="Heidi & The Hot Stuff - Live Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <figcaption className="mt-4 text-center text-base italic text-muted-foreground">
            Studiolive Hittipotpuri - Heidi & the Hot Stuff
          </figcaption>
        </figure>

        <h2 className="text-2xl xs:text-3xl lg:text-4xl italic font-sans font-extrabold text-secondary-foreground mb-8 pt-8 text-center">
          Etsitkö energistä bilebändiä juhliisi? 🎶
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto">
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
        </p>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto px-6">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-extrabold text-foreground mb-8 text-center">
            Tarjoamme...
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-center">
            Tähän voisi listata jotain ydin myyntivaltteja ja mikä on
            mahdollista. Tyyliin https://www.viihdytin.fi/ "Miksi Heidi & The
            Hot Stuff" -osio toimii aina
          </p>
        </div>
        {/* Mobile Image 1 */}
        <div className="overflow-hidden [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)] py-12">
          <img
            src={
              "/images/Heidi-and-the-hot-stuff/bilebandi-Pirkanmaa-juhlat-yksityistilaisuus-viihdyttava.webp"
            }
            alt="Heidi & The Hot Stuff"
            className="w-full h-auto shadow-lg [clip-path:polygon(0_0,_100%_5%,_100%_100%,_0_95%)]"
          />
        </div>
      </section>

      {/* Booking & Contact Section */}
      <section className="mx-auto px-6 py-16 md:py-24" id="contact-section">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-extrabold text-foreground mb-12 text-center">
          Buukkaa Heidi & The Hot Stuff keikalle!
        </h2>

        <div className="max-w-[600px] mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Row 1: Name and Phone (2 columns on sm+) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nimi{" "}
                        <span className="text-secondary-foreground">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nimi" {...field} />
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
                        <span className="text-secondary-foreground">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Puhelinnumero" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Email (full width) */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Sähköposti{" "}
                      <span className="text-secondary-foreground">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Sähköposti" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                                "w-full pl-3 text-left font-normal justify-start hover:bg-transparent focus:ring-2 focus:ring-ring",
                                !field.value && "text-muted"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "d.M.yyyy")
                              ) : (
                                <span>Valitse päivämäärä</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 text-foreground" />
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
                        <Input placeholder="Sijainti" {...field} />
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
                        <Input placeholder="Tilaisuus" {...field} />
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
                        className="min-h-[120px]"
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

              <Button type="submit" className="w-full" size="lg">
                Lähetä
              </Button>
            </form>
          </Form>
        </div>
      </section>

      {/* Custom Bilebändi Footer */}
      <footer className="w-full mt-16">
        {/* Image Section - Full width, no overlays */}
        <div
          className="w-full h-[230px] xs:h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] xl:h-[900px] 2xl:h-[1150px] 
        bg-cover bg-top bg-[url('/images/Heidi-and-the-hot-stuff/Heidi-and-The-Hot-Stuff-bilebandi-Tampere.webp')]"
        />

        {/* Links Bar with Custom Gradient */}
        <div className="backdrop-blur-md w-full bg-[linear-gradient(270deg,hsl(234deg_23.8%_8.2%)_0%,hsl(234deg_22%_9%)_8%,hsl(234deg_21%_10%)_17%,hsl(233deg_20%_10%)_25%,hsl(234deg_20%_11%)_33%,hsl(234deg_19%_12%)_42%,hsl(235deg_18.8%_12.5%)_50%,hsl(234deg_19%_12%)_58%,hsl(234deg_20%_11%)_67%,hsl(233deg_20%_10%)_75%,hsl(234deg_21%_10%)_83%,hsl(234deg_22%_9%)_92%,hsl(234deg_23.8%_8.2%)_100%)] p-8 pb-12">
          <div className="flex flex-col items-center gap-6">
            {/* Homepage Link */}
            <Link
              to="/"
              className="uppercase tracking-wider hover:text-primary transition-colors font-medium text-sm text-muted"
            >
              • ETUSIVULLE •
            </Link>

            {/* Instagram Icon */}
            <a
              href="https://www.instagram.com/heidiandthehotstuff/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors mb-8"
              aria-label="Seuraa Heidi & The Hot Stuff Instagramissa"
            >
              <FaInstagram size={28} />
            </a>
          </div>
        </div>
        <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs pt-8 pb-5 italic text-muted">
          Sivut luonut{" "}
          <a
            href="https://www.linkedin.com/in/janisuoranta/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            SuorantaCoding
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </footer>
    </>
  );
};

export default BilebandiPage;
