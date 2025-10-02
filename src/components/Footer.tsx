import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail } from "lucide-react";
import { FaFacebook, FaInstagram, FaMusic, FaSoundcloud, FaSpotify, FaTiktok } from "react-icons/fa";
import { toast } from "@/hooks/use-toast";
import footerBg from "@/assets/footer-bg.jpg";

const contactSchema = z.object({
  subject: z.string().trim().min(1, { message: "Aihe vaaditaan" }).max(100),
  email: z.string().trim().email({ message: "Syötä kelvollinen sähköpostiosoite" }).max(255),
  message: z.string().trim().min(1, { message: "Viesti vaaditaan" }).max(1000),
});

const Footer = () => {
  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = (data: z.infer<typeof contactSchema>) => {
    console.log(data);
    toast({
      title: "Viesti lähetetty!",
      description: "Palaamme sinulle mahdollisimman pian.",
    });
    form.reset();
  };

  const navLinks = [
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
    { label: "BILEBÄNDI", href: "/bilebandi" },
    { label: "OTA YHTEYTTÄ", href: "#contact-section" },
  ];

  return (
    <footer
      id="contact-section"
      className="relative bg-card mt-auto"
      style={{
        backgroundImage: `url(${footerBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-background/90" />

      {/* Content */}
      <div className="relative container mx-auto px-6 py-16">
        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          {/* Left Column: Contact Form */}
          <div>
            <h2 className="text-3xl font-playfair font-extrabold text-primary mb-6">Ota yhteyttä</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aihe <span className="text-secondary-foreground">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Kirjoita aihe..." {...field} />
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
                      <FormLabel>Sähköpostisi <span className="text-secondary-foreground">*</span></FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Kirjoita sähköpostisi..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Viesti <span className="text-secondary-foreground">*</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Kirjoita viestisi..." {...field} />
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

                <Button type="submit" className="w-full">
                  Lähetä
                </Button>
              </form>
            </Form>
          </div>

          {/* Right Column: Artist Photo */}
          <div className="flex justify-center items-center">
            <div className="w-full max-w-md aspect-[3/4] bg-muted/20 rounded-lg flex items-center justify-center border border-border">
              <p className="text-muted text-sm">Heidin kuva tulossa</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-muted">
          {navLinks.map((link, index) => (
            <span key={link.label} className="flex items-center gap-4">
              <a
                href={link.href}
                className="uppercase tracking-wider hover:text-primary transition-colors font-medium text-sm"
              >
                {link.label}
              </a>
              {index < navLinks.length - 1 && <span>•</span>}
            </span>
          ))}
        </div>

        {/* Social Media Icons */}
        <div className="flex gap-6 justify-center flex-wrap">
          <a
            href="https://www.instagram.com/Heidisimelius/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
            aria-label="Instagram"
          >
            <FaInstagram size={28} />
          </a>
          <a
            href="https://vm.tiktok.com/ZMJoaem42/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
            aria-label="TikTok"
          >
            <FaTiktok size={28} />
          </a>
          <a
            href="https://www.facebook.com/HeidiSimelius/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
            aria-label="Facebook"
          >
            <FaFacebook size={28} />
          </a>
          <a
            href="https://music.apple.com/gb/artist/heidi-simelius/1486952057"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
            aria-label="Apple Music"
          >
            <FaMusic size={28} />
          </a>
          <a
            href="https://soundcloud.com/heidi-simelius"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
            aria-label="Soundcloud"
          >
            <FaSoundcloud size={28} />
          </a>
          <a
            href="https://open.spotify.com/artist/7wmdyUKDAcJfmWbgsARwl9"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
            aria-label="Spotify"
          >
            <FaSpotify size={28} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
