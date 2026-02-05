-- 創建 user_interactions 表
-- 用於記錄用戶活動日誌 (Check-in, 比賽結果, 等)
-- 與 interactions 表 (P2P 消息) 區分

CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'check_in', 'match_result', 'daily_activity'
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created ON user_interactions(created_at DESC);

-- RLS
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- 策略：用戶可以查看自己的互動記錄
DROP POLICY IF EXISTS "Users can view own interactions" ON user_interactions;
CREATE POLICY "Users can view own interactions" ON user_interactions
    FOR SELECT USING (auth.uid() = user_id);

-- 策略：家屬可以查看綁定長輩的互動記錄
DROP POLICY IF EXISTS "Family can view linked elder interactions" ON user_interactions;
CREATE POLICY "Family can view linked elder interactions" ON user_interactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM family_elder_links
            WHERE elder_id = user_interactions.user_id
            AND family_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE linked_elder_id = user_interactions.user_id
            AND id = auth.uid()
        )
    );

-- 策略：工作人員可查看
DROP POLICY IF EXISTS "Staff can view all user interactions" ON user_interactions;
CREATE POLICY "Staff can view all user interactions" ON user_interactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pharmacist')
        )
    );
