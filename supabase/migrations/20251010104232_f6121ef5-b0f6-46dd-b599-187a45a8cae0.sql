-- Create custom ENUM types
CREATE TYPE public.gig_type_enum AS ENUM ('Musiikki', 'Teatteri');
CREATE TYPE public.video_section_enum AS ENUM ('Musavideot', 'Muut videot');

-- Create gigs table
CREATE TABLE public.gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  venue text NOT NULL,
  image_url text NOT NULL,
  image_alt text NOT NULL,
  description text NOT NULL,
  event_page_url text,
  tickets_url text,
  gig_type gig_type_enum NOT NULL,
  performances jsonb NOT NULL,
  organizer_name text,
  organizer_url text,
  address_locality text NOT NULL,
  address_country text NOT NULL
);

-- Create photo_sets table
CREATE TABLE public.photo_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  photographer_name text NOT NULL,
  photographer_url text,
  photos jsonb NOT NULL
);

-- Create videos table
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  url text NOT NULL,
  title text,
  description text,
  is_featured boolean DEFAULT false,
  section video_section_enum NOT NULL
);

-- Create page_content table
CREATE TABLE public.page_content (
  page_name text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  content jsonb NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gigs table
CREATE POLICY "Public read access for gigs"
  ON public.gigs
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage gigs"
  ON public.gigs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for photo_sets table
CREATE POLICY "Public read access for photo_sets"
  ON public.photo_sets
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage photo_sets"
  ON public.photo_sets
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for videos table
CREATE POLICY "Public read access for videos"
  ON public.videos
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage videos"
  ON public.videos
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for page_content table
CREATE POLICY "Public read access for page_content"
  ON public.page_content
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage page_content"
  ON public.page_content
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);