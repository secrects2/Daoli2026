const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const users = [
    { email: 'admin@daoli.com', password: 'daoli_admin_2026', role: 'admin', name: 'System Admin' },
    { email: 'pharmacist@daoli.com', password: 'password123', role: 'pharmacist', name: 'Demo Pharmacist' },
    { email: 'family@daoli.com', password: 'password123', role: 'family', name: 'Demo Family' },
    { email: 'elder@daoli.com', password: 'password123', role: 'elder', name: 'Demo Elder' }
];

async function seedUsers() {
    for (const u of users) {
        console.log(`Processing ${u.email}...`);

        let userId;

        // 1. Create User
        const { data, error } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.name }
        });

        if (error) {
            if (error.message.includes('already registered') || error.status === 422) {
                console.log('   User exists, finding ID...');
                const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
                const existing = list?.users.find(x => x.email === u.email);
                if (existing) {
                    userId = existing.id;
                    // Reset password to ensure test credentials work
                    await supabase.auth.admin.updateUserById(userId, { password: u.password, email_confirm: true });
                }
            } else {
                console.error('   Error creating:', error.message);
                continue;
            }
        } else {
            userId = data.user.id;
            console.log('   Created new user.');
        }

        if (userId) {
            // 2. Set Role
            const { error: roleError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    role: u.role,
                    full_name: u.name,
                    updated_at: new Date().toISOString()
                });

            if (roleError) console.error('   Error setting role:', roleError);
            else console.log(`   ✅ Role set to [${u.role}]`);
        }
    }
}

seedUsers();
