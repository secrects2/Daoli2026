-- Add line_user_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS line_user_id text;

-- Add comment explaining usage
COMMENT ON COLUMN profiles.line_user_id IS 'Confirmed LINE User ID for messaging integration';
