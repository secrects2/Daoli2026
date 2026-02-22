require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkElders() {
    const { data: elders, error } = await supabase
        .from('profiles')
        .select('id, full_name, nickname, store_id, created_at')

    const linBobos = elders.filter(e =>
        (e.full_name && (e.full_name.includes('林') || e.full_name.includes('林伯伯'))) ||
        (e.nickname && (e.nickname.includes('林') || e.nickname.includes('林伯伯')))
    );

    console.log(`Found ${linBobos.length} potential "林伯伯" matches:\n`);

    if (linBobos.length > 0) {
        const elderIds = linBobos.map(e => e.id);
        const { data: wallets } = await supabase
            .from('wallets')
            .select('*')
            .in('user_id', elderIds);

        // 联合资料列印
        linBobos.forEach(elder => {
            const wallet = wallets.find(w => w.user_id === elder.id);
            console.log(`ID: ${elder.id}`);
            console.log(`FullName/Nickname: ${elder.full_name} / ${elder.nickname}`);
            console.log(`Store: ${elder.store_id}`);
            if (wallet) {
                console.log(`Wallet -> Global: ${wallet.global_points}, Local: ${wallet.local_points}`);
            } else {
                console.log(`Wallet -> NONE`);
            }
            console.log('----------------------------');
        });
    }
}

checkElders();
