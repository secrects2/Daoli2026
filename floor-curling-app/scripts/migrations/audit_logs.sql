-- 審計日誌表
-- 記錄所有敏感操作以便追蹤

-- 1. 創建審計日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 創建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 3. RLS 政策
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 只有管理員可以查看審計日誌
DROP POLICY IF EXISTS "admin_can_view_audit_logs" ON audit_logs;
CREATE POLICY "admin_can_view_audit_logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 系統可以插入審計日誌（使用 Service Role）
DROP POLICY IF EXISTS "system_can_insert_audit_logs" ON audit_logs;
CREATE POLICY "system_can_insert_audit_logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- 4. 審計日誌函數
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50),
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 示例觸發器：記錄用戶角色變更
CREATE OR REPLACE FUNCTION audit_role_change() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        PERFORM log_audit_event(
            NEW.id,
            'ROLE_CHANGE',
            'profiles',
            NEW.id,
            jsonb_build_object(
                'old_role', OLD.role,
                'new_role', NEW.role,
                'changed_at', now()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_role_change ON profiles;
CREATE TRIGGER trigger_audit_role_change
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_role_change();

-- 6. 記錄敏感操作的事件類型
COMMENT ON TABLE audit_logs IS '審計日誌 - 記錄所有敏感操作';
COMMENT ON COLUMN audit_logs.action IS '操作類型：USER_LOGIN, USER_LOGOUT, ROLE_CHANGE, DATA_EXPORT, PASSWORD_RESET, ADMIN_ACTION 等';
COMMENT ON COLUMN audit_logs.resource_type IS '資源類型：profiles, matches, products, wallets 等';
