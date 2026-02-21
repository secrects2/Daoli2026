const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    // 1. 找出 training_sessions 中所有 elder_id
    const { data: sessions } = await supabase
        .from('training_sessions')
        .select('id, elder_id')
        .order('created_at', { ascending: false })
        .limit(10);

    const sessionIds = [...new Set((sessions || []).map(s => s.elder_id))];
    console.log('training_sessions elder_ids:', sessionIds);

    // 2. 找 elder@daoli.com 的 ID
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const elderUser = users.find(u => u.email === 'elder@daoli.com');
    console.log('elder@daoli.com ID:', elderUser?.id);

    // 3. 用 elder@daoli.com 的 ID 更新所有 training_sessions
    if (elderUser && sessions && sessions.length > 0) {
        const alreadyCorrect = sessions.every(s => s.elder_id === elderUser.id);
        if (alreadyCorrect) {
            console.log('OK - all sessions already point to correct elder');
        } else {
            console.log('MISMATCH! Updating training_sessions...');
            const oldElderId = sessionIds[0];
            const { data, error } = await supabase
                .from('training_sessions')
                .update({ elder_id: elderUser.id })
                .eq('elder_id', oldElderId);

            if (error) console.error('Update failed:', error);
            else console.log('Updated! All sessions now point to elder@daoli.com');

            // Verify
            const { data: check } = await supabase
                .from('training_sessions')
                .select('id, elder_id')
                .eq('elder_id', elderUser.id);
            console.log('Verification - sessions for elder@daoli.com:', check?.length);
        }
    }
}
run();
