import { useState, useRef } from "react";
import {
  FaFacebook,
  FaInstagram,
  FaMusic,
  FaSoundcloud,
  FaSpotify,
  FaTiktok,
} from "react-icons/fa";
import { HashLink } from "react-router-hash-link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Refs for animation
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLSpanElement>(null);
  const middleBarRef = useRef<HTMLSpanElement>(null);
  const bottomBarRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // GSAP Animation
  useGSAP(() => {
    // Create timeline
    const tl = gsap.timeline({ paused: true });

    // Backdrop animation
    if (backdropRef.current) {
      tl.fromTo(
        backdropRef.current,
        { opacity: 0, visibility: "hidden", pointerEvents: "none" },
        {
          opacity: 1,
          visibility: "visible",
          pointerEvents: "auto",
          duration: 0.3,
          ease: "power2.inOut",
        },
        0
      );
    }

    // Menu panel animation
    if (menuPanelRef.current) {
      tl.fromTo(
        menuPanelRef.current,
        {
          clipPath: "inset(0% 0% 100% 0%)",
          visibility: "hidden",
          pointerEvents: "none",
        },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          visibility: "visible",
          pointerEvents: "auto",
          duration: 0.5,
          ease: "power2.inOut",
        },
        0
      );
    }

    // Hamburger icon animation
    if (topBarRef.current && middleBarRef.current && bottomBarRef.current) {
      tl.to(
        topBarRef.current,
        { rotation: 45, y: 8, duration: 0.3, ease: "power2.inOut" },
        0
      )
        .to(
          middleBarRef.current,
          { opacity: 0, duration: 0.3, ease: "power2.inOut" },
          0
        )
        .to(
          bottomBarRef.current,
          { rotation: -45, y: -8, duration: 0.3, ease: "power2.inOut" },
          0
        );
    }

    timelineRef.current = tl;
  }, []);

  // Play or reverse animation based on menu state
  useGSAP(() => {
    if (timelineRef.current) {
      if (isMenuOpen) {
        timelineRef.current.play();
      } else {
        timelineRef.current.reverse();
      }
    }
  }, [isMenuOpen]);

  const navLinks = [
    { label: "Keikat", href: "/keikat" },
    { label: "Bio", href: "/bio" },
    { label: "Galleria", href: "/galleria" },
    {
      label: "Heidi & The Hot Stuff",
      href: "/bilebandi-heidi-and-the-hot-stuff",
    },
    { label: "Ota yhteyttä", href: "#contact-section" },
  ];

  return (
    <>
      {/* Top Header Container - Always Visible */}
      <div className="fixed top-4 left-4 z-50 w-[200px]">
        <div className="bg-background/40 backdrop-blur-md border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Top Row: Hamburger + Name */}
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={toggleMenu}
              className="text-foreground hover:text-secondary-foreground transition-colors w-6 h-6 flex flex-col justify-center items-center gap-[6px]"
              aria-label="Toggle menu"
            >
              <span ref={topBarRef} className="w-6 h-0.5 bg-foreground block" />
              <span
                ref={middleBarRef}
                className="w-6 h-0.5 bg-foreground block"
              />
              <span
                ref={bottomBarRef}
                className="w-6 h-0.5 bg-foreground block"
              />
            </button>
            <a href="/" className="hover:opacity-80 transition-opacity">
              <span className="text-[12px] font-santorini text-secondary-foreground block pb-1">
                Heidi Simelius
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Links Container - Always in DOM, GSAP controls visibility */}
      {/* Backdrop overlay */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-background/20"
        onClick={toggleMenu}
      />

      {/* Links Container */}
      <div
        className={`fixed top-[80px] left-4 z-50 w-[calc(100%-2rem)] max-w-[340px] ${
          isMenuOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          ref={menuPanelRef}
          className="bg-background/40 backdrop-blur-md border border-border rounded-lg shadow-2xl py-8 px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Navigation Links */}
          <nav className="mb-8">
            <ul className="space-y-4 px-4">
              {navLinks.map((link) => (
                <li key={link.label}>
                  {link.href.includes("#") ? (
                    <HashLink
                      to={link.href}
                      className="text-xl md:text-2xl font-sans font-extrabold text-foreground hover:text-secondary-foreground transition-colors"
                      onClick={toggleMenu}
                    >
                      {link.label}
                    </HashLink>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-xl md:text-2xl font-sans font-extrabold text-foreground hover:text-secondary-foreground transition-colors"
                      onClick={toggleMenu}
                    >
                      {link.label}
                    </Link>
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
              className="text-foreground hover:text-secondary-foreground transition-colors"
              aria-label="Instagram"
            >
              <FaInstagram size={28} />
            </a>
            <a
              href="https://vm.tiktok.com/ZMJoaem42/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-secondary-foreground transition-colors"
              aria-label="TikTok"
            >
              <FaTiktok size={28} />
            </a>
            <a
              href="https://www.facebook.com/HeidiSimelius/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-secondary-foreground transition-colors"
              aria-label="Facebook"
            >
              <FaFacebook size={28} />
            </a>
            <a
              href="https://music.apple.com/gb/artist/heidi-simelius/1486952057"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-secondary-foreground transition-colors"
              aria-label="Apple Music"
            >
              <FaMusic size={28} />
            </a>
            <a
              href="https://soundcloud.com/heidi-simelius"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-secondary-foreground transition-colors"
              aria-label="Soundcloud"
            >
              <FaSoundcloud size={28} />
            </a>
            <a
              href="https://open.spotify.com/artist/7wmdyUKDAcJfmWbgsARwl9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-secondary-foreground transition-colors"
              aria-label="Spotify"
            >
              <FaSpotify size={28} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
