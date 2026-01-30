require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create client with Anon key to simulate real user behavior
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function deepDiag() {
    console.log('🕵️ Starting Deep Diagnostic...')

    // 1. Authenticate
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'family_test@example.com',
        password: 'Test123456!'
    })

    if (loginError) {
        console.error('❌ Login error:', loginError.message)
        return
    }
    console.log('✅ Logged in as:', user.id)

    // 2. Check Own Profile (Basic RLS check)
    const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('id, role, linked_elder_id')
        .eq('id', user.id)
        .single()

    if (myProfileError) console.error('❌ Fetch own profile failed:', myProfileError.message)
    else console.log('✅ Own profile:', myProfile)

    if (!myProfile?.linked_elder_id) {
        console.error('❌ No linked_elder_id found in profile. Binding is missing.')
        return
    }

    const elderId = myProfile.linked_elder_id
    console.log('👴 Target Elder ID:', elderId)

    // 3. Test RPC Function (if it exists)
    // This tests if the function works purely as logic
    const { data: isLinked, error: rpcError } = await supabase
        .rpc('is_linked_family', { target_elder_id: elderId })

    if (rpcError) {
        console.error('❌ RPC Function check failed:', rpcError.message)
        console.log('💡 Does the function "is_linked_family" exist?')
    } else {
        console.log(`✅ RPC Check Result: ${isLinked} (Should be true)`)
    }

    // 4. Test Elder Profile Access (RLS Policy check)
    const { data: elderProfile, error: elderError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', elderId)
        .single()

    if (elderError) {
        console.error('❌ Elder Profile Access Blocked:', elderError.message)
    } else if (!elderProfile) {
        console.error('❌ Elder Profile returned NULL (RLS hidden)')
    } else {
        console.log('✅ Elder Profile Accessible:', elderProfile.id)
    }

    // 5. Check if recursive policy issue persists
    // Sometimes policies conflict. Let's try to list profiles generally
    const { data: listProfiles, error: listError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', elderId)

    if (listError) console.error('❌ List profiles error:', listError.message)
    else console.log(`✅ List profiles found ${listProfiles.length} rows`)
}

deepDiag()
