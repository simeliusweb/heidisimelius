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
  cvUrl?: string;

  // Bio page images
  bioImage1?: BioImage;
  bioImage2?: BioImage;
  bioImage3?: BioImage;

  // New Fields
  theatreCredits?: Credit[];
  translationCredits?: Credit[];
  soloAlbums?: StudioItem[];
  singles?: StudioItem[];
  collaborations?: StudioItem[];
}

export interface PageImage {
  src: string;
  alt: string;
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
