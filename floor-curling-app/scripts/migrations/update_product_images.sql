-- 更新商品圖片為高品質圖片
-- 執行此腳本來替換醜陋的黑色圖標

-- 徽章類商品 - 使用獎牌/徽章圖片
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400&h=300&fit=crop'
WHERE type = 'badge' AND name LIKE '%新手%';

UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1569183091671-696402586b9c?w=400&h=300&fit=crop'
WHERE type = 'badge' AND name LIKE '%冠軍%';

UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=300&fit=crop'
WHERE type = 'badge' AND name LIKE '%傳奇%';

-- 服裝類商品 - 使用運動服飾圖片
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=300&fit=crop'
WHERE type = 'avatar' AND name LIKE '%藍%';

UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=300&fit=crop'
WHERE type = 'avatar' AND name LIKE '%紅%';

UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=300&fit=crop'
WHERE type = 'avatar' AND name LIKE '%經典%';

-- 裝備類商品 - 使用運動裝備圖片
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=300&fit=crop'
WHERE type = 'equipment' AND name LIKE '%手套%';

UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
WHERE type = 'equipment' AND name LIKE '%推桿%';

UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=300&fit=crop'
WHERE type = 'equipment';

-- 通用更新：如果上面沒有匹配到，使用通用圖片
UPDATE products 
SET image_url = CASE 
    WHEN type = 'badge' THEN 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400&h=300&fit=crop'
    WHEN type = 'avatar' THEN 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=300&fit=crop'
    WHEN type = 'equipment' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
    ELSE 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=300&fit=crop'
END
WHERE image_url IS NULL OR image_url LIKE '%placeholder%' OR image_url LIKE '%svg%';

-- 驗證更新
SELECT id, name, type, image_url FROM products;
