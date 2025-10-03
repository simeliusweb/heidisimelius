import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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

      {/* Hero Header */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />

        {/* Content */}
        <div className="relative z-10 text-center px-6">
          <h1 className="text-6xl md:text-8xl lg:text-10xl font-playfair font-extrabold text-foreground mb-4 tracking-tight">
            Heidi & The Hot Stuff
          </h1>
        </div>
      </section>

      {/* Band Introduction Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-8 text-center">
          Bändiesittely
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-center">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur.
        </p>
      </section>

      {/* Demo Video Section */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-12 text-center">
          Katso meidät livenä!
        </h2>
        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl">
          <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="Heidi & The Hot Stuff - Live Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {/* Booking & Contact Section */}
      <section className="mx-auto px-6 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-foreground mb-8 text-center">
          Buukkaa Heidi & Hot Stuff keikalle!
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
        <div className="w-full h-64 md:h-80 lg:h-96">
          <img
            src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=2070&auto=format&fit=crop"
            alt="Band performing live"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Links Bar with Custom Gradient */}
        <div className="w-full bg-[linear-gradient(270deg,hsl(234deg_23.8%_8.2%)_0%,hsl(234deg_22%_9%)_8%,hsl(234deg_21%_10%)_17%,hsl(233deg_20%_10%)_25%,hsl(234deg_20%_11%)_33%,hsl(234deg_19%_12%)_42%,hsl(235deg_18.8%_12.5%)_50%,hsl(234deg_19%_12%)_58%,hsl(234deg_20%_11%)_67%,hsl(233deg_20%_10%)_75%,hsl(234deg_21%_10%)_83%,hsl(234deg_22%_9%)_92%,hsl(234deg_23.8%_8.2%)_100%)] p-8">
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
              className="text-foreground hover:text-primary transition-colors"
              aria-label="Seuraa Heidi & The Hot Stuff Instagramissa"
            >
              <FaInstagram size={28} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default BilebandiPage;
