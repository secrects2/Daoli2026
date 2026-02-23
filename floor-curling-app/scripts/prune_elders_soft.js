require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function pruneEldersSoft() {
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

    console.log(`Found ${elders.length} active elders in total.`);
    if (!linWanhai) {
        console.log('Lin Wanhai not found! Aborting for safety.');
        return;
    }

    // 保留林萬海 + 19 其他長者 (總數 20)
    const keepOthers = others.slice(0, 19);
    const hideOthers = others.slice(19);

    console.log(`Keeping Lin Wanhai + ${keepOthers.length} others.`);
    console.log(`Targeting to archive/hide ${hideOthers.length} test elders.`);

    if (hideOthers.length === 0) {
        console.log('No extra elders to hide.');
        return;
    }

    const idsToHide = hideOthers.map(e => e.id);

    const { data, error: updErr } = await supabaseAdmin
        .from('profiles')
        .update({
            role: 'archived_elder',
            full_name: '(已封存測試資料)'
        })
        .in('id', idsToHide);

    if (updErr) {
        console.error('Failed to soft delete (archive) elders:', updErr);
    } else {
        console.log(`Successfully archived ${hideOthers.length} test typical elders.`);
    }
}

pruneEldersSoft();
