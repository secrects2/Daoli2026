require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTables() {
    console.log('🔍 Checking tables...')

    // Check transactions
    const { error: matchError } = await supabase.from('transactions').select('count', { count: 'exact', head: true })

    if (matchError) {
        if (matchError.code === '42P01') { // undefined_table
            console.log('❌ transactions table: MISSING')
        } else {
            console.log('❓ transactions table error:', matchError.message)
        }
    } else {
        console.log('✅ transactions table: EXISTS')
    }
}

checkTables()
