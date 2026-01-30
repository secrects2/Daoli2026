const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // unquote
            }
        });
    }
} catch (e) { }

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspect() {
    console.log('🔍 Inspecting profiles table...');
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('No data in profiles, trying to insert dummy to see error or just trusting previous error.');
    }
}

inspect();
