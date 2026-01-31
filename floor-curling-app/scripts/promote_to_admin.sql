-- Promote a user to Admin role
-- Replace 'YOUR_EMAIL_HERE' with your actual login email

UPDATE profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- If you signed in via LINE and don't know the email, or if email is null:
-- You can find your user ID in the 'profiles' table or 'auth.users' table and set it directly:
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_UUID';
