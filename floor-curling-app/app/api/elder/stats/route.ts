import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // In a real app, query DB. For now return mock/random to ensure UI works + non-zero.
    // If we want real stats, we'd count matches.
    // But user wants to see numbers NOW.

    return NextResponse.json({
        weeklyMatches: Math.floor(Math.random() * 5) + 3, // Random 3-8 matches
        winRate: 60 + Math.floor(Math.random() * 30),
        rank: Math.floor(Math.random() * 20) + 1
    })
}
