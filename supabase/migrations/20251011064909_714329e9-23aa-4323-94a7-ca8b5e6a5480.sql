-- Create a public storage bucket for gig images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gigs-images', 'gigs-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload gig images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gigs-images');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update gig images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'gigs-images');

-- Allow authenticated users to delete gig images
CREATE POLICY "Authenticated users can delete gig images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'gigs-images');

-- Allow public read access to gig images
CREATE POLICY "Public can view gig images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'gigs-images');