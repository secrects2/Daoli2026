-- 更新商品圖片為使用者上傳的真實照片

-- 1. 藍色戰袍 (Blue Team Shirt)
UPDATE products 
SET image_url = '/products/blue-shirt.png'
WHERE type = 'avatar' AND (name LIKE '%藍%' OR name LIKE '%Blue%' OR name LIKE '%戰袍%');

-- 2. 高速壺底 (Speed Base)
UPDATE products 
SET image_url = '/products/speed-base.png'
WHERE type = 'equipment' AND (name LIKE '%高速%' OR name LIKE '%Speed%');

-- 3. 穩定壺底 (Stable Base)
UPDATE products 
SET image_url = '/products/stable-base.png'
WHERE type = 'equipment' AND (name LIKE '%穩定%' OR name LIKE '%Stable%');

-- 4. 精準把手 (Precision Handle)
UPDATE products 
SET image_url = '/products/precision-handle.png'
WHERE type = 'equipment' AND (name LIKE '%精準%' OR name LIKE '%Precision%');

-- 驗證更新
SELECT name, image_url FROM products WHERE type IN ('avatar', 'equipment');
