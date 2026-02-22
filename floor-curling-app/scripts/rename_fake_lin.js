require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function renameElders() {
    const { data: elders, error } = await supabase
        .from('profiles')
        .select('id, full_name, nickname');

    if (error) {
        console.error('Error fetching elders:', error);
        return;
    }

    const TARGET_ELDER_ID = '93c08e56-c71f-418d-8fb2-48885e00ff9a';

    const linBobos = elders.filter(e =>
        e.id !== TARGET_ELDER_ID &&
        ((e.full_name && e.full_name.includes('林')) ||
            (e.nickname && e.nickname.includes('林')))
    );

    console.log(`Found ${linBobos.length} fake "林" matches to rename:\n`);

    for (const elder of linBobos) {
        let newFullName = elder.full_name;
        let newNickname = elder.nickname;

        if (newFullName && !newFullName.includes('(停用)')) {
            newFullName = `${newFullName} (停用)`;
        }
        if (newNickname && !newNickname.includes('(停用)')) {
            newNickname = `${newNickname} (停用)`;
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ full_name: newFullName, nickname: newNickname })
            .eq('id', elder.id);

        if (updateError) {
            console.error(`Failed to update ${elder.id}:`, updateError);
        } else {
            console.log(`Updated ${elder.full_name} -> ${newFullName}`);
        }
    }
    console.log('Update finished.');
}

renameElders();
