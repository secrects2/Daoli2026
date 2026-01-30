-- =============================================
-- 建立 notifications 通知表
-- =============================================

-- 建立通知類型 enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'match_result',    -- 比賽結果通知
        'points_update',   -- 積分更新通知
        'system',          -- 系統通知
        'info'             -- 一般資訊
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 建立 notifications 表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 接收者
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- 通知內容
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    
    -- 狀態
    read BOOLEAN DEFAULT FALSE,
    
    -- 相關資料
    metadata JSONB DEFAULT '{}',
    
    -- 時間戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- =============================================
-- RLS 政策
-- =============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 清除舊政策
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- 用戶查看自己的通知
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- 用戶更新自己的通知（標記已讀）
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 允許 service role 插入通知
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- =============================================
-- 添加 linked_elder_id 欄位到 profiles（如果不存在）
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'linked_elder_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN linked_elder_id UUID REFERENCES profiles(id);
    END IF;
END $$;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_profiles_linked_elder ON profiles(linked_elder_id);

-- =============================================
-- 測試資料（可選）
-- =============================================

-- 插入測試通知的函數
CREATE OR REPLACE FUNCTION send_match_notification(
    p_family_user_id UUID,
    p_elder_name TEXT,
    p_result TEXT,
    p_score TEXT
)
RETURNS void AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, metadata)
    VALUES (
        p_family_user_id,
        CASE 
            WHEN p_result = 'win' THEN '🏆 恭喜！' || p_elder_name || ' 獲勝了！'
            WHEN p_result = 'lose' THEN '💪 ' || p_elder_name || ' 比賽結束'
            ELSE '🤝 ' || p_elder_name || ' 比賽平手'
        END,
        p_elder_name || ' 剛完成一場地壺球比賽，比分 ' || p_score,
        'match_result',
        jsonb_build_object('result', p_result, 'elder_name', p_elder_name, 'score', p_score)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE notifications IS '用戶通知表，用於推播比賽結果等訊息給家屬';
