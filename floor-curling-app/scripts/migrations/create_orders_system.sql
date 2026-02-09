-- =============================================
-- 訂單系統資料庫 Schema
-- 用於家屬商店 LINE Pay 付款功能
-- =============================================

-- 1. 訂單狀態 enum
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending',      -- 待付款
        'paid',         -- 已付款
        'processing',   -- 處理中
        'shipped',      -- 已出貨/已送達
        'completed',    -- 已完成
        'cancelled',    -- 已取消
        'refunded'      -- 已退款
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 訂單主表
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    buyer_id UUID NOT NULL REFERENCES profiles(id),
    recipient_id UUID NOT NULL REFERENCES profiles(id),
    status order_status DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'line_pay',
    payment_transaction_id VARCHAR(100),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 3. 訂單明細表
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_recipient_id ON orders(recipient_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 5. RLS 政策
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 購買者可查看自己的訂單
DROP POLICY IF EXISTS "Buyers can view own orders" ON orders;
CREATE POLICY "Buyers can view own orders" ON orders
    FOR SELECT USING (auth.uid() = buyer_id);

-- 購買者可建立訂單
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- 管理員可查看所有訂單
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 管理員可更新訂單狀態
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 訂單明細 RLS
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.buyer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create order items" ON order_items;
CREATE POLICY "Users can create order items" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.buyer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
CREATE POLICY "Admins can view all order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. 訂單編號生成函數
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    -- 格式: ORD-YYYYMMDD-XXXX (如: ORD-20260209-0001)
    SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           LPAD(COALESCE(
               (SELECT COUNT(*) + 1 FROM orders 
                WHERE created_at::DATE = CURRENT_DATE)::TEXT, 
               '1'), 4, '0')
    INTO new_number;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 7. 商品表新增新台幣價格欄位
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_twd DECIMAL(10,2);

-- 預設將積分價格轉換為新台幣 (可調整比率)
UPDATE products SET price_twd = price_points WHERE price_twd IS NULL;

-- =============================================
-- 完成提示
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '=== 訂單系統 Schema 建立完成 ===';
    RAISE NOTICE '- orders 表已建立';
    RAISE NOTICE '- order_items 表已建立';
    RAISE NOTICE '- RLS 政策已設定';
    RAISE NOTICE '- products.price_twd 欄位已新增';
END $$;
