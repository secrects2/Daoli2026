require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function forceBindUsers() {
    console.log('🔄 Starting force bind process...')

    // 1. Get Family User
    const { data: familyUsers } = await supabase.auth.admin.listUsers()
    const familyUser = familyUsers.users.find(u => u.email === 'family_test@example.com')
    if (!familyUser) {
        console.error('❌ Family user not found!')
        return
    }
    console.log('👨‍👩‍👧 Family ID:', familyUser.id)

    // 2. Get Elder User
    const elderUser = familyUsers.users.find(u => u.email === 'elder_test@example.com')
    if (!elderUser) {
        console.error('❌ Elder user not found!')
        return
    }
    console.log('👴 Elder ID:', elderUser.id)

    // 3. Update Profile
    console.log('🔄 Updating profile...')
    const { data, error } = await supabase
        .from('profiles')
        .update({ linked_elder_id: elderUser.id })
        .eq('id', familyUser.id)
        .select()

    if (error) {
        console.error('❌ Link failed:', error)
    } else {
        console.log('✅ Link successful! Updated profile:', data)
    }
}

forceBindUsers()
