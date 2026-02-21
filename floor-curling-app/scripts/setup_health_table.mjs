import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log('1. 建立 elder_health_daily 資料表 (如果是第一次)');
    // 由於我們沒辦法直接執行純 DDL 語法透過 client 而不用 RPC (除非開啟 pgcrypto/exec 或寫 SQL plugin)，
    // 如果遇到權限問題，Supabase 允許 Service Role 插表，但不一定允許 DDL (CREATE TABLE)
    // 如果不支援，我們可以手動印出 SQL 給使用者，或是在腳本中看能不能透過 raw sql 執行。
    // 不過我們可以先試著用 POSTGRES REST API 直接新增? 不行，必需透過 SQL Editor。
    const createTableSql = `
    CREATE TABLE IF NOT EXISTS public.elder_health_daily (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      elder_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
      date date NOT NULL,
      steps integer DEFAULT 0,
      heart_rate_avg integer DEFAULT 0,
      calories_burned integer DEFAULT 0,
      active_minutes integer DEFAULT 0,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE(elder_id, date)
    );

    ALTER TABLE public.elder_health_daily ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own health data" ON public.elder_health_daily;
    CREATE POLICY "Users can view their own health data" ON public.elder_health_daily
      FOR SELECT
      USING (
        auth.uid() = elder_id OR 
        EXISTS (
          SELECT 1 FROM family_elder_links 
          WHERE family_elder_links.family_id = auth.uid() 
          AND family_elder_links.elder_id = elder_health_daily.elder_id
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'pharmacist'
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );

    -- Service role bypasses RLS
  `

    console.log('=============== 請在 Supabase SQL Editor 執行以下語法 ===============\n');
    console.log(createTableSql);
    console.log('======================================================================\n');
    console.log('請記得手動執行！接著我們將開始產生假數據...');
}

main().catch(console.error)
