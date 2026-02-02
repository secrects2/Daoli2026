-- Create media_library table
CREATE TABLE IF NOT EXISTS media_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    elder_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    title TEXT,
    type TEXT CHECK (type IN ('photo', 'video')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Policies for media_library
-- 1. Pharmacists/Admin can view all (or strict per store if needed, but for now allow generic pharmacist access to simplify)
CREATE POLICY "Pharmacists can view all media" ON media_library
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

CREATE POLICY "Pharmacists can insert media" ON media_library
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

CREATE POLICY "Pharmacists can delete media" ON media_library
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

-- 2. Family can view media of their linked elder
CREATE POLICY "Family can view linked elder media" ON media_library
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.linked_elder_id = media_library.elder_id
        )
    );

-- 3. Elders can view their own media
CREATE POLICY "Elders can view own media" ON media_library
    FOR SELECT
    USING (
        auth.uid() = elder_id
    );


-- Storage Bucket Setup (Attempt to create if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- We need to allow Pharmacists to upload to 'media' bucket
CREATE POLICY "Pharmacists can upload media" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'media' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

CREATE POLICY "Pharmacists can update media" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'media' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

CREATE POLICY "Pharmacists can delete media" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'media' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

CREATE POLICY "Anyone can view public media" ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'media' );
