-- 創建 point_transactions 表
-- 用於記錄積分變動（替代或補充 transactions 表）
-- 根據應用程序代碼 usage: wallet_id, amount, type, description

CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL DEFAULT 0,
    type VARCHAR(50) NOT NULL, -- 'earned', 'spent' 等
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_point_transactions_wallet ON point_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at DESC);

-- RLS
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- 策略：用戶可以查看自己錢包的交易
DROP POLICY IF EXISTS "Users can view own point transactions" ON point_transactions;
CREATE POLICY "Users can view own point transactions" ON point_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wallets 
            WHERE wallets.id = point_transactions.wallet_id 
            AND wallets.user_id = auth.uid()
        )
    );

-- 策略：家屬可以查看綁定長輩的交易
DROP POLICY IF EXISTS "Family can view linked elder point transactions" ON point_transactions;
CREATE POLICY "Family can view linked elder point transactions" ON point_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wallets
            JOIN family_elder_links ON wallets.user_id = family_elder_links.elder_id
            WHERE wallets.id = point_transactions.wallet_id
            AND family_elder_links.family_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM wallets
            JOIN profiles ON wallets.user_id = profiles.linked_elder_id
            WHERE wallets.id = point_transactions.wallet_id
            AND profiles.id = auth.uid()
        )
    );

-- 策略：店長/管理員可以查看所有（或特定門店）
-- 這裡簡化為管理員和店長可查看所有
DROP POLICY IF EXISTS "Staff can view all point transactions" ON point_transactions;
CREATE POLICY "Staff can view all point transactions" ON point_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pharmacist')
        )
    );
