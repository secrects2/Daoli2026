-- 更新百場老將徽章圖片路徑
-- 使用者已更新 public/products/veteran-badge.jpg

UPDATE products 
SET image_url = '/products/veteran-badge.jpg'
WHERE name LIKE '%百場%' OR name LIKE '%老將%';

-- 驗證更新結果
SELECT id, name, image_url FROM products WHERE name LIKE '%百場%' OR name LIKE '%老將%';
