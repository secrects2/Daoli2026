-- 1. 創建一個安全函數來檢查家屬綁定關係
-- 使用 SECURITY DEFINER 以繞過 RLS，避免遞歸問題
CREATE OR REPLACE FUNCTION public.is_linked_family(target_elder_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND linked_elder_id = target_elder_id
  );
END;
$$;

-- 2. Profiles 策略：允許家屬查看綁定的長輩資料
DROP POLICY IF EXISTS "Family can view linked elder profile" ON profiles;
CREATE POLICY "Family can view linked elder profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        is_linked_family(id)
    );

-- 3. Wallets 策略：允許家屬查看綁定長輩的錢包
DROP POLICY IF EXISTS "Family can view linked elder wallet" ON wallets;
CREATE POLICY "Family can view linked elder wallet"
    ON wallets FOR SELECT
    TO authenticated
    USING (
        is_linked_family(user_id)
    );

-- 4. Matches 策略：允許家屬查看長輩參與的比賽
DROP POLICY IF EXISTS "Family can view linked elder matches" ON matches;
CREATE POLICY "Family can view linked elder matches"
    ON matches FOR SELECT
    TO authenticated
    USING (
        is_linked_family(red_team_elder_id) OR is_linked_family(yellow_team_elder_id)
    );
