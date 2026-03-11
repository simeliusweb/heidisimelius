export interface Credit {
  id: string; // For React key prop, will be generated on the fly
  year: number;
  title: string;
  details: string;
}

export interface StudioItem {
  id: string; // For React key prop
  title: string;
  subtitle?: string;
  artistOrCollaborator: string;
  year: number;
}

export interface BioImage {
  src: string;
  alt: string;
  description: string;
  photographerName: string;
}

export interface BioContent {
  introParagraphs: string;
  featuredVideoUrl: string;
  featuredVideoCaption: string;
  quoteText: string;
  quoteAuthor: string;
  concludingParagraphs: string;
  musicalExperienceParagraphs?: string;
  koulutusTitle?: string;
  musikaaliproduktiotTitle?: string;
  cvUrl?: string;

  // Bio page images
  bioImage1?: BioImage;
  bioImage2?: BioImage;
  bioImage3?: BioImage;

  // Laulunopetus CTA section on bio page
  ctaVisible?: boolean;
  ctaTitle?: string;
  ctaText?: string;
  ctaButtonText?: string;
  ctaButtonLink?: string;

  // New Fields
  theatreCredits?: Credit[];
  translationCredits?: Credit[];
  soloAlbums?: StudioItem[];
  singles?: StudioItem[];
  collaborations?: StudioItem[];
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  duration: string;
  isFeatured?: boolean;
}

export interface Testimonial {
  id: string;
  text: string;
  author: string;
}

export interface LaulunopetusContent {
  tagline: string;
  introLeadParagraph: string;
  introBodyParagraphs: string;
  practiceItems: string[];
  ctaButtonText: string;
  testimonials: Testimonial[];
  pricingTitle: string;
  pricingTiers: PricingTier[];
  backgroundTitle: string;
  backgroundParagraphs: string;
  closingCta: string;
  finalCtaButtonText: string;
  heroImageCredit: string;
}

export interface PageImage {
  src: string;
  alt: string;
  photographer_name?: string;
}

export interface ResponsivePageImage {
  desktop: PageImage;
  mobile: PageImage;
}

export interface PageImagesContent {
  home_hero: PageImage;
  keikat_hero: PageImage;
  galleria_hero: PageImage;
  bio_hero: ResponsivePageImage;
  bilebandi_hero: ResponsivePageImage;
}
