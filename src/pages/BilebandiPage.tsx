import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <Helmet>
        <title>Heidi & The Hot Stuff - Bilebändi | Heidi Simelius</title>
        <meta
          name="description"
          content="Heidi & The Hot Stuff - energinen bilebändi joka tekee bileistäsi unohtumattoman"
        />
      </Helmet>

      {/* Hero Header */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-4 tracking-tight">
            Heidi & The Hot Stuff
          </h1>
        </div>
      </section>

      {/* Band Introduction Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-8 text-center">
          Bändiesittely
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-center">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
      </section>

      {/* Demo Video Section */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-12 text-center">
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
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-8 text-center">
          Varaa bilebändi
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
                        Nimi <span className="text-muted">*</span>
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
                        Puhelinnumero <span className="text-muted">*</span>
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
                      Sähköposti <span className="text-muted">*</span>
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
                                "w-full pl-3 text-left font-normal justify-start ring-accent hover:ring-accent hover:bg-transparent",
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
                Ota yhteyttä
              </Button>
            </form>
          </Form>
        </div>
      </section>
    </>
  );
};

export default BilebandiPage;
