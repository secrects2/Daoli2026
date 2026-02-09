-- 更新第二批商品圖片（使用者上傳）

-- 1. 黃金戰袍 (Golden Jersey)
UPDATE products 
SET image_url = '/products/gold-jersey.jpg'
WHERE type = 'avatar' AND (name LIKE '%黃金%' OR name LIKE '%Golden%');

-- 2. 冠軍披風 (Champion Cape)
UPDATE products 
SET image_url = '/products/champion-cape.png'
WHERE type = 'avatar' AND (name LIKE '%冠軍%' OR name LIKE '%Champion%');

-- 3. 新手徽章 (Newbie Badge)
UPDATE products 
SET image_url = '/products/newbie-badge.jpg'
WHERE type = 'badge' AND (name LIKE '%新手%' OR name LIKE '%Newbie%');

-- 4. 百場老將徽章 (Veteran Badge)
UPDATE products 
SET image_url = '/products/veteran-badge.jpg'
WHERE type = 'badge' AND (name LIKE '%百場%' OR name LIKE '%Veteran%' OR name LIKE '%老將%');

-- 5. 十連勝徽章 (Ten Win Badge) - 使用最後一張圖
UPDATE products 
SET image_url = '/products/ten-win-badge.png'
WHERE type = 'badge' AND (name LIKE '%十連勝%' OR name LIKE '%10%' OR name LIKE '%Ten%');

-- 驗證更新
SELECT name, image_url FROM products;
