import { useState } from "react";
import { Menu, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaMusic, FaSoundcloud, FaSpotify, FaTiktok } from "react-icons/fa";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleContactScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsMenuOpen(false);
    setTimeout(() => {
      const element = document.getElementById('contact-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 1000);
  };

  const navLinks = [
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
    { label: "BILEBÄNDI", href: "/bilebandi-heidi-and-the-hot-stuff" },
    { label: "OTA YHTEYTTÄ", href: "#contact-section" },
  ];

  const quickLinks = [
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
  ];

  return (
    <>
      {/* Top Header Container - Always Visible */}
      <div className="fixed top-4 left-4 z-50 w-[calc(100%-2rem)] max-w-[420px]">
        <div className="bg-background/70 backdrop-blur-xl border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Top Row: Hamburger + Name */}
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={toggleMenu}
              className="text-foreground hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <a href="/" className="hover:opacity-80 transition-opacity">
              <span className="text-lg md:text-xl font-playfair text-foreground">
                Heidi Simelius
              </span>
            </a>
          </div>
          
          {/* Marquee Tagline */}
          <div className="border-t border-border overflow-hidden py-2">
            <div className="whitespace-nowrap animate-marquee">
              <span className="text-sm font-playfair italic text-muted inline-block px-4">
                Laulaja, lauluntekijä ja esiintyjä • Laulaja, lauluntekijä ja esiintyjä • Laulaja, lauluntekijä ja esiintyjä • Laulaja, lauluntekijä ja esiintyjä
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Links Container - Only When Menu Open */}
      {isMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-background/20"
            onClick={toggleMenu}
          />
          
          {/* Links Container */}
          <div className="fixed top-[140px] left-4 z-50 w-[calc(100%-2rem)] max-w-[420px]">
            <div
              className="bg-background/70 backdrop-blur-xl border border-border rounded-lg shadow-2xl py-8 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Navigation Links */}
              <nav className="mb-12">
                <ul className="space-y-6 px-4">
                  {navLinks.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('#') ? (
                        <a
                          href={link.href}
                          className="text-2xl md:text-3xl font-playfair font-extrabold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                          onClick={handleContactScroll}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <a
                          href={link.href}
                          className="text-2xl md:text-3xl font-playfair font-extrabold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                          onClick={toggleMenu}
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Social Media Icons */}
              <div className="flex gap-6 flex-wrap justify-center pt-8 border-t border-border">
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
          </div>
        </>
      )}
    </>
  );
};

export default Header;
