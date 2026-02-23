require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function pruneElders() {
    const { data: elders, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, nickname')
        .eq('role', 'elder')
        .order('created_at', { ascending: true }); // 保留早期的資料

    if (error) {
        console.error('Error fetching elders:', error);
        return;
    }

    const targetId = '93c08e56-c71f-418d-8fb2-48885e00ff9a'; // 林萬海
    const linWanhai = elders.find(e => e.id === targetId);
    const others = elders.filter(e => e.id !== targetId);

    console.log(`Found ${elders.length} elders in total.`);
    if (!linWanhai) {
        console.log('Lin Wanhai not found! Aborting for safety.');
        return;
    }

    // 保留林萬海 + 19 其他長者 (總數 20)
    const keepOthers = others.slice(0, 19);
    const deleteOthers = others.slice(19);

    console.log(`Keeping Lin Wanhai + ${keepOthers.length} others.`);
    console.log(`Targeting to delete ${deleteOthers.length} test elders.`);

    let deletedCount = 0;
    for (const eld of deleteOthers) {
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(eld.id);
        if (delErr) {
            console.error(`Failed to delete user ${eld.id}:`, delErr.message);
        } else {
            deletedCount++;
        }
    }
    console.log(`Successfully deleted ${deletedCount} users from auth.users (cascades to profiles).`);
}

pruneElders();
