import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  FaFacebook,
  FaInstagram,
  FaMusic,
  FaSoundcloud,
  FaSpotify,
  FaTiktok,
} from "react-icons/fa";
import { toast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";
import ShadowHeading from "./ShadowHeading";

const contactSchema = z.object({
  subject: z.string().trim().min(1, { message: "Aihe vaaditaan" }).max(100),
  email: z
    .string()
    .trim()
    .email({ message: "Syötä kelvollinen sähköpostiosoite" })
    .max(255),
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
      description: "Palaan sinulle mahdollisimman pian.",
    });
    form.reset();
  };

  const navLinks = [
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
    { label: "BILEBÄNDI", href: "/bilebandi-heidi-and-the-hot-stuff" },
    { label: "OTA YHTEYTTÄ", href: "#contact-section" },
  ];

  return (
    <footer
      id="contact-section"
      className="relative bg-card mt-auto bg-cover bg-[45%_70%] lg:bg-[center_70%] overflow-hidden bg-[url('/images/2025-glow-festival-favourites-22.8.2025-ville-huuri-38.webp')]"
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-background/85" />
      {/* Blend top into background */}
      <div className="absolute top-0 left-0 w-full h-[250px] bg-gradient-to-b from-background to-transparent" />

      {/* Content */}
      <div className="relative container mx-auto px-6 pb-20 pt-16 h-auto flex flex-col justify-end">
        <div className="flex justify-center md:justify-end gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-sans font-extrabold text-foreground mb-6 min-w-[300px]">
              Ota yhteyttä
            </h2>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 pb-40"
              >
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Aihe <span className="text-muted-foreground">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kirjoita aihe..."
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
                        Sähköpostisi{" "}
                        <span className="text-muted-foreground">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Kirjoita sähköpostisi..."
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
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Viesti <span className="text-muted-foreground">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Kirjoita viestisi..."
                          {...field}
                          className="placeholder:text-accent text-sm"
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
                  className="w-full element-embedded-effect"
                >
                  Lähetä
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <h2 className="relative z-20 text-lg xs:text-xl font-santorini text-foreground pt-4 pb-8 mx-auto w-fit">
          Heidi Simelius
        </h2>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {navLinks.map((link, index) => (
            <span key={link.label} className="flex items-center gap-4">
              <a
                href={link.href}
                className="uppercase tracking-wider hover:text-secondary transition-colors font-medium text-sm text-secondary-foreground"
              >
                {link.label}
              </a>
              {index < navLinks.length - 1 && (
                <span className="text-secondary-foreground">•</span>
              )}
            </span>
          ))}
        </div>

        {/* Social Media Icons */}
        <div className="flex gap-6 justify-center flex-wrap">
          <a
            href="https://www.instagram.com/Heidisimelius/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-secondary transition-colors"
            aria-label="Instagram"
          >
            <FaInstagram size={28} />
          </a>
          <a
            href="https://vm.tiktok.com/ZMJoaem42/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-secondary transition-colors"
            aria-label="TikTok"
          >
            <FaTiktok size={28} />
          </a>
          <a
            href="https://www.facebook.com/HeidiSimelius/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-secondary transition-colors"
            aria-label="Facebook"
          >
            <FaFacebook size={28} />
          </a>
          <a
            href="https://music.apple.com/gb/artist/heidi-simelius/1486952057"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-secondary transition-colors"
            aria-label="Apple Music"
          >
            <FaMusic size={28} />
          </a>
          <a
            href="https://soundcloud.com/heidi-simelius"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-secondary transition-colors"
            aria-label="Soundcloud"
          >
            <FaSoundcloud size={28} />
          </a>
          <a
            href="https://open.spotify.com/artist/7wmdyUKDAcJfmWbgsARwl9"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-secondary transition-colors"
            aria-label="Spotify"
          >
            <FaSpotify size={28} />
          </a>
        </div>
      </div>
      <p className="absolute bottom-0 left-0 text-xs pt-8 pb-2 pl-2 italic text-muted">
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

      {/* Credits */}
      <p className="absolute bottom-0 right-0 text-muted text-[12px] font-sans italic p-2 bg-border/50 rounded-tl-lg">
        Kuva: Ville Huuri
      </p>
    </footer>
  );
};

export default Footer;
