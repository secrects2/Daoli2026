-- Fix RLS Infinite Recursion on profiles table

-- 1. Create a secure function to check pharmacist status without triggering RLS recursion
-- SECURITY DEFINER means this function runs with the privileges of the creator (postgres/admin), bypassing RLS.
CREATE OR REPLACE FUNCTION public.is_store_pharmacist(target_store_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct check on profiles table. Since it's SECURITY DEFINER, it bypasses RLS.
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'pharmacist'
    AND store_id = target_store_id
  );
END;
$$;

-- 2. Drop the problematic policy
DROP POLICY IF EXISTS "Pharmacists can view store elders" ON public.profiles;

-- 3. Re-create the policy using the secure function
CREATE POLICY "Pharmacists can view store elders"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- For the row being accessed (profiles.store_id), check if the current user is a pharmacist of that store.
        is_store_pharmacist(store_id)
    );

-- Also fix other potential recursions if they exist in similar pattern
-- "Pharmacists can view store wallets" in wallets table queries profiles, which queries profiles...
-- But wait, wallets query profiles (viewer) -> profiles. This is distinct tables, so it might not recurse *indefinitely* unless profiles policy points back to wallets (unlikely).
-- However, "Pharmacists can view store wallets" does:
-- SELECT 1 FROM profiles (viewer) ... AND EXISTS (SELECT 1 FROM profiles (elder) WHERE ... )
-- Evaluating policies on profiles (viewer) and profiles (elder) might trigger the profiles recursion again if unmodified.
-- Since we fixed profiles policy, the wallet policy should also be safe now as the profile lookup won't recurse.

-- But let's look at "Pharmacists can view store wallets" again.
-- It does:
-- EXISTS ( SELECT 1 FROM profiles AS viewer ... )
-- If this viewer lookup triggers "Pharmacists can view store elders" on the viewer row,
-- that policy now calls is_store_pharmacist() which is safe.
-- So fixing the profiles policy should fix the chain.

