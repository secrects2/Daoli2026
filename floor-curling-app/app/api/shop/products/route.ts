import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase Client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('price_points', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, products })
    } catch (error: any) {
        console.error('Fetch products error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch products' },
            { status: 500 }
        )
    }
}
