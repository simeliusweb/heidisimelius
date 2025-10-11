-- Drop the performances jsonb column
ALTER TABLE public.gigs DROP COLUMN performances;

-- Add performance_date column (timestamptz, not null)
-- Using a default value to handle any existing rows
ALTER TABLE public.gigs ADD COLUMN performance_date timestamptz NOT NULL DEFAULT now();

-- Add gig_group_id column (uuid, nullable)
ALTER TABLE public.gigs ADD COLUMN gig_group_id uuid;