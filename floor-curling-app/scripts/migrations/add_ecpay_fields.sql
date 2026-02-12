-- 為 orders 表加入 ECPay 相關欄位
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'ecpay';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ecpay_trade_no TEXT;

-- 建立索引以加速綠界回傳時的查詢
CREATE INDEX IF NOT EXISTS idx_orders_ecpay_trade_no ON orders(ecpay_trade_no);
