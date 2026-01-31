-- Digital Store Schema Migration

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price_points INT NOT NULL CHECK (price_points >= 0),
    image_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('equipment', 'avatar', 'badge')),
    is_active BOOLEAN DEFAULT true,
    data JSONB DEFAULT '{}', -- Extra attributes like speed bonus, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    obtained_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'equipped', 'consumed')),
    data JSONB DEFAULT '{}' -- Instance data if needed
);

-- 3. Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 4. Policies

-- Products: Everyone can view active products
CREATE POLICY "Everyone can view active products"
ON products FOR SELECT
USING (is_active = true);

-- Products: Only Admin can manage
CREATE POLICY "Admin can manage products"
ON products FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Inventory: Users can view their own inventory
CREATE POLICY "Users can view own inventory"
ON inventory FOR SELECT
USING (auth.uid() = user_id OR 
       EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND linked_elder_id = inventory.user_id)); 
       -- Family members can see linked elder's inventory

-- Inventory: Only System (Service Role) can insert/update via API usually, 
-- but let's allow users to update status (equip) if we implement that client-side later.
-- For purchase, we use a Transaction RPC or separate API with Service Role, so RLS for insert might not be critical for public.
-- Let's keep it strict: No direct insert by users.

-- 5. Seed Data
INSERT INTO products (name, description, price_points, image_url, type, data)
VALUES 
('高速壺底 (Speed Base)', '減少摩擦力，讓壺跑得更遠！', 500, 'https://api.iconify.design/game-icons:rocket-thruster.svg', 'equipment', '{"speed_bonus": 10}'),
('精準把手 (Precision Handle)', '增加旋轉控制力，投擲更精準。', 800, 'https://api.iconify.design/game-icons:crosshair.svg', 'equipment', '{"accuracy_bonus": 10}'),
('黃金戰袍 (Golden Jersey)', '榮耀的象徵，穿上它震攝全場。', 2000, 'https://api.iconify.design/game-icons:shirt.svg', 'avatar', '{}'),
('新手徽章 (Newbie Badge)', '剛開始冒險的證明。', 0, 'https://api.iconify.design/game-icons:medal.svg', 'badge', '{}')
ON CONFLICT DO NOTHING;
