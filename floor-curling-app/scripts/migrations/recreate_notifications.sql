-- 重建 notifications 表以解決 schema 不匹配問題
-- 解決錯誤: column "user_id" of relation "notifications" does not exist

-- 1. 刪除舊表 (如果存在)
DROP TABLE IF EXISTS notifications;
DROP TYPE IF EXISTS notification_type;

-- 2. 重建 Enum
CREATE TYPE notification_type AS ENUM (
    'match_result',    -- 比賽結果通知
    'points_update',   -- 積分更新通知
    'system',          -- 系統通知
    'info'             -- 一般資訊
);

-- 3. 重新創建表格 (確保 user_id 存在)
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 5. 重建 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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
