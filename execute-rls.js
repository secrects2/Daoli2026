// 使用 Supabase Admin API 執行 RLS 策略 SQL
// 需要先安裝: npm install @supabase/supabase-js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbnB6cm1vbnB2c3JwY2p2enNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU4MjA0NiwiZXhwIjoyMDg1MTU4MDQ2fQ.sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeRLSPolicies() {
    console.log('🔄 開始執行 RLS 策略...\n');

    // 由於 Supabase JS SDK 不支持直接執行 DDL 語句
    // 我們需要使用 Database Functions 或手動在 Dashboard 執行

    // 驗證連接
    const { data, error } = await supabase.from('profiles').select('count').limit(1);

    if (error) {
        console.error('❌ 連接失敗:', error.message);
        return;
    }

    console.log('✅ 已連接到 Supabase');
    console.log('\n⚠️ 注意：RLS 策略需要在 Supabase Dashboard SQL Editor 中執行');
    console.log('\n請複製以下 SQL 並在 Dashboard 中執行：\n');
    console.log('='.repeat(60));
    console.log(`
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
                profiles.role = 'admin'
                OR profiles.store_id = matches.store_id
            )
        )
    );

-- 2. 更新 profiles 表的 RLS 策略
DROP POLICY IF EXISTS "Pharmacists can only view their store elders" ON profiles;
CREATE POLICY "Pharmacists can only view their store elders"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles AS viewer
            WHERE viewer.id = auth.uid()
            AND (
                viewer.role = 'admin'
                OR (viewer.role = 'pharmacist' AND viewer.store_id = profiles.store_id)
            )
        )
    );

-- 3. 保護 wallets 表
DROP POLICY IF EXISTS "Only service role can update wallets" ON wallets;
CREATE POLICY "Only service role can update wallets"
    ON wallets
    FOR UPDATE
    TO authenticated
    USING (false)
    WITH CHECK (false);
`);
    console.log('='.repeat(60));
    console.log('\n訪問: https://supabase.com/dashboard/project/sonpzrmonpvsrpcjvzsb/sql');
}

executeRLSPolicies();
