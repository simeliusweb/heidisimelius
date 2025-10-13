-- Add order_index column to photo_sets table
ALTER TABLE public.photo_sets
ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;