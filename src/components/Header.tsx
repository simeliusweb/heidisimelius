import { useState } from "react";
import { Menu, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaMusic, FaSoundcloud, FaSpotify, FaTiktok } from "react-icons/fa";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = [
    { label: "ETUSIVU", href: "/" },
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
    { label: "BILEBÄNDI", href: "/bilebandi" },
    { label: "OTA YHTEYTTÄ", href: "/contact" },
  ];

  const quickLinks = [
    { label: "KEIKAT", href: "/keikat" },
    { label: "BIO", href: "/bio" },
    { label: "GALLERIA", href: "/galleria" },
  ];

  return (
    <>
      {/* Top-Left Header Component - Frosted Glass */}
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
        {/* Primary Box: Hamburger + Name */}
        <div className="bg-background/80 backdrop-blur-xl border border-border rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
          <button
            onClick={toggleMenu}
            className="text-foreground hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="text-sm md:text-base font-bold tracking-wider text-foreground uppercase">
            HEIDI SIMELIUS
          </span>
        </div>
        
        {/* Secondary Box: Latest EP */}
        <div className="bg-background/80 backdrop-blur-xl border border-border rounded-lg px-4 py-2 shadow-lg">
          <span className="text-xs md:text-sm text-muted uppercase tracking-wide">
            MÄ VASTAAN EP
          </span>
        </div>
      </div>

      {/* Full-Screen Overlay Menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center md:items-start md:justify-start justify-center p-4 md:p-0"
          onClick={toggleMenu}
        >
          {/* Frosted Glass Panel */}
          <div
            className="relative w-full max-w-[420px] h-full md:h-auto md:max-h-[90vh] md:ml-0 bg-background/80 backdrop-blur-xl border border-border rounded-none md:rounded-r-lg shadow-2xl flex flex-col items-center justify-between py-12 px-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top: Logo Text */}
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-playfair text-primary">
                Heidi Simelius
              </h2>
            </div>

            {/* Center: Navigation Links */}
            <nav className="flex-1 flex items-center">
              <ul className="space-y-6 text-center">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
                      onClick={toggleMenu}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Bottom: Social Media Icons */}
            <div className="flex gap-6 flex-wrap justify-center">
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
                href="https://www.instagram.com/Heidisimelius/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram size={28} />
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
              <a
                href="https://vm.tiktok.com/ZMJoaem42/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
                aria-label="TikTok"
              >
                <FaTiktok size={28} />
              </a>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default Header;
