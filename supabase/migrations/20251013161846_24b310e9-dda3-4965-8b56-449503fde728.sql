-- Create photo_sets_images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('photo_sets_images', 'photo_sets_images', true);

-- Create RLS policies for photo_sets_images bucket

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload photo set images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photo_sets_images');

-- Policy: Authenticated users can update images
CREATE POLICY "Authenticated users can update photo set images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'photo_sets_images');

-- Policy: Authenticated users can delete images
CREATE POLICY "Authenticated users can delete photo set images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'photo_sets_images');

-- Policy: Public read access for photo set images
CREATE POLICY "Public read access for photo set images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'photo_sets_images');