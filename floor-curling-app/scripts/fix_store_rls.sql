-- 修正加盟店 (stores) 資料表的 RLS 權限
-- 請在 Supabase Dashboard 的 SQL Editor 執行此腳本

-- 1. 允許所有已登入使用者(包含藥局/家屬) 讀取商店資訊
CREATE POLICY "Enable read access for authenticated users to stores"
ON "public"."stores"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- 2. 允許店長(藥局) 或管理員 修改自己所屬的商店資訊
CREATE POLICY "Enable update for pharmacist's own store"
ON "public"."stores"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT store_id FROM profiles WHERE profiles.id = auth.uid()
  )
);
