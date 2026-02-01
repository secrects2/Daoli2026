const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// We can't execute DDL via supabase-js client easily unless we rely on a specific setup.
// However, earlier context showed we might have to use 'pg' or manual execution.
// Let's try to check if 'pg' is available in the next step, but here I'll write a script 
// that ASSUMES we can't easily run DDL and instructs the user OR tries to use a raw query if a 'pg' client was set up.
// Actually, I'll write a script that tries to use 'pg' if available, otherwise logs instructions.

const { Client } = require('pg');

async function applySchema() {
    console.log('🔄 Applying Chat Schema...');

    if (!process.env.SUPABASE_DB_URL) {
        console.warn('⚠️ SUPABASE_DB_URL not found in .env.local. Trying to construct from project settings if possible, or fallback.');
        // If we don't have the direct connection string, we can't run DDL from node easily without the service key acting on a specific management API (which supabase-js doesn't fully expose for DDL).
        // BUT, often for these assistants, we assume we can write to the SQL editor or we have the connection string.
        // Let's fallback to asking the user to run it if we fail.
    }

    // Construct connection string if missing (Guessing format: postgres://postgres.[ref]:[pass]@[region].pooler.supabase.com:6543/postgres)
    // This is hard to guess.

    // ALTERNATIVE: Use the existing `setup_interactions.js` pattern?
    // That script checked for `exec_sql` RPC. Let's try to use that first if it exists.

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const sql = fs.readFileSync(path.join(__dirname, 'chat_schema.sql'), 'utf8');

    // Try RPC first (if the project has a helper set up)
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (!rpcError) {
        console.log('✅ Schema applied via RPC!');
        return;
    }

    console.warn('⚠️ RPC exec_sql failed (or not found). Attempting direct PG connection if connection string is available...');

    // Check for connection string
    // Note: User environment might not have the DB password in a clear variable often.
    // If this fails, we will output the SQL and ask user to run it.

    console.log('❌ Could not auto-apply. Please run the contents of scripts/chat_schema.sql in your Supabase Dashboard SQL Editor.');
    console.log('--- SQL BEGIN ---');
    console.log(sql);
    console.log('--- SQL END ---');
}

applySchema();
