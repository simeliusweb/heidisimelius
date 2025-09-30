import { useState } from "react";
import { Menu, X, Instagram, Facebook, Youtube } from "lucide-react";

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
      {/* Hamburger Menu Icon - Fixed Top Left */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-50 p-2 text-foreground hover:text-primary transition-colors"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
      </button>

      {/* Full-Screen Overlay Menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-0"
          onClick={toggleMenu}
        >
          {/* Frosted Glass Panel */}
          <div
            className="relative w-full max-w-[420px] h-full md:h-auto md:max-h-[90vh] bg-background/80 backdrop-blur-xl border border-border rounded-none md:rounded-lg shadow-2xl flex flex-col items-center justify-between py-12 px-8"
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
            <div className="flex gap-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={28} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={28} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                <Youtube size={28} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Branding */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border py-4 px-6">
        <div className="container mx-auto text-center">
          {/* Large Stylized Name */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-playfair text-primary mb-2">
            Heidi Simelius
          </h1>
          
          {/* Quick Navigation Links */}
          <div className="flex items-center justify-center gap-2 text-sm md:text-base text-muted">
            {quickLinks.map((link, index) => (
              <span key={link.label} className="flex items-center gap-2">
                <a
                  href={link.href}
                  className="uppercase tracking-wider hover:text-primary transition-colors font-medium"
                >
                  {link.label}
                </a>
                {index < quickLinks.length - 1 && (
                  <span className="text-muted">/</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
