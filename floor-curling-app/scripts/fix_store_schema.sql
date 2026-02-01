-- 修正 Stores 資料表：為 ID 欄位加入自動生成 UUID 的預設值
-- 請在 Supabase Dashboard 的 SQL Editor 中執行此指令

ALTER TABLE stores 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 如果 location 欄位確實遺失，也可以補上 (可選)
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS location TEXT;
