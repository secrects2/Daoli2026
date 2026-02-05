-- =====================================================
-- 地壺球 (Floor Curling) 平台数据库迁移脚本
-- Supabase PostgreSQL Schema
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. 创建枚举类型
-- =====================================================

-- 用户角色枚举
CREATE TYPE user_role AS ENUM ('admin', 'pharmacist', 'family', 'elder');

-- 比赛队伍颜色枚举
CREATE TYPE team_color AS ENUM ('red', 'yellow');

-- =====================================================
-- 2. 创建核心表
-- =====================================================

-- ------------------------------------------------------
-- 2.1 用户档案表 (扩展 auth.users)
-- ------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'elder',
    store_id TEXT,
    linked_family_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 确保只有长者可以被家属关联
    CONSTRAINT valid_family_link CHECK (
        linked_family_id IS NULL OR 
        (SELECT role FROM public.profiles WHERE id = linked_family_id) = 'elder'
    )
);

-- 为 profiles 创建索引
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_store_id ON public.profiles(store_id);
CREATE INDEX idx_profiles_linked_family ON public.profiles(linked_family_id);

-- 为 profiles 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------
-- 2.2 钱包表 (双账户系统)
-- ------------------------------------------------------
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    global_points BIGINT NOT NULL DEFAULT 0 CHECK (global_points >= 0),  -- 荣誉积分
    local_points BIGINT NOT NULL DEFAULT 0 CHECK (local_points >= 0),    -- 兑换积分
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 wallets 创建索引
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);

-- 为 wallets 创建更新时间戳触发器
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 自动为新用户创建钱包
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_wallet_on_profile_creation
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_user();

-- ------------------------------------------------------
-- 2.3 装备表 (RPG 风格装备)
-- ------------------------------------------------------
CREATE TABLE public.equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    stats JSONB NOT NULL DEFAULT '{}',  -- 装备属性 (如: {"speed": 10, "accuracy": 5})
    rarity TEXT,  -- 稀有度 (common, rare, epic, legendary)
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 equipment 创建索引
CREATE INDEX idx_equipment_name ON public.equipment(name);
CREATE INDEX idx_equipment_rarity ON public.equipment(rarity);

-- 为 equipment 创建更新时间戳触发器
CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON public.equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------
-- 2.4 背包/库存表
-- ------------------------------------------------------
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 每个用户的每件装备只能有一条记录
    CONSTRAINT unique_user_equipment UNIQUE (user_id, equipment_id)
);

-- 为 inventory 创建索引
CREATE INDEX idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX idx_inventory_equipment_id ON public.inventory(equipment_id);
CREATE INDEX idx_inventory_is_equipped ON public.inventory(is_equipped);

-- ------------------------------------------------------
-- 2.5 比赛表
-- ------------------------------------------------------
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id TEXT NOT NULL,
    red_team_elder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    yellow_team_elder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    winner_color team_color,
    status TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress, completed, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- 确保两队是不同的长者
    CONSTRAINT different_elders CHECK (red_team_elder_id != yellow_team_elder_id)
);

-- 为 matches 创建索引
CREATE INDEX idx_matches_store_id ON public.matches(store_id);
CREATE INDEX idx_matches_red_elder ON public.matches(red_team_elder_id);
CREATE INDEX idx_matches_yellow_elder ON public.matches(yellow_team_elder_id);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_created_at ON public.matches(created_at DESC);

-- ------------------------------------------------------
-- 2.6 比赛回合表 (每场比赛最多 6 回合)
-- ------------------------------------------------------
CREATE TABLE public.match_ends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    end_number INT NOT NULL CHECK (end_number >= 1 AND end_number <= 6),
    red_score INT NOT NULL DEFAULT 0 CHECK (red_score >= 0),
    yellow_score INT NOT NULL DEFAULT 0 CHECK (yellow_score >= 0),
    house_snapshot_url TEXT,  -- 证明照片 (Proof Photo)
    vibe_video_url TEXT,      -- 开心视频 (Happy Video)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 每场比赛的每个回合号只能有一条记录
    CONSTRAINT unique_match_end UNIQUE (match_id, end_number)
);

-- 为 match_ends 创建索引
CREATE INDEX idx_match_ends_match_id ON public.match_ends(match_id);
CREATE INDEX idx_match_ends_end_number ON public.match_ends(end_number);

-- =====================================================
-- 3. 行级安全 (RLS) 策略
-- =====================================================

-- 启用所有表的 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_ends ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------
-- 3.1 profiles 表策略
-- ------------------------------------------------------

-- 用户可以查看自己的档案
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- 管理员和药师可以查看所有档案
CREATE POLICY "Admins and pharmacists can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pharmacist')
        )
    );

-- 用户可以更新自己的档案
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 管理员可以插入新用户
CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ------------------------------------------------------
-- 3.2 wallets 表策略
-- ------------------------------------------------------

-- 用户可以查看自己的钱包
CREATE POLICY "Users can view own wallet"
    ON public.wallets FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pharmacist')
        )
    );

-- 只有系统可以更新钱包 (通过触发器或管理员)
CREATE POLICY "Admins and pharmacists can update wallets"
    ON public.wallets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pharmacist')
        )
    );

-- ------------------------------------------------------
-- 3.3 equipment 表策略
-- ------------------------------------------------------

-- 所有人都可以查看装备
CREATE POLICY "Anyone can view equipment"
    ON public.equipment FOR SELECT
    USING (true);

-- 只有管理员可以管理装备
CREATE POLICY "Admins can manage equipment"
    ON public.equipment FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ------------------------------------------------------
-- 3.4 inventory 表策略
-- ------------------------------------------------------

-- 用户可以查看自己的库存
CREATE POLICY "Users can view own inventory"
    ON public.inventory FOR SELECT
    USING (user_id = auth.uid());

-- 管理员和药师可以管理库存
CREATE POLICY "Admins and pharmacists can manage inventory"
    ON public.inventory FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pharmacist')
        )
    );

-- ------------------------------------------------------
-- 3.5 matches 表策略
-- ------------------------------------------------------

-- 药师可以创建比赛
CREATE POLICY "Pharmacists can create matches"
    ON public.matches FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'pharmacist'
        )
    );

-- 相关用户可以查看比赛
CREATE POLICY "Related users can view matches"
    ON public.matches FOR SELECT
    USING (
        -- 药师可以查看自己店铺的比赛
        (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'pharmacist' AND p.store_id = matches.store_id
            )
        ) OR
        -- 参赛长者可以查看
        (auth.uid() IN (red_team_elder_id, yellow_team_elder_id)) OR
        -- 长者的家属可以查看
        (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() 
                AND role = 'family' 
                AND linked_family_id IN (red_team_elder_id, yellow_team_elder_id)
            )
        ) OR
        -- 管理员可以查看所有
        (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- 药师可以更新比赛
CREATE POLICY "Pharmacists can update matches"
    ON public.matches FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'pharmacist' AND p.store_id = matches.store_id
        )
    );

-- ------------------------------------------------------
-- 3.6 match_ends 表策略
-- ------------------------------------------------------

-- 药师可以插入回合数据
CREATE POLICY "Pharmacists can insert match ends"
    ON public.match_ends FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            INNER JOIN public.matches m ON m.store_id = p.store_id
            WHERE p.id = auth.uid() AND p.role = 'pharmacist' AND m.id = match_id
        )
    );

-- 家属可以查看关联长者的比赛回合
CREATE POLICY "Families can view linked elder match ends"
    ON public.match_ends FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            INNER JOIN public.matches m ON (
                m.red_team_elder_id = p.linked_family_id OR 
                m.yellow_team_elder_id = p.linked_family_id
            )
            WHERE p.id = auth.uid() 
            AND p.role = 'family' 
            AND m.id = match_ends.match_id
        ) OR
        -- 药师可以查看自己店铺的回合
        EXISTS (
            SELECT 1 FROM public.profiles p
            INNER JOIN public.matches m ON m.store_id = p.store_id
            WHERE p.id = auth.uid() AND p.role = 'pharmacist' AND m.id = match_ends.match_id
        ) OR
        -- 参赛长者可以查看
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_ends.match_id 
            AND auth.uid() IN (m.red_team_elder_id, m.yellow_team_elder_id)
        ) OR
        -- 管理员可以查看所有
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 药师可以更新回合数据
CREATE POLICY "Pharmacists can update match ends"
    ON public.match_ends FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            INNER JOIN public.matches m ON m.store_id = p.store_id
            WHERE p.id = auth.uid() AND p.role = 'pharmacist' AND m.id = match_ends.match_id
        )
    );

-- =====================================================
-- 4. 存储桶设置 (需要在 Supabase Dashboard 中执行)
-- =====================================================

-- 注意：以下语句需要在 Supabase Dashboard 的 Storage 部分执行
-- 或使用 Supabase Management API

-- 创建 'evidence' 公共存储桶用于上传照片和视频
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('evidence', 'evidence', true);

-- 设置存储桶策略
-- CREATE POLICY "Anyone can view evidence files"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'evidence');

-- CREATE POLICY "Authenticated users can upload evidence"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--         bucket_id = 'evidence' AND
--         auth.role() = 'authenticated'
--     );

-- =====================================================
-- 5. 初始数据插入 (可选)
-- =====================================================

-- 插入一些示例装备
INSERT INTO public.equipment (name, description, stats, rarity) VALUES
    ('Speed Base', '提升滑行速度的基座', '{"speed": 15, "control": 5}', 'common'),
    ('Blocker Base', '增强防守能力的基座', '{"defense": 20, "stability": 10}', 'rare'),
    ('Precision Pusher', '提升精准度的推杆', '{"accuracy": 25, "control": 15}', 'epic'),
    ('Power Grip', '增加推力的握把', '{"power": 30, "speed": 10}', 'legendary');

-- =====================================================
-- 6. 创建视图和辅助函数
-- =====================================================

-- 创建比赛统计视图
CREATE OR REPLACE VIEW match_statistics AS
SELECT 
    m.id AS match_id,
    m.store_id,
    m.created_at,
    m.status,
    m.winner_color,
    p_red.id AS red_elder_id,
    p_yellow.id AS yellow_elder_id,
    COALESCE(SUM(CASE WHEN me.red_score > me.yellow_score THEN 1 ELSE 0 END), 0) AS red_ends_won,
    COALESCE(SUM(CASE WHEN me.yellow_score > me.red_score THEN 1 ELSE 0 END), 0) AS yellow_ends_won,
    COALESCE(SUM(me.red_score), 0) AS red_total_score,
    COALESCE(SUM(me.yellow_score), 0) AS yellow_total_score
FROM public.matches m
LEFT JOIN public.profiles p_red ON m.red_team_elder_id = p_red.id
LEFT JOIN public.profiles p_yellow ON m.yellow_team_elder_id = p_yellow.id
LEFT JOIN public.match_ends me ON m.id = me.match_id
GROUP BY m.id, p_red.id, p_yellow.id;

-- 获取用户积分排行榜的函数
CREATE OR REPLACE FUNCTION get_leaderboard(
    point_type TEXT DEFAULT 'global',  -- 'global' or 'local'
    limit_count INT DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    points BIGINT,
    rank BIGINT
) AS $$
BEGIN
    IF point_type = 'global' THEN
        RETURN QUERY
        SELECT 
            w.user_id,
            w.global_points AS points,
            RANK() OVER (ORDER BY w.global_points DESC) AS rank
        FROM public.wallets w
        ORDER BY w.global_points DESC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT 
            w.user_id,
            w.local_points AS points,
            RANK() OVER (ORDER BY w.local_points DESC) AS rank
        FROM public.wallets w
        ORDER BY w.local_points DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 迁移脚本完成
-- =====================================================

-- 使用说明：
-- 1. 在 Supabase Dashboard 中打开 SQL Editor
-- 2. 粘贴并执行此脚本
-- 3. 在 Storage 部分手动创建 'evidence' 存储桶
-- 4. 配置存储桶的访问策略
