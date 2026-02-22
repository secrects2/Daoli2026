require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkElders() {
    const { data: elders, error } = await supabase
        .from('profiles')
        .select('id, full_name, nickname, email, store_id')
        .eq('role', 'elder');

    if (error) {
        console.error('Error fetching elders:', error);
        return;
    }

    const linBobos = elders.filter(e =>
        (e.full_name && e.full_name.includes('林')) ||
        (e.nickname && e.nickname.includes('林')) ||
        (e.email && e.email.includes('elder'))
    );

    console.log(`Found ${linBobos.length} potential "林伯伯" matches:`);
    console.log(linBobos);

    if (linBobos.length > 0) {
        const elderIds = linBobos.map(e => e.id);
        const { data: wallets, error: wError } = await supabase
            .from('wallets')
            .select('*')
            .in('user_id', elderIds);

        if (wError) {
            console.error('Error fetching wallets:', wError);
            return;
        }

        console.log('\n--- Wallets Info ---');
        console.log(wallets);
    }
}

checkElders();
