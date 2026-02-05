-- 重建 inventory 表以解決 schema 不匹配問題
-- 解決錯誤: column "product_id" of relation "inventory" does not exist

-- 1. 刪除舊表 (如果存在)
DROP TABLE IF EXISTS inventory;

-- 2. 重新創建表格 (確保 product_id 存在)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    obtained_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'equipped', 'consumed')),
    data JSONB DEFAULT '{}' 
);

-- 3. 重建 RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 策略：用戶可以查看自己的庫存
CREATE POLICY "Users can view own inventory" ON inventory
    FOR SELECT USING (auth.uid() = user_id);

-- 策略：家屬可以查看長輩的庫存
CREATE POLICY "Family can view linked elder inventory" ON inventory
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM family_elder_links
            WHERE elder_id = inventory.user_id
            AND family_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE linked_elder_id = inventory.user_id
            AND id = auth.uid()
        )
    );

-- 策略：工作人員可管理 (如果需要)
CREATE POLICY "Staff can view all inventory" ON inventory
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pharmacist')
        )
    );
