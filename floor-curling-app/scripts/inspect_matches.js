
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTable() {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table empty, cannot infer columns easily. Trying insert to fail...');
            // Try dummy insert to see error keys? No, better to assume or use valid method if empty.
            // If empty, I'll rely on my memory of seed script which I just read.
            console.log('Table is empty.');
        }
    }
}

inspectTable();
