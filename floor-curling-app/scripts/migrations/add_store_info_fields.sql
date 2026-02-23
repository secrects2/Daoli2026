-- Migration: Add basic info fields to stores table
-- Please execute this in Supabase SQL Editor

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Drop existing policy if any (for idempotency)
DROP POLICY IF EXISTS "Store admins can update their store info" ON stores;

-- Create policy to allow store admins to update their own store
-- Using the profiles table to verify their store_id
CREATE POLICY "Store admins can update their store info" ON stores
    FOR UPDATE
    USING (
        id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
    );
