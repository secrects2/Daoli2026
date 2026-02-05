-- 檢查 stores 表數據和策略
SELECT count(*) as store_count FROM stores;

-- 檢查是否有任何數據
SELECT * FROM stores LIMIT 5;

-- 檢查 RLS 策略
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from
  pg_policies
where
  tablename = 'stores';
