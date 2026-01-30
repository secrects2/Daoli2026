require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

// Use Anon key to simulate client-side behavior
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAccess() {
    console.log('🔐 Signing in as family_test@example.com...')
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'family_test@example.com',
        password: 'Test123456!'
    })

    if (loginError) {
        console.error('❌ Login failed:', loginError.message)
        return
    }
    console.log('✅ Logged in. User ID:', user.id)

    // 1. Fetch own profile
    console.log('📋 Fetching own profile...')
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, linked_elder_id')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error('❌ Failed to fetch own profile:', profileError.message)
        return
    }
    console.log('✅ Own profile:', profile)

    if (!profile.linked_elder_id) {
        console.error('⚠️ No linked_elder_id in profile! Binding is missing.')
        return
    }

    // 2. Try to fetch elder profile
    console.log(`👴 Attempting to fetch elder profile (${profile.linked_elder_id})...`)
    const { data: elder, error: elderError } = await supabase
        .from('profiles')
        .select('id, full_name, nickname')
        .eq('id', profile.linked_elder_id)
        .single()

    if (elderError) {
        console.error('❌ Failed to fetch elder profile:', elderError.message)
        console.log('💡 This confirms RLS blocks access to the elder profile.')
    } else if (!elder) {
        console.error('❌ Elder profile returned null (RLS hidden)')
    } else {
        console.log('✅ Successfully fetched elder profile:', elder)
    }
}

testAccess()
