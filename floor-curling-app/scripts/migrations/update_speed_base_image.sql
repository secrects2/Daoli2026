-- 圖片優化後更新所有 .png 路徑為 .jpg
-- products 表
UPDATE products SET image_url = '/products/speed-base.jpg' WHERE image_url = '/products/speed-base.png';

-- 更新 equipment 圖片路徑（如果有被引用的話）
UPDATE products SET image_url = REPLACE(image_url, '.png', '.jpg') WHERE image_url LIKE '/images/equipment/%.png';
