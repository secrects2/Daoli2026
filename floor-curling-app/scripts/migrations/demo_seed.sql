-- 演示數據種子腳本
-- 用於專案演示的完整測試數據
-- 執行前請確認已執行基礎 schema 建立

-- =============================================
-- 1. 門店數據 (Stores)
-- =============================================

INSERT INTO stores (id, name, status) VALUES
('TPE-XINYI', '台北信義店', 'active'),
('TPE-DAAN', '台北大安店', 'active'),
('TPE-ZHONGSHAN', '台北中山店', 'active'),
('NTC-BANQIAO', '新北板橋店', 'active'),
('KHH-LINGYA', '高雄苓雅店', 'active')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    status = EXCLUDED.status;

-- =============================================
-- 2. 商品數據 (Products) - 擴充版
-- =============================================

-- 先刪除測試商品（如有）
DELETE FROM products WHERE name LIKE '%測試%' OR name LIKE '%演示%';

INSERT INTO products (id, name, description, price_points, image_url, type, is_active, data) VALUES
-- 裝備類
(gen_random_uuid(), '高速壺底 (Speed Base)', '減少摩擦力，讓壺跑得更遠！', 500, 'https://api.iconify.design/game-icons:rocket-thruster.svg', 'equipment', true, '{"speed_bonus": 10}'),
(gen_random_uuid(), '精準把手 (Precision Handle)', '增加旋轉控制力，投擲更精準。', 800, 'https://api.iconify.design/game-icons:crosshair.svg', 'equipment', true, '{"accuracy_bonus": 10}'),
(gen_random_uuid(), '穩定底座 (Stable Base)', '增加穩定性，降低失誤率。', 600, 'https://api.iconify.design/game-icons:stone-block.svg', 'equipment', true, '{"stability_bonus": 15}'),
-- 外觀類
(gen_random_uuid(), '黃金戰袍 (Golden Jersey)', '榮耀的象徵，穿上它震攝全場。', 2000, 'https://api.iconify.design/game-icons:shirt.svg', 'avatar', true, '{}'),
(gen_random_uuid(), '經典藍衫', '簡約大方的經典款式。', 300, 'https://api.iconify.design/game-icons:polo-shirt.svg', 'avatar', true, '{}'),
(gen_random_uuid(), '冠軍披風', '只有真正的王者才配得上。', 5000, 'https://api.iconify.design/game-icons:cape.svg', 'avatar', true, '{}'),
-- 徽章類
(gen_random_uuid(), '新手徽章', '剛開始冒險的證明。', 0, 'https://api.iconify.design/game-icons:medal.svg', 'badge', true, '{}'),
(gen_random_uuid(), '十連勝徽章', '連續獲得10場勝利！', 1000, 'https://api.iconify.design/game-icons:trophy.svg', 'badge', true, '{}'),
(gen_random_uuid(), '百場老將', '參與超過100場比賽的榮耀證明。', 800, 'https://api.iconify.design/game-icons:laurel-crown.svg', 'badge', true, '{}')
ON CONFLICT DO NOTHING;

-- =============================================
-- 3. 創建測試用戶 (使用 Service Role 執行)
-- 注意：這些 UUID 需要與 auth.users 中的用戶對應
-- 以下假設 profiles 表已有用戶，我們更新其 store_id
-- =============================================

-- 更新現有店長的 store_id（如果有的話）
-- 更新特定演示店長 account (如果存在)
-- (Email column missing in profiles, skipping email-based update)

-- 更新其他未分配店長的店長 (Fallback)
UPDATE profiles 
SET store_id = 'TPE-XINYI' 
WHERE role = 'pharmacist' AND store_id IS NULL;

-- 關鍵修正：將所有長輩分配到 TPE-XINYI 店鋪，確保店長能看到他們
UPDATE profiles 
SET store_id = 'TPE-XINYI' 
WHERE role = 'elder';

-- 確保所有長輩都有錢包
INSERT INTO wallets (user_id, global_points, local_points)
SELECT id, 
    FLOOR(RANDOM() * 500 + 100)::INT, -- 100-600 賽事分
    FLOOR(RANDOM() * 300 + 50)::INT   -- 50-350 兌換分
FROM profiles 
WHERE role = 'elder' 
AND id NOT IN (SELECT user_id FROM wallets WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- 4. 比賽數據 (Matches) - 演示用
-- =============================================

-- 獲取前兩個 elder 用於創建比賽
DO $$
DECLARE
    v_elder1 UUID;
    v_elder2 UUID;
    v_elder3 UUID;
    v_elder4 UUID;
    v_store TEXT := 'TPE-XINYI';
    v_match_id UUID;
    i INT;
BEGIN
    -- 獲取長輩 ID
    SELECT id INTO v_elder1 FROM profiles WHERE role = 'elder' LIMIT 1 OFFSET 0;
    SELECT id INTO v_elder2 FROM profiles WHERE role = 'elder' LIMIT 1 OFFSET 1;
    SELECT id INTO v_elder3 FROM profiles WHERE role = 'elder' LIMIT 1 OFFSET 2;
    SELECT id INTO v_elder4 FROM profiles WHERE role = 'elder' LIMIT 1 OFFSET 3;
    
    -- 如果有長輩，創建歷史比賽
    IF v_elder1 IS NOT NULL AND v_elder2 IS NOT NULL THEN
        -- 創建 5 場歷史比賽
        FOR i IN 1..5 LOOP
            INSERT INTO matches (
                id, store_id, red_team_elder_id, yellow_team_elder_id, 
                winner_color, status, created_at, completed_at
            ) VALUES (
                gen_random_uuid(),
                v_store,
                CASE WHEN i % 2 = 0 THEN v_elder1 ELSE v_elder2 END,
                CASE WHEN i % 2 = 0 THEN v_elder2 ELSE v_elder1 END,
                CASE WHEN i % 3 = 0 THEN 'red'::team_color WHEN i % 3 = 1 THEN 'yellow'::team_color ELSE NULL END,
                'completed',
                NOW() - (i || ' days')::INTERVAL,
                NOW() - (i || ' days')::INTERVAL + INTERVAL '30 minutes'
            ) RETURNING id INTO v_match_id;
            
            -- 為每場比賽添加 3 局
            INSERT INTO match_ends (match_id, end_number, red_score, yellow_score, house_snapshot_url)
            VALUES 
                (v_match_id, 1, FLOOR(RANDOM() * 4)::INT, FLOOR(RANDOM() * 4)::INT, 'https://via.placeholder.com/400x300?text=End1'),
                (v_match_id, 2, FLOOR(RANDOM() * 4)::INT, FLOOR(RANDOM() * 4)::INT, 'https://via.placeholder.com/400x300?text=End2'),
                (v_match_id, 3, FLOOR(RANDOM() * 4)::INT, FLOOR(RANDOM() * 4)::INT, 'https://via.placeholder.com/400x300?text=End3');
                
            -- 添加參與者（新版多人比賽）
            INSERT INTO match_participants (match_id, elder_id, team)
            VALUES 
                (v_match_id, CASE WHEN i % 2 = 0 THEN v_elder1 ELSE v_elder2 END, 'red'),
                (v_match_id, CASE WHEN i % 2 = 0 THEN v_elder2 ELSE v_elder1 END, 'yellow')
            ON CONFLICT DO NOTHING;
        END LOOP;
        
        RAISE NOTICE '已創建 5 場演示比賽';
    ELSE
        RAISE NOTICE '無法創建比賽：需要至少 2 位長輩';
    END IF;
END $$;

-- =============================================
-- 5. 積分交易記錄 (Point Transactions)
-- =============================================

INSERT INTO point_transactions (wallet_id, amount, type, description, created_at)
SELECT 
    w.id,
    CASE 
        WHEN RANDOM() > 0.7 THEN -FLOOR(RANDOM() * 100 + 50)::INT  -- 消費
        ELSE FLOOR(RANDOM() * 150 + 50)::INT  -- 獲得
    END,
    CASE WHEN RANDOM() > 0.7 THEN 'spent' ELSE 'earned' END,
    CASE 
        WHEN RANDOM() > 0.7 THEN '兌換商品'
        WHEN RANDOM() > 0.5 THEN '比賽勝利獎勵'
        WHEN RANDOM() > 0.3 THEN '比賽參與獎勵'
        ELSE '每日簽到獎勵'
    END,
    NOW() - (FLOOR(RANDOM() * 30)::INT || ' days')::INTERVAL
FROM wallets w
CROSS JOIN generate_series(1, 5) -- 每個錢包 5 筆交易
ORDER BY RANDOM()
LIMIT 50
ON CONFLICT DO NOTHING;

-- =============================================
-- 6. 用戶互動記錄 (Interactions)
-- =============================================

INSERT INTO user_interactions (user_id, interaction_type, data, created_at)
SELECT 
    p.id,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'check_in'
        WHEN RANDOM() > 0.4 THEN 'match_result'
        ELSE 'daily_activity'
    END,
    jsonb_build_object(
        'source', 'demo_seed',
        'timestamp', NOW()
    ),
    NOW() - (FLOOR(RANDOM() * 14)::INT || ' days')::INTERVAL
FROM profiles p, generate_series(1, 3) AS gs
WHERE p.role = 'elder';

-- =============================================
-- 7. 庫存數據 (Inventory) - Elder Shop
-- =============================================

INSERT INTO inventory (user_id, product_id, status, data)
SELECT 
    p.id,
    pr.id,
    CASE WHEN RANDOM() > 0.8 THEN 'equipped' ELSE 'active' END,
    '{}'
FROM profiles p
CROSS JOIN products pr
WHERE p.role = 'elder' 
AND pr.price_points < 1000 -- 只擁有便宜的商品
AND RANDOM() > 0.7 -- 30% 機率擁有
LIMIT 20
ON CONFLICT DO NOTHING;

-- =============================================
-- 8. 通知數據 (Notifications) - Family Portal
-- =============================================

INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT 
    p.id,
    CASE 
        WHEN RANDOM() > 0.6 THEN '比賽結果通知'
        WHEN RANDOM() > 0.3 THEN '積分變動通知'
        ELSE '系統公告' 
    END,
    CASE 
        WHEN RANDOM() > 0.6 THEN '您的長輩剛剛完成了一場精彩的比賽！'
        WHEN RANDOM() > 0.3 THEN '您的長輩獲得了 50 點獎勵積分。'
        ELSE '地壺球大賽將於下週舉行，歡迎報名。' 
    END,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'match_result'
        WHEN RANDOM() > 0.3 THEN 'points_update'
        ELSE 'system' 
    END::notification_type,
    (RANDOM() > 0.5), -- 隨機已讀/未讀
    NOW() - (FLOOR(RANDOM() * 7)::INT || ' days')::INTERVAL
FROM profiles p
CROSS JOIN generate_series(1, 3)
WHERE p.role = 'family'
ON CONFLICT DO NOTHING;

-- =============================================
-- 9. 家屬綁定 (Family-Elder Links) - Family Portal
-- =============================================

-- 嘗試將孤兒家屬與孤兒長輩綁定
DO $$
DECLARE
    v_family RECORD;
    v_elder RECORD;
BEGIN
    FOR v_family IN SELECT id FROM profiles WHERE role = 'family' AND linked_elder_id IS NULL LOOP
        -- 找一個還沒被這個家屬綁定的長輩
        SELECT id INTO v_elder FROM profiles WHERE role = 'elder' ORDER BY RANDOM() LIMIT 1;
        
        IF v_elder IS NOT NULL THEN
            -- 更新 profiles (legacy)
            UPDATE profiles SET linked_elder_id = v_elder.id WHERE id = v_family.id;
            
            -- 更新 links table (new)
            INSERT INTO family_elder_links (family_id, elder_id, is_primary)
            VALUES (v_family.id, v_elder.id, true)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- =============================================
-- 10. 更新統計數據
-- =============================================

-- 確保所有長輩 profile 有完整資料
UPDATE profiles 
SET 
    full_name = COALESCE(full_name, '測試長輩 ' || SUBSTR(id::TEXT, 1, 4)),
    nickname = COALESCE(nickname, '阿公/阿嬤')
WHERE role = 'elder' AND (full_name IS NULL OR full_name = '');

-- 確保所有店長 profile 有完整資料
UPDATE profiles 
SET 
    full_name = COALESCE(full_name, '店長 ' || SUBSTR(id::TEXT, 1, 4)),
    store_id = COALESCE(store_id, 'TPE-XINYI')
WHERE role = (
    SELECT role FROM profiles 
    WHERE role = 'pharmacist' AND store_id IS NULL 
    LIMIT 1
);

-- =============================================
-- 完成提示
-- =============================================
DO $$
DECLARE
    v_store_count INT;
    v_elder_count INT;
    v_match_count INT;
    v_product_count INT;
    v_notification_count INT;
BEGIN
    SELECT COUNT(*) INTO v_store_count FROM stores;
    SELECT COUNT(*) INTO v_elder_count FROM profiles WHERE role = 'elder';
    SELECT COUNT(*) INTO v_match_count FROM matches;
    SELECT COUNT(*) INTO v_product_count FROM products WHERE is_active = true;
    SELECT COUNT(*) INTO v_notification_count FROM notifications;
    
    RAISE NOTICE '=== 演示數據種子完成 ===';
    RAISE NOTICE '門店數量: %', v_store_count;
    RAISE NOTICE '長輩數量: %', v_elder_count;
    RAISE NOTICE '比賽數量: %', v_match_count;
    RAISE NOTICE '商品數量: %', v_product_count;
    RAISE NOTICE '通知數量: %', v_notification_count;
END $$;
