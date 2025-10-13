-- Add order_index column to videos table for drag-and-drop reordering
ALTER TABLE videos ADD COLUMN order_index integer NOT NULL DEFAULT 0;