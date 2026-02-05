-- =====================================================
-- 家庭连结通知触发器
-- Supabase PostgreSQL Trigger for Family Notifications
-- =====================================================

-- 1. 创建交易类型枚举
CREATE TYPE IF NOT EXISTS transaction_type AS ENUM (
    'Game_Win',
    'Game_Loss', 
    'Equipment_Purchase',
    'Points_Redeem',
    'Bonus_Award'
);

-- 2. 创建 transactions 表（积分变动记录）
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount BIGINT NOT NULL,            -- 积分变动量（正数为增加，负数为减少）
    balance_after BIGINT NOT NULL,     -- 变动后余额
    description TEXT,                   -- 交易描述
    match_id UUID REFERENCES public.matches(id),  -- 关联的比赛（如果有）
    metadata JSONB DEFAULT '{}',       -- 额外信息
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 transactions 创建索引
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 启用 RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pharmacist')
        ) OR
        -- 家属可以查看关联长者的交易
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role = 'family' 
            AND linked_family_id = transactions.user_id
        )
    );

-- =====================================================
-- 3. 创建通知表（存储待发送的通知）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,  -- 'LINE', 'Email', 'Push'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, failed
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (recipient_id = auth.uid());

-- =====================================================
-- 4. 创建触发器函数
-- =====================================================
CREATE OR REPLACE FUNCTION notify_family_on_game_win()
RETURNS TRIGGER AS $$
DECLARE
    elder_profile RECORD;
    family_member RECORD;
    notification_message TEXT;
BEGIN
    -- 只处理 Game_Win 类型的交易
    IF NEW.transaction_type != 'Game_Win' THEN
        RETURN NEW;
    END IF;

    -- 获取长者信息
    SELECT * INTO elder_profile
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- 如果找不到用户，直接返回
    IF NOT FOUND THEN
        RAISE NOTICE 'User not found: %', NEW.user_id;
        RETURN NEW;
    END IF;

    -- 查找关联的家属
    FOR family_member IN
        SELECT p.id, p.role
        FROM public.profiles p
        WHERE p.role = 'family' 
        AND p.linked_family_id = NEW.user_id
    LOOP
        -- 构建通知消息
        notification_message := format(
            '您的家人刚刚在地壺球比赛中获胜！获得 %s 积分！🎉',
            NEW.amount
        );

        -- 模拟发送 LINE 通知（实际只是插入到通知表）
        INSERT INTO public.notifications (
            recipient_id,
            notification_type,
            title,
            message,
            metadata,
            status
        ) VALUES (
            family_member.id,
            'LINE',
            '🏆 比赛获胜通知',
            notification_message,
            jsonb_build_object(
                'elder_id', NEW.user_id,
                'transaction_id', NEW.id,
                'score', NEW.amount,
                'match_id', NEW.match_id
            ),
            'pending'
        );

        -- 控制台日志（用于调试）
        RAISE NOTICE 'Sending LINE notification to [%]: Your parent just scored %!', 
            family_member.id, NEW.amount;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. 创建触发器
-- =====================================================
DROP TRIGGER IF EXISTS trigger_notify_family_on_game_win ON public.transactions;

CREATE TRIGGER trigger_notify_family_on_game_win
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION notify_family_on_game_win();

-- =====================================================
-- 6. 辅助函数：记录比赛获胜交易
-- =====================================================
CREATE OR REPLACE FUNCTION record_game_win(
    p_user_id UUID,
    p_points BIGINT,
    p_match_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    current_balance BIGINT;
    new_transaction_id UUID;
BEGIN
    -- 获取当前余额
    SELECT COALESCE(global_points, 0) INTO current_balance
    FROM public.wallets
    WHERE user_id = p_user_id;

    -- 插入交易记录
    INSERT INTO public.transactions (
        user_id,
        transaction_type,
        amount,
        balance_after,
        description,
        match_id
    ) VALUES (
        p_user_id,
        'Game_Win',
        p_points,
        current_balance + p_points,
        format('比赛获胜奖励 +%s 积分', p_points),
        p_match_id
    )
    RETURNING id INTO new_transaction_id;

    RETURN new_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. 创建通知处理函数（模拟发送）
-- =====================================================
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS INTEGER AS $$
DECLARE
    notification_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    FOR notification_record IN
        SELECT * FROM public.notifications
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 100
    LOOP
        -- 模拟发送通知
        RAISE NOTICE '📱 Sending % notification to %: %',
            notification_record.notification_type,
            notification_record.recipient_id,
            notification_record.message;

        -- 更新状态为已发送
        UPDATE public.notifications
        SET status = 'sent',
            sent_at = NOW()
        WHERE id = notification_record.id;

        processed_count := processed_count + 1;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 使用示例
-- =====================================================

-- 记录比赛获胜（会自动触发通知）
-- SELECT record_game_win('elder-uuid', 100, 'match-uuid');

-- 手动处理待发送通知
-- SELECT process_pending_notifications();

-- 查看通知队列
-- SELECT * FROM public.notifications WHERE status = 'pending';

-- =====================================================
-- 完成
-- =====================================================
