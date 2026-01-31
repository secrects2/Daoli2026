const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
    console.log('📦 Setting up Storage Buckets...');

    // 1. Create 'evidence' bucket
    const { data, error } = await supabase
        .storage
        .createBucket('evidence', {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime']
        });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('✅ Bucket "evidence" already exists.');
        } else {
            console.error('❌ Error creating bucket:', error);
        }
    } else {
        console.log('✅ Bucket "evidence" created successfully.');
    }

    // 2. (Optional) We could update policies here via SQL if we had access, 
    // but for now relying on the fact that Service Role can bypass RLS, 
    // and Public Bucket allows reading. 
    // Writing from client (Pharmacist) needs RLS policies if using client-side uploading.
    // BUT: The app implementation `app/actions/match.ts` uses "use server"; 
    // Server Actions run on the server! 
    // If `app/actions/match.ts` initializes Supabase with `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`, 
    // it might assume RLS allows insert.
    // HOWEVER, server actions are secure environment. We can use the SERVICE_ROLE_KEY in the server action 
    // to bypass RLS for uploads! This is better than setting up complex RLS.

    // Let's check `app/actions/match.ts` content again.
    // It uses `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`.
    // This means it acts as an ANON user (or authenticated user if cookie is passed, but the snippet didn't show cookie handling).
    // Ideally, for backend-ish operations like this, we should use Service Role Key or properly handle Auth cookies.

    // Wait, `createClientComponentClient` is for client components. 
    // `app/actions/match.ts` imports `createClient` from `@supabase/supabase-js`.

    console.log('ℹ️  Note: Ensure Server Actions use Service Role or correct Auth context for uploads.');
}

setupStorage();
