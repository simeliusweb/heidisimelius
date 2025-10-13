-- Add press_kit_zip_url column to photo_sets table to store zip file URLs
ALTER TABLE public.photo_sets ADD COLUMN press_kit_zip_url TEXT;