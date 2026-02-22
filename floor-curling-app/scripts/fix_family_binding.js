require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixFamilyBinding() {
    const TARGET_ID = '93c08e56-c71f-418d-8fb2-48885e00ff9a'; // 林萬海
    const FAMILY_BOUND_ID = 'f94dd394-ffb5-414c-bb4b-32db8217bb69'; // actions.ts definition

    const { data, error } = await supabase
        .from('profiles')
        .update({ linked_elder_id: TARGET_ID })
        .eq('id', FAMILY_BOUND_ID);

    if (error) {
        console.error('Error updating binding:', error);
    } else {
        console.log('Successfully re-bound family_bound to Wan-Hai Lin');
    }
}
fixFamilyBinding();
