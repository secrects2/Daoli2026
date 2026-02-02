import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    return NextResponse.json({
        NEXT_PUBLIC_SUPABASE_URL: url ? `${url.slice(0, 8)}...${url.slice(-5)}` : 'MISSING',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? `${anonKey.slice(0, 5)}... (Length: ${anonKey.length})` : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: serviceKey ? 'DEFINED (Hidden)' : 'MISSING',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV || 'unknown'
    })
}
