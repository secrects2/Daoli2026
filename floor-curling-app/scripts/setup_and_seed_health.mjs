import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Step 1: Create the table via REST SQL endpoint (Management API)
async function createTable() {
    console.log('Step 1: Creating elder_health_daily table via Management API...')

    // Extract project ref from URL
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

    const sql = `
    CREATE TABLE IF NOT EXISTS public.elder_health_daily (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      elder_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
      date date NOT NULL,
      steps integer DEFAULT 0,
      heart_rate_avg integer DEFAULT 0,
      calories_burned integer DEFAULT 0,
      active_minutes integer DEFAULT 0,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE(elder_id, date)
    );

    ALTER TABLE public.elder_health_daily ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own health data" ON public.elder_health_daily;
    CREATE POLICY "Users can view their own health data" ON public.elder_health_daily
      FOR SELECT USING (
        auth.uid() = elder_id OR 
        EXISTS (SELECT 1 FROM family_elder_links WHERE family_elder_links.family_id = auth.uid() AND family_elder_links.elder_id = elder_health_daily.elder_id) OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('pharmacist', 'admin'))
      );

    DROP POLICY IF EXISTS "Service role can insert health data" ON public.elder_health_daily;
    CREATE POLICY "Service role can insert health data" ON public.elder_health_daily
      FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role can update health data" ON public.elder_health_daily;
    CREATE POLICY "Service role can update health data" ON public.elder_health_daily
      FOR UPDATE USING (true);

    NOTIFY pgrst, 'reload schema';
  `

    // Try using the Supabase SQL endpoint
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: sql })
    })

    // If RPC doesn't work, try the pg-meta endpoint
    if (!res.ok) {
        console.log('RPC method failed, trying pg-meta SQL query endpoint...')

        const metaRes = await fetch(`${supabaseUrl}/pg/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ query: sql })
        })

        if (!metaRes.ok) {
            console.log('pg-meta also failed. Trying direct table creation via insert test...')
            // As a last resort, let's just try inserting directly - if the table was created
            // by the user, this will work. If not, we'll get a clear error.
            const { error: testError } = await supabase
                .from('elder_health_daily')
                .select('id')
                .limit(1)

            if (testError) {
                console.error('\n❌ Table "elder_health_daily" does not exist yet!')
                console.error('Please run the following SQL in your Supabase Dashboard > SQL Editor:\n')
                console.error(sql)
                console.error('\nAfter running the SQL, execute this script again.')
                process.exit(1)
            }
        }
    }

    console.log('✅ Table check passed!')

    // Wait a moment for schema cache to update
    console.log('Waiting 2 seconds for schema cache reload...')
    await new Promise(r => setTimeout(r, 2000))
}

// Step 2: Seed data
function formatDate(d) {
    return d.toISOString().split('T')[0]
}

function generateData(base, variance, trend) {
    const val = Math.floor(base + (Math.random() * variance * 2 - variance) + trend)
    return Math.max(0, val)
}

async function seedData() {
    console.log('\nStep 2: Fetching elders...')
    const { data: elders, error } = await supabase
        .from('profiles')
        .select('id, full_name, nickname')
        .eq('role', 'elder')

    if (error || !elders?.length) {
        console.error('Failed to fetch elders:', error)
        process.exit(1)
    }

    console.log(`Found ${elders.length} elders. Generating 30 days of health data...`)

    const records = []
    const today = new Date()

    for (const elder of elders) {
        let currentSteps = 4000 + Math.random() * 4000

        for (let i = 29; i >= 0; i--) {
            const d = new Date(today)
            d.setDate(today.getDate() - i)

            currentSteps = generateData(currentSteps, 1500, 50)
            const steps = Math.floor(currentSteps)
            const activeMinutes = Math.floor((steps / 100) * (0.8 + Math.random() * 0.4))
            const heartRateAvg = 60 + Math.floor(Math.random() * 25) + (activeMinutes > 60 ? 5 : 0)
            const caloriesBurned = 200 + Math.floor(activeMinutes * 4.5) + Math.floor(Math.random() * 100)

            records.push({
                elder_id: elder.id,
                date: formatDate(d),
                steps,
                heart_rate_avg: heartRateAvg,
                calories_burned: caloriesBurned,
                active_minutes: activeMinutes,
            })
        }
    }

    console.log(`Prepared ${records.length} records. Inserting...`)

    const chunkSize = 500
    let inserted = 0

    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize)
        const { error: insertError } = await supabase
            .from('elder_health_daily')
            .upsert(chunk, { onConflict: 'elder_id,date' })

        if (insertError) {
            console.error('Insert error:', insertError)
            process.exit(1)
        }
        inserted += chunk.length
        process.stdout.write(`\r  Inserted ${inserted} / ${records.length}`)
    }

    console.log('\n✅ Health data seeded successfully!')
}

async function main() {
    await createTable()
    await seedData()
}

main().catch(console.error)
