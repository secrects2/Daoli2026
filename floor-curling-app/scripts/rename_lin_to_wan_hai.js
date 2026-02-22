require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const TARGET_ID = '93c08e56-c71f-418d-8fb2-48885e00ff9a';

    // 1. 更名林伯伯为林万海
    const { data: elder, error } = await supabase
        .from('profiles')
        .update({
            full_name: '林萬海',
            nickname: '林萬海'
        })
        .eq('id', TARGET_ID)
        .select()
        .single();

    if (error) {
        console.error('Error renaming:', error);
    } else {
        console.log('Successfully renamed to: ', elder.full_name);
    }
}
run();
