require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspectSchema() {
    console.log('🔍 Inspecting profiles table...')

    // Just fetch one row to see the keys
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error:', error)
        return
    }

    if (data && data.length > 0) {
        console.log('✅ Columns found:', Object.keys(data[0]))
    } else {
        console.log('No data found, cannot infer columns easily via JS client without data.')
        // Fallback: Try to insert a dummy to see error? No, safer to just guess or look at creating script.
        // Or I can look at the migration file I created earlier?
    }
}

inspectSchema()
