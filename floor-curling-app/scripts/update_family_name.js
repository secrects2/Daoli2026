require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateFamilyName() {
    const FAMILY_BOUND_ID = 'f94dd394-ffb5-414c-bb4b-32db8217bb69';
    const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: '林萬海的家屬', nickname: '林萬海的家屬' })
        .eq('id', FAMILY_BOUND_ID);

    if (error) {
        console.error('Error updating name:', error);
    } else {
        console.log('Successfully updated family_bound name to 林萬海的家屬');
    }
}
updateFamilyName();
