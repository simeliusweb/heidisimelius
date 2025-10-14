import { PageImagesContent } from "@/types/content";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getYouTubeEmbedUrl = (
  url: string | undefined
): string | undefined => {
  if (!url) return undefined;

  const regExp =
    /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?$/;
  const match = url.match(regExp);

  if (match && match[1]) {
    const videoId = match[1];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return undefined;
};

// Default content for when no data exists
export const defaultPageImagesContent: PageImagesContent = {
  home_hero: {
    src: "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2-square.webp",
    alt: "Heidi Simelius on laulaja, lauluntekijä ja esiintyjä.",
  },
  keikat_hero: {
    src: "/images/2025-glow-festival-favourites-22.8.2025-ville-huuri-16.webp",
    alt: "Keikat-sivun hero-kuva",
  },
  galleria_hero: {
    src: "/images/Ma-vastaan-kuvat-Valosanni/Heidi-Simelius-Ma-vastaan-kuvat-Valosanni-8.jpg",
    alt: "Galleria-sivun hero-kuva",
  },
  bio_hero: {
    desktop: {
      src: "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-4.jpg",
      alt: "Bio-sivun desktop hero-kuva",
    },
    mobile: {
      src: "/images/pressikuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-3.jpg",
      alt: "Bio-sivun mobiili hero-kuva",
    },
  },
  bilebandi_hero: {
    desktop: {
      src: "/images/Heidi-and-the-hot-stuff/bilebandi-Heidi-Simelius-hot-stuff.jpg",
      alt: "Bilebandi-sivun desktop hero-kuva",
    },
    mobile: {
      src: "/images/Heidi-and-the-hot-stuff/bilebandi-Heidi-Simelius-hot-stuff-mobile.webp",
      alt: "Bilebandi-sivun mobiili hero-kuva",
    },
  },
};
