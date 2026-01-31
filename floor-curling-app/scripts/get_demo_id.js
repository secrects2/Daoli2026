const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getElderId() {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    const elder = users.users.find(u => u.email === 'demo_elder@example.com');

    if (elder) {
        console.log(`ELDER_ID:${elder.id}`);
    } else {
        console.log('ELDER_NOT_FOUND');
    }
}

getElderId();
