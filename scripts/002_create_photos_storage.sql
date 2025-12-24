-- Create storage bucket for birthday photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('birthday-photos', 'birthday-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to upload photos
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'birthday-photos');

-- Allow public access to read photos
CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'birthday-photos');

-- Allow public access to update photos
CREATE POLICY "Allow public updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'birthday-photos');

-- Allow public access to delete photos
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'birthday-photos');
