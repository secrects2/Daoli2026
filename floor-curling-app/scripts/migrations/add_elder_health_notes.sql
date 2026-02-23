-- Migration: Add health and emergency contact fields to profiles table
-- Please execute this in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS health_notes TEXT;
