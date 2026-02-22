// 執行 SQL 將新產品寫入 Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const products = [
    {
        id: 'a1b2c3d4-1111-4000-a000-000000000001',
        name: '特製高背支撐座椅',
        description: '道里國際出品。含輪椅骨盆固定帶，符合地板滾球競賽規則，維持投擲重心穩定。',
        price_points: 3000,
        image_url: '/products/support-chair.webp',
        type: 'equipment',
        is_active: true,
        data: { brand: '道里國際', category: 'hardware', prescription: 'trunk_unstable' }
    },
    {
        id: 'a1b2c3d4-2222-4000-a000-000000000002',
        name: '輔助投擲軌道 (Boccia Ramp)',
        description: '道里國際出品。符合 IPC BC3 級別標準，含頭杖/口杖，專為無法自主持球伸展的選手設計。',
        price_points: 5000,
        image_url: '/products/boccia-ramp.webp',
        type: 'equipment',
        is_active: true,
        data: { brand: '道里國際', category: 'hardware', prescription: 'limited_extension' }
    },
    {
        id: 'a1b2c3d4-3333-4000-a000-000000000003',
        name: '高硬度規格地板滾球',
        description: '道里國際出品。硬度較高的滾球在賽道上動能損耗較低，可用較小力量達到高球速。',
        price_points: 2500,
        image_url: '/products/hard-boccia-balls.webp',
        type: 'equipment',
        is_active: true,
        data: { brand: '道里國際', category: 'hardware', prescription: 'slow_velocity' }
    },
    {
        id: 'a1b2c3d4-4444-4000-a000-000000000004',
        name: '專利非變性二型膠原蛋白 (UC-II) + 鈣',
        description: '宇勝生技出品。提供關節軟骨支撐與骨質基礎，強化整體結構穩定度。',
        price_points: 1800,
        image_url: '/products/ucii-calcium.webp',
        type: 'equipment',
        is_active: true,
        data: { brand: '宇勝生技', category: 'nutrition', prescription: 'trunk_unstable' }
    },
    {
        id: 'a1b2c3d4-5555-4000-a000-000000000005',
        name: '高濃度 Omega-3 (EPA/DHA) 魚油',
        description: '宇勝生技出品。降低體內發炎反應，有助於減緩關節活動度受限引發的不適感。',
        price_points: 1500,
        image_url: '/products/omega3-fish-oil.webp',
        type: 'equipment',
        is_active: true,
        data: { brand: '宇勝生技', category: 'nutrition', prescription: 'limited_extension' }
    },
    {
        id: 'a1b2c3d4-6666-4000-a000-000000000006',
        name: '支鏈胺基酸 (BCAA) 乳清蛋白',
        description: '宇勝生技出品。促進肌肉蛋白質合成，提升高齡復健者出球瞬間的基礎肌耐力。',
        price_points: 1200,
        image_url: '/products/bcaa-protein.webp',
        type: 'equipment',
        is_active: true,
        data: { brand: '宇勝生技', category: 'nutrition', prescription: 'slow_velocity' }
    }
];

async function run() {
    console.log('🔄 寫入 6 項新產品到 Supabase...');

    for (const product of products) {
        const { error } = await supabase
            .from('products')
            .upsert(product, { onConflict: 'id' });

        if (error) {
            console.error(`❌ ${product.name}: ${error.message}`);
        } else {
            console.log(`✅ ${product.name}`);
        }
    }

    // 驗證
    const { data, error } = await supabase
        .from('products')
        .select('name, data')
        .not('data->prescription', 'is', null);

    console.log(`\n📊 共 ${data?.length || 0} 項 AI 處方產品已在資料庫中`);
}
run();
