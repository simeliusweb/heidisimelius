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

export interface BioContent {
  introParagraphs: string;
  featuredVideoUrl: string;
  featuredVideoCaption: string;
  quoteText: string;
  quoteAuthor: string;
  concludingParagraphs: string;
  cvUrl?: string;

  // New Fields
  theatreCredits?: Credit[];
  translationCredits?: Credit[];
  soloAlbums?: StudioItem[];
  singles?: StudioItem[];
  collaborations?: StudioItem[];
}
