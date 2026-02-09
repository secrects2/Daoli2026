-- 更新所有商品圖片（使用者上傳的真實照片）
-- 請在 Supabase SQL Editor 執行此腳本

-- === 外觀類 (Avatar) ===

-- 藍色戰袍 / 經典藍衫
UPDATE products 
SET image_url = '/products/blue-shirt.jpg'
WHERE type = 'avatar' AND (name LIKE '%藍%' OR name LIKE '%Blue%');

-- 黃金戰袍 (Golden Jersey)
UPDATE products 
SET image_url = '/products/gold-jersey.jpg'
WHERE type = 'avatar' AND (name LIKE '%黃金%' OR name LIKE '%Golden%');

-- 冠軍披風 (Champion Cape)
UPDATE products 
SET image_url = '/products/champion-cape.jpg'
WHERE type = 'avatar' AND (name LIKE '%冠軍%' OR name LIKE '%披風%');

-- === 裝備類 (Equipment) ===

-- 高速壺底 (Speed Base)
UPDATE products 
SET image_url = '/products/speed-base.png'
WHERE type = 'equipment' AND (name LIKE '%高速%' OR name LIKE '%Speed%');

-- 穩定底座 (Stable Base)
UPDATE products 
SET image_url = '/products/stable-base.jpg'
WHERE type = 'equipment' AND (name LIKE '%穩定%' OR name LIKE '%Stable%');

-- 精準把手 (Precision Handle)
UPDATE products 
SET image_url = '/products/precision-handle.jpg'
WHERE type = 'equipment' AND (name LIKE '%精準%' OR name LIKE '%Precision%');

-- === 徽章類 (Badge) ===

-- 新手徽章 (Newbie Badge)
UPDATE products 
SET image_url = '/products/newbie-badge.jpg'
WHERE type = 'badge' AND (name LIKE '%新手%' OR name LIKE '%Newbie%');

-- 百場老將徽章 (Veteran Badge)
UPDATE products 
SET image_url = '/products/veteran-badge.jpg'
WHERE type = 'badge' AND (name LIKE '%百場%' OR name LIKE '%老將%');

-- 十連勝徽章 (Ten Win Badge)
UPDATE products 
SET image_url = '/products/ten-win-badge.jpg'
WHERE type = 'badge' AND (name LIKE '%十連勝%' OR name LIKE '%連勝%');

-- === 驗證更新 ===
SELECT name, type, image_url FROM products ORDER BY type, name;
