-- 多長輩支援遷移腳本
-- 允許一個家屬綁定多位長輩

-- 1. 創建 family_elder_links 關聯表
CREATE TABLE IF NOT EXISTS family_elder_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    elder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- 主要長輩標記
    nickname VARCHAR(100), -- 家屬為長輩設定的暱稱
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(family_id, elder_id)
);

-- 2. 創建索引
CREATE INDEX IF NOT EXISTS idx_family_elder_links_family ON family_elder_links(family_id);
CREATE INDEX IF NOT EXISTS idx_family_elder_links_elder ON family_elder_links(elder_id);

-- 3. 遷移現有數據 (從 profiles.linked_elder_id 到新表)
INSERT INTO family_elder_links (family_id, elder_id, is_primary)
SELECT id, linked_elder_id, true
FROM profiles
WHERE linked_elder_id IS NOT NULL
ON CONFLICT (family_id, elder_id) DO NOTHING;

-- 4. RLS 政策
ALTER TABLE family_elder_links ENABLE ROW LEVEL SECURITY;

-- 先刪除現有政策（如存在），以支持重複執行
DROP POLICY IF EXISTS "family_can_view_own_links" ON family_elder_links;
DROP POLICY IF EXISTS "family_can_create_links" ON family_elder_links;
DROP POLICY IF EXISTS "family_can_delete_own_links" ON family_elder_links;
DROP POLICY IF EXISTS "elder_can_view_links" ON family_elder_links;
DROP POLICY IF EXISTS "staff_can_view_all" ON family_elder_links;

-- 家屬可以查看自己的綁定
CREATE POLICY "family_can_view_own_links" ON family_elder_links
    FOR SELECT USING (auth.uid() = family_id);

-- 家屬可以創建新綁定
CREATE POLICY "family_can_create_links" ON family_elder_links
    FOR INSERT WITH CHECK (auth.uid() = family_id);

-- 家屬可以刪除自己的綁定
CREATE POLICY "family_can_delete_own_links" ON family_elder_links
    FOR DELETE USING (auth.uid() = family_id);

-- 長輩可以查看誰綁定了他們
CREATE POLICY "elder_can_view_links" ON family_elder_links
    FOR SELECT USING (auth.uid() = elder_id);

-- 店長和管理員可以查看所有
CREATE POLICY "staff_can_view_all" ON family_elder_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('pharmacist', 'admin')
        )
    );
