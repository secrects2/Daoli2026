-- =====================================================
-- 交易記錄表 (transactions) - 稽核軌跡
-- 道里地壺球 S2B2C 平台 - 資產防弊核心模組
-- =====================================================

-- 1. 建立 transaction_type 列舉型別
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'match_win',           -- 比賽勝利 (Global + Local)
        'match_participate',   -- 比賽參與 (敗方獎勵)
        'local_grant',         -- 藥師發放 Local Points
        'local_redeem',        -- 兌換商品扣除 Local Points
        'adjustment'           -- 管理員調整
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 建立 transactions 表
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 交易對象
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 交易類型
    type transaction_type NOT NULL,
    
    -- 積分變動 (可正可負)
    global_points_delta INTEGER NOT NULL DEFAULT 0,  -- 榮譽分變動
    local_points_delta INTEGER NOT NULL DEFAULT 0,   -- 兌換分變動
    
    -- 交易後餘額 (快照，用於對帳)
    global_points_after INTEGER NOT NULL,
    local_points_after INTEGER NOT NULL,
    
    -- 關聯資料
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,  -- 如為比賽積分
    store_id TEXT,                                                    -- 如為藥局操作
    
    -- 操作者 (藥師/系統)
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operator_role TEXT,
    
    -- 備註
    description TEXT,
    
    -- 證據 URL (雙機流協議)
    evidence_url TEXT,  -- house_snapshot_url
    
    -- 時間戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 建立索引
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_match_id ON public.transactions(match_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON public.transactions(store_id);

-- 4. 啟用 RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS 政策

-- 5.1 用戶只能查看自己的交易記錄
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 5.2 藥師可以查看同店鋪的交易記錄 (使用 SECURITY DEFINER 函數避免遞迴)
CREATE OR REPLACE FUNCTION public.get_user_store_id(uid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT store_id FROM public.profiles WHERE id = uid;
$$;

CREATE POLICY "Pharmacists can view store transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('pharmacist', 'admin')
            AND store_id = transactions.store_id
        )
    );

-- 5.3 禁止前端直接 INSERT/UPDATE (僅後端 service_role 可操作)
-- 注意：authenticated 用戶無法修改，只有 service_role 可以繞過 RLS

-- 6. 註解
COMMENT ON TABLE public.transactions IS '交易記錄表 - 積分變動稽核軌跡';
COMMENT ON COLUMN public.transactions.type IS '交易類型：match_win, match_participate, local_grant, local_redeem, adjustment';
COMMENT ON COLUMN public.transactions.global_points_delta IS '榮譽分變動量 (可正可負)';
COMMENT ON COLUMN public.transactions.local_points_delta IS '兌換分變動量 (可正可負)';
COMMENT ON COLUMN public.transactions.evidence_url IS '雙機流協議證據 URL';
