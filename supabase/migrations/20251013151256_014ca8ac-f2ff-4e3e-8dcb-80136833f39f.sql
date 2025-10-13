-- Add is_press_kit column to photo_sets table to differentiate press kit galleries
ALTER TABLE public.photo_sets ADD COLUMN is_press_kit BOOLEAN NOT NULL DEFAULT FALSE;