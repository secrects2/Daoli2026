-- RLS 策略更新：store_id 數據隔離
-- 執行於 Supabase SQL Editor

-- 1. 更新 matches 表的 RLS 策略
DROP POLICY IF EXISTS "Pharmacists can only view their store matches" ON matches;
CREATE POLICY "Pharmacists can only view their store matches"
    ON matches
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'  -- 管理員可看所有
                OR profiles.store_id = matches.store_id  -- 藥師只看自己店鋪
            )
        )
    );

-- 2. 更新 profiles 表的 RLS 策略（長者過濾）
DROP POLICY IF EXISTS "Pharmacists can only view their store elders" ON profiles;
CREATE POLICY "Pharmacists can only view their store elders"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()  -- 自己的 profile
        OR EXISTS (
            SELECT 1 FROM profiles AS viewer
            WHERE viewer.id = auth.uid()
            AND (
                viewer.role = 'admin'  -- 管理員可看所有
                OR (viewer.role = 'pharmacist' AND viewer.store_id = profiles.store_id)  -- 藥師只看自己店鋪
            )
        )
    );

-- 3. 保護 wallets 表：只有後端可寫入
DROP POLICY IF EXISTS "Only service role can update wallets" ON wallets;
CREATE POLICY "Only service role can update wallets"
    ON wallets
    FOR UPDATE
    TO authenticated
    USING (false)  -- 禁止客戶端直接更新
    WITH CHECK (false);

-- 注意：需要使用 Service Role Key 在後端 API 中更新 wallets
