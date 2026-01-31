const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupInteractions() {
    console.log('🔄 Setting up interactions table...')

    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS interactions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            sender_id UUID REFERENCES profiles(id),
            receiver_id UUID REFERENCES profiles(id),
            type TEXT NOT NULL, -- 'cheer', 'checkin'
            content TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            read BOOLEAN DEFAULT FALSE
        );

        -- Enable RLS
        ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

        -- Check if policies exist before creating (simple way: drop then create, or just ignore error)
        -- Policy: Users can view interactions they sent or received
        DROP POLICY IF EXISTS "Users can view own interactions" ON interactions;
        CREATE POLICY "Users can view own interactions" ON interactions
            FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

        -- Policy: Authenticated users can insert (send) interactions
        DROP POLICY IF EXISTS "Users can insert interactions" ON interactions;
        CREATE POLICY "Users can insert interactions" ON interactions
            FOR INSERT WITH CHECK (auth.uid() = sender_id);
            
        -- Policy: Receiver can update read status
        DROP POLICY IF EXISTS "Receiver can update read status" ON interactions;
        CREATE POLICY "Receiver can update read status" ON interactions
            FOR UPDATE USING (auth.uid() = receiver_id);
    `

    const { error } = await supabase.rpc('exec_sql', { sql_query: createTableSQL })

    // If rpc exec_sql doesn't exist (it's a custom helper), we might fail.
    // Let's assume the user has the 'exec_sql' function from previous context or we need to use direct SQL via dashboard.
    // Wait, the previous steps showed usage of `supabase-migration.sql` but not `exec_sql`.
    // Actually, I can't run DDL via JS client unless I have a specific RPC or use the postgres connection string.
    // BUT, since we have the `SUPABASE_SERVICE_ROLE_KEY`, we can use the `pg` library if installed, or...
    // Let's check package.json first. `pg` is installed!

    // We will use `pg` instead of supabase client for DDL.
}

// Switching to PG implementation below
console.log('Use run_command to execute node script using pg')
