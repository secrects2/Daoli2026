import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// Helper to verify pharmacist or admin
async function verifyStoreAccess(matchId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { user: null, match: null, error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', user.id)
        .single()

    if (!profile || !['pharmacist', 'admin'].includes(profile.role)) {
        return { user: null, match: null, error: 'Forbidden' }
    }

    // Get match
    const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

    if (!match) {
        return { user, match: null, error: 'Match not found' }
    }

    // Check store access (pharmacists can only edit their store's matches)
    if (profile.role === 'pharmacist' && profile.store_id !== match.store_id) {
        return { user, match: null, error: 'Forbidden' }
    }

    return { user, match, profile, error: null }
}

// GET: 獲取比賽詳情
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Get ends
    const { data: ends } = await supabase
        .from('match_ends')
        .select('*')
        .eq('match_id', id)
        .order('end_number')

    // Get participants
    const { data: participants } = await supabase
        .from('match_participants')
        .select('*, elder:profiles!elder_id(id, full_name, nickname)')
        .eq('match_id', id)

    return NextResponse.json({
        match,
        ends: ends || [],
        participants: participants || []
    })
}

// PUT: 更新比賽
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { user, match, error } = await verifyStoreAccess(id)

    if (error) {
        return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 })
    }

    const body = await request.json()
    const { winner_color, red_score, yellow_score, total_ends, ends } = body

    // Update match
    const updateData: any = {}
    if (winner_color !== undefined) updateData.winner_color = winner_color
    if (red_score !== undefined) updateData.red_score = red_score
    if (yellow_score !== undefined) updateData.yellow_score = yellow_score
    if (total_ends !== undefined) updateData.total_ends = total_ends

    if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabaseAdmin
            .from('matches')
            .update(updateData)
            .eq('id', id)

        if (updateError) {
            console.error('Error updating match:', updateError)
            return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
        }
    }

    // Update ends if provided
    if (ends && Array.isArray(ends)) {
        // Delete existing ends
        await supabaseAdmin
            .from('match_ends')
            .delete()
            .eq('match_id', id)

        // Insert new ends
        if (ends.length > 0) {
            const endsToInsert = ends.map((end: any) => ({
                match_id: id,
                end_number: end.end_number,
                red_score: end.red_score,
                yellow_score: end.yellow_score
            }))

            const { error: endsError } = await supabaseAdmin
                .from('match_ends')
                .insert(endsToInsert)

            if (endsError) {
                console.error('Error updating ends:', endsError)
            }
        }
    }

    return NextResponse.json({ success: true })
}

// DELETE: 刪除比賽（軟刪除）
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { user, match, error } = await verifyStoreAccess(id)

    if (error) {
        return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 })
    }

    // Soft delete - set status to 'deleted'
    const { error: deleteError } = await supabaseAdmin
        .from('matches')
        .update({ status: 'deleted' })
        .eq('id', id)

    if (deleteError) {
        console.error('Error deleting match:', deleteError)
        return NextResponse.json({ error: 'Failed to delete match' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
