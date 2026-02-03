
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function relinkFamily() {
    console.log('🔄 Re-linking Family to new Elder ID...');

    // 1. Get new Elder ID
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const elder = users.find(u => u.email === 'elder@daoli.com');
    const family = users.find(u => u.email === 'family_bound@daoli.com');

    if (!elder || !family) {
        console.error('❌ Could not find users.');
        return;
    }

    console.log(`   Elder ID: ${elder.id}`);
    console.log(`   Family ID: ${family.id}`);

    // 2. Update Family Profile
    const { error } = await supabase
        .from('profiles')
        .update({ linked_elder_id: elder.id })
        .eq('id', family.id);

    if (error) console.error('❌ Link failed:', error);
    else console.log('✅ Family re-linked successfully.');
}

relinkFamily();
