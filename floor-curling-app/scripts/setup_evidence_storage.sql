-- Storage Bucket Setup for 'evidence'

-- 1. Create Bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public Read Access (Anyone can view evidence if they have the URL - simplifying for MVP)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'evidence' );

-- 4. Policy: Authenticated Upload (Pharmacist/Admin)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'evidence' AND
  auth.role() = 'authenticated'
);

-- 5. Policy: Authenticated Update (Optional)
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'evidence' AND auth.role() = 'authenticated' );

-- 6. Policy: Authenticated Delete (Optional)
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'evidence' AND auth.role() = 'authenticated' );
