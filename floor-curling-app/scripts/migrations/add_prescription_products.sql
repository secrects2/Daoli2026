-- =============================================
-- 新增 AI 處方推薦產品（道里國際 + 宇勝生技）
-- =============================================

-- 硬體輔具（道里國際）
INSERT INTO products (id, name, description, price_points, image_url, type, is_active, data) VALUES
(
    'a1b2c3d4-1111-4000-a000-000000000001',
    '特製高背支撐座椅',
    '道里國際出品。含輪椅骨盆固定帶，符合地板滾球競賽規則，維持投擲重心穩定。',
    3000,
    '/products/support-chair.webp',
    'equipment',
    true,
    '{"brand": "道里國際", "category": "hardware", "prescription": "trunk_unstable"}'
),
(
    'a1b2c3d4-2222-4000-a000-000000000002',
    '輔助投擲軌道 (Boccia Ramp)',
    '道里國際出品。符合 IPC BC3 級別標準，含頭杖/口杖，專為無法自主持球伸展的選手設計。',
    5000,
    '/products/boccia-ramp.webp',
    'equipment',
    true,
    '{"brand": "道里國際", "category": "hardware", "prescription": "limited_extension"}'
),
(
    'a1b2c3d4-3333-4000-a000-000000000003',
    '高硬度規格地板滾球',
    '道里國際出品。硬度較高的滾球在賽道上動能損耗較低，可用較小力量達到高球速。',
    2500,
    '/products/hard-boccia-balls.webp',
    'equipment',
    true,
    '{"brand": "道里國際", "category": "hardware", "prescription": "slow_velocity"}'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_points = EXCLUDED.price_points,
    image_url = EXCLUDED.image_url,
    data = EXCLUDED.data;

-- 保健品（宇勝生技）
INSERT INTO products (id, name, description, price_points, image_url, type, is_active, data) VALUES
(
    'a1b2c3d4-4444-4000-a000-000000000004',
    '專利非變性二型膠原蛋白 (UC-II) + 鈣',
    '宇勝生技出品。提供關節軟骨支撐與骨質基礎，強化整體結構穩定度。',
    1800,
    '/products/ucii-calcium.webp',
    'equipment',
    true,
    '{"brand": "宇勝生技", "category": "nutrition", "prescription": "trunk_unstable"}'
),
(
    'a1b2c3d4-5555-4000-a000-000000000005',
    '高濃度 Omega-3 (EPA/DHA) 魚油',
    '宇勝生技出品。降低體內發炎反應，有助於減緩關節活動度受限引發的不適感。',
    1500,
    '/products/omega3-fish-oil.webp',
    'equipment',
    true,
    '{"brand": "宇勝生技", "category": "nutrition", "prescription": "limited_extension"}'
),
(
    'a1b2c3d4-6666-4000-a000-000000000006',
    '支鏈胺基酸 (BCAA) 乳清蛋白',
    '宇勝生技出品。促進肌肉蛋白質合成，提升高齡復健者出球瞬間的基礎肌耐力。',
    1200,
    '/products/bcaa-protein.webp',
    'equipment',
    true,
    '{"brand": "宇勝生技", "category": "nutrition", "prescription": "slow_velocity"}'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_points = EXCLUDED.price_points,
    image_url = EXCLUDED.image_url,
    data = EXCLUDED.data;

-- 驗證
SELECT id, name, data->>'brand' as brand, data->>'category' as category, data->>'prescription' as prescription
FROM products
WHERE data->>'prescription' IS NOT NULL
ORDER BY data->>'prescription', data->>'category';
