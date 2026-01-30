const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const serviceRoleKey = 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applySql() {
    const sqlPath = process.argv[2];
    if (!sqlPath) {
        console.error('Please provide a SQL file path');
        process.exit(1);
    }

    try {
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        console.log(`🚀 Applying SQL from ${sqlPath}...`);

        // Supabase-js doesn't have a direct 'query' method exposed usually, 
        // but often people use a custom RPC or just use pg client directly.
        // CHECK: Do we have a way to run raw SQL?
        // If not, we might fail unless we use the Postgres connection string.
        // Since we don't have the connection string (only URL/Key), we rely on Supabase typically having an RPC for this or using migration tool.
        // Wait, 'supabase-js' client doesn't support raw SQL execution unless via RPC.

        // Let's assume there is an 'exec_sql' RPC function if the user set it up, OR we have to rely on `pg` library if we had connection string.
        // The user's env file might have DB URL.

        // HACK: Attempt to use a known RPC if it exists, otherwise we might be stuck.
        // Actually, looking at previous context, user ran `supabase-migration.sql` via "Supabase Dashboard".
        // Use might not have a way to run SQL from here easily.

        // Alternative: If the user has `psql` or similar installed? No.

        // LET'S TRY to assume we can use a "exec" or "run_sql" rpc if it exists.
        // OR we use the `pg` library if installed. `npm list pg`?
        // Checking `package.json` would be good.

        // If all else fails, I will instruct the user to run it in the dashboard.
        // BUT, I should try to fix it automatically if I can.

        // Let's check if there is an RPC for running SQL.
        const { error: rpcError } = await supabase.rpc('exec_sql', { sql: sqlContent });

        if (rpcError) {
            console.log('⚠️ RPC `exec_sql` failed (maybe it does not exist):', rpcError.message);
            console.log('ℹ️ Attempting to use PG client if available...');

            try {
                // Try to load pg
                const { Client } = require('pg');
                // We need a connection string. Usually in .env.local
                require('dotenv').config({ path: '.env.local' });

                const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
                if (!connectionString) {
                    throw new Error('No DATABASE_URL found in .env.local');
                }

                const client = new Client({
                    connectionString: connectionString,
                });
                await client.connect();
                await client.query(sqlContent);
                await client.end();
                console.log('✅ Applied SQL via PG client successfully.');

            } catch (pgError) {
                console.error('❌ Failed to apply SQL via PG client:', pgError.message);
                console.log('\n👇 PLEASE RUN THE FOLLOWING SQL MANUALY IN SUPABASE DASHBOARD -> SQL EDITOR:\n');
                console.log(sqlContent);
            }
        } else {
            console.log('✅ SQL applied via RPC successfully.');
        }

    } catch (e) {
        console.error('Error reading/executing file:', e);
    }
}

applySql();
