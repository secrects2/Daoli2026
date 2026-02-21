import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Utility to format date to YYYY-MM-DD
function formatDate(d) {
    return d.toISOString().split('T')[0]
}

// Generate a random number with a trend (mocking daily activity)
function generateData(base, variance, trend) {
    // trend is a slight daily increase/decrease multiplier
    const val = Math.floor(base + (Math.random() * variance * 2 - variance) + trend)
    return Math.max(0, val) // Keep it positive
}

async function main() {
    console.log('Fetching elders from the database...')
    const { data: elders, error: eldersError } = await supabase
        .from('profiles')
        .select('id, full_name, nickname')
        .eq('role', 'elder')

    if (eldersError) {
        console.error('Failed to fetch elders:', eldersError)
        process.exit(1)
    }

    if (!elders || elders.length === 0) {
        console.log('No elders found in the database.')
        return
    }

    console.log(`Found ${elders.length} elders. Generating 30 days of health data...`)

    const records = []
    const today = new Date()

    for (const elder of elders) {
        let currentSteps = 4000 + Math.random() * 2000 // Base steps 4000-6000

        // Generate data for the past 30 days
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today)
            d.setDate(today.getDate() - i)
            const dateStr = formatDate(d)

            // Slight upward trend for steps as an example
            currentSteps = generateData(currentSteps, 1500, 50)
            const steps = currentSteps
            // Heat Rate: avg between 60 - 90
            const activeMinutes = Math.floor((steps / 100) * (0.8 + Math.random() * 0.4))
            const heartRateAvg = 65 + Math.floor(Math.random() * 25) + (activeMinutes > 60 ? 5 : 0)

            // Calories: base BMR + active burn
            const caloriesBurned = 1400 + Math.floor(activeMinutes * 4.5) + Math.floor(Math.random() * 100)

            records.push({
                elder_id: elder.id,
                date: dateStr,
                steps,
                heart_rate_avg: heartRateAvg,
                calories_burned: caloriesBurned,
                active_minutes: activeMinutes
            })
        }
    }

    console.log(`Prepared ${records.length} records. Inserting into 'elder_health_daily'...`)

    // Split into chunks if there are many records
    const chunkSize = 500
    let inserted = 0

    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize)
        const { error } = await supabase
            .from('elder_health_daily')
            .upsert(chunk, { onConflict: 'elder_id, date' })

        if (error) {
            console.error('Error inserting data:', error)
            process.exit(1)
        }
        inserted += chunk.length
        console.log(`Inserted ${inserted} / ${records.length}...`)
    }

    console.log('✅ Health data seeded successfully!')
}

main().catch(console.error)
