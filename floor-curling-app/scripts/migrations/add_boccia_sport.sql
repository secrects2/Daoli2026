-- ============================================
-- 地板滾球 (Boccia) 多運動項目支援 Migration
-- ============================================
-- 執行環境：Supabase SQL Editor
-- 說明：擴充系統支援 Boccia 運動項目

-- ============================================
-- 1. 擴充 matches 表
-- ============================================

-- 新增運動類型欄位（預設 curling 保持向下相容）
ALTER TABLE matches ADD COLUMN IF NOT EXISTS sport_type TEXT DEFAULT 'curling';

-- Boccia 特有：目標球距離
ALTER TABLE matches ADD COLUMN IF NOT EXISTS target_distance FLOAT;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_matches_sport_type ON matches(sport_type);

-- ============================================
-- 2. 擴充 match_participants 的 team 約束
-- ============================================
-- 原本只允許 'red', 'yellow'，加入 'blue' 支援 Boccia
-- 先移除舊約束再建立新約束

ALTER TABLE match_participants DROP CONSTRAINT IF EXISTS match_participants_team_check;
ALTER TABLE match_participants ADD CONSTRAINT match_participants_team_check 
    CHECK (team IN ('red', 'yellow', 'blue'));

-- ============================================
-- 3. 建立 boccia_equipment 表
-- ============================================

CREATE TABLE IF NOT EXISTS boccia_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    elder_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ball_set_name TEXT NOT NULL DEFAULT '標準組',
    hardness TEXT CHECK (hardness IN ('soft', 'medium', 'hard')) DEFAULT 'medium',
    color TEXT DEFAULT 'red',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE boccia_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can manage boccia equipment" ON boccia_equipment
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

CREATE POLICY "Elders can view their own boccia equipment" ON boccia_equipment
    FOR SELECT
    USING (elder_id = auth.uid());

-- ============================================
-- 4. 建立 training_sessions 表（AI 復健數據）
-- ============================================

CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    elder_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    sport_type TEXT DEFAULT 'boccia',
    session_date TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INT,
    -- JSONB 可儲存各類指標：
    -- Boccia: { elbow_rom: 155, trunk_stability: 12, throw_count: 8 }
    -- Curling: { push_force: 80, slide_distance: 5.2 }
    metrics JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can manage training sessions" ON training_sessions
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

CREATE POLICY "Elders can view their own training sessions" ON training_sessions
    FOR SELECT
    USING (elder_id = auth.uid());

-- ============================================
-- 5. 擴充 RPC：支援多運動比賽提交
-- ============================================

CREATE OR REPLACE FUNCTION calculate_and_record_match_result(
    p_store_id UUID,
    p_red_elder_id UUID,
    p_yellow_elder_id UUID,
    p_ends JSONB,
    p_operator_id UUID DEFAULT NULL,
    p_sport_type TEXT DEFAULT 'curling',
    p_target_distance FLOAT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match_id UUID;
    v_red_total INT := 0;
    v_yellow_total INT := 0;
    v_winner_color TEXT;
    v_winner_id UUID;
    v_loser_id UUID;
    v_evidence_url TEXT;
    v_end_record JSONB;
    -- Boccia 使用 blue 取代 yellow
    v_second_color TEXT;
    v_win_global INT;
    v_win_local INT;
    v_lose_global INT;
    v_lose_local INT;
BEGIN
    -- 根據運動類型設定隊伍顏色和積分規則
    IF p_sport_type = 'boccia' THEN
        v_second_color := 'blue';
        -- Boccia 積分（可調整）
        v_win_global := 120;  v_win_local := 60;
        v_lose_global := 15;  v_lose_local := 8;
    ELSE
        v_second_color := 'yellow';
        -- Curling 積分
        v_win_global := 100;  v_win_local := 50;
        v_lose_global := 10;  v_lose_local := 5;
    END IF;

    -- 1. 建立比賽紀錄
    INSERT INTO matches (store_id, red_team_elder_id, yellow_team_elder_id, status, sport_type, target_distance, created_at)
    VALUES (p_store_id, p_red_elder_id, p_yellow_elder_id, 'in_progress', p_sport_type, p_target_distance, NOW())
    RETURNING id INTO v_match_id;

    -- 2. 處理每回合
    FOR v_end_record IN SELECT * FROM jsonb_array_elements(p_ends)
    LOOP
        INSERT INTO match_ends (
            match_id, end_number, red_score, yellow_score,
            house_snapshot_url, vibe_video_url
        )
        VALUES (
            v_match_id,
            (v_end_record->>'endNumber')::INT,
            (v_end_record->>'redScore')::INT,
            (v_end_record->>'yellowScore')::INT,
            v_end_record->>'houseSnapshotUrl',
            v_end_record->>'vibeVideoUrl'
        );

        v_red_total := v_red_total + (v_end_record->>'redScore')::INT;
        v_yellow_total := v_yellow_total + (v_end_record->>'yellowScore')::INT;

        IF v_evidence_url IS NULL THEN
            v_evidence_url := v_end_record->>'houseSnapshotUrl';
        END IF;
    END LOOP;

    -- 3. 決定勝負
    IF v_red_total > v_yellow_total THEN
        v_winner_color := 'red';
        v_winner_id := p_red_elder_id;
        v_loser_id := p_yellow_elder_id;
    ELSIF v_yellow_total > v_red_total THEN
        v_winner_color := v_second_color;
        v_winner_id := p_yellow_elder_id;
        v_loser_id := p_red_elder_id;
    ELSE
        v_winner_color := NULL;
        v_winner_id := NULL;
        v_loser_id := NULL;
    END IF;

    -- 4. 更新比賽狀態
    UPDATE matches
    SET winner_color = v_winner_color, status = 'completed', completed_at = NOW()
    WHERE id = v_match_id;

    -- 5. 發放積分
    IF v_winner_color = 'red' THEN
        PERFORM update_player_wallet(p_red_elder_id, v_win_global, v_win_local, 'match_win', v_match_id, p_store_id, v_evidence_url,
            format('%s比賽勝利獎勵 (%s:%s)', CASE WHEN p_sport_type = 'boccia' THEN '滾球' ELSE '地壺' END, v_red_total, v_yellow_total));
        PERFORM update_player_wallet(p_yellow_elder_id, v_lose_global, v_lose_local, 'match_participate', v_match_id, p_store_id, v_evidence_url,
            format('%s比賽參與獎勵 (%s:%s)', CASE WHEN p_sport_type = 'boccia' THEN '滾球' ELSE '地壺' END, v_red_total, v_yellow_total));
    ELSIF v_winner_color IS NOT NULL THEN
        PERFORM update_player_wallet(p_yellow_elder_id, v_win_global, v_win_local, 'match_win', v_match_id, p_store_id, v_evidence_url,
            format('%s比賽勝利獎勵 (%s:%s)', CASE WHEN p_sport_type = 'boccia' THEN '滾球' ELSE '地壺' END, v_red_total, v_yellow_total));
        PERFORM update_player_wallet(p_red_elder_id, v_lose_global, v_lose_local, 'match_participate', v_match_id, p_store_id, v_evidence_url,
            format('%s比賽參與獎勵 (%s:%s)', CASE WHEN p_sport_type = 'boccia' THEN '滾球' ELSE '地壺' END, v_red_total, v_yellow_total));
    ELSE
        -- 平手
        PERFORM update_player_wallet(p_red_elder_id, v_lose_global, v_lose_local, 'match_participate', v_match_id, p_store_id, v_evidence_url,
            format('%s比賽參與獎勵 (平手 %s:%s)', CASE WHEN p_sport_type = 'boccia' THEN '滾球' ELSE '地壺' END, v_red_total, v_yellow_total));
        PERFORM update_player_wallet(p_yellow_elder_id, v_lose_global, v_lose_local, 'match_participate', v_match_id, p_store_id, v_evidence_url,
            format('%s比賽參與獎勵 (平手 %s:%s)', CASE WHEN p_sport_type = 'boccia' THEN '滾球' ELSE '地壺' END, v_red_total, v_yellow_total));
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', v_match_id,
        'sport_type', p_sport_type,
        'red_total', v_red_total,
        'yellow_total', v_yellow_total,
        'winner_color', v_winner_color,
        'winner_id', v_winner_id
    );
END;
$$;

-- ============================================
-- 完成提示
-- ============================================
DO $$ BEGIN RAISE NOTICE '✅ Boccia 多運動支援 Migration 完成！'; END $$;
