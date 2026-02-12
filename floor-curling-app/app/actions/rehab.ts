'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface SaveRehabSessionInput {
    elderId: string
    matchId?: string
    sportType: string
    durationSeconds: number
    metrics: Record<string, any>
    notes?: string
}

/**
 * Server Action: 儲存復健分析 session 到 training_sessions 表
 * 
 * 驗證藥師身分後，將 AI 分析的 ROM/軀幹穩定度等數據
 * 與 elder_id / match_id 關聯寫入資料庫。
 */
export async function saveRehabSession(input: SaveRehabSessionInput): Promise<{ success: boolean; error?: string; sessionId?: string }> {
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

    // 1. 驗證用戶身分（必須是 pharmacist 或 admin）
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        return { success: false, error: '未登入或驗證失敗' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['pharmacist', 'admin'].includes(profile.role)) {
        return { success: false, error: '權限不足：只有藥師或管理員可以儲存分析數據' }
    }

    // 2. 驗證 elder 存在
    const { data: elder } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', input.elderId)
        .eq('role', 'elder')
        .single()

    if (!elder) {
        return { success: false, error: '找不到指定的長輩' }
    }

    // 3. 寫入 training_sessions
    const { data: session, error: insertError } = await supabase
        .from('training_sessions')
        .insert({
            elder_id: input.elderId,
            match_id: input.matchId || null,
            sport_type: input.sportType,
            duration_seconds: input.durationSeconds,
            metrics: input.metrics,
            notes: input.notes || `AI 姿態分析 - ${elder.full_name || '長輩'}`,
        })
        .select('id')
        .single()

    if (insertError) {
        console.error('儲存 training session 失敗:', insertError)
        return { success: false, error: insertError.message }
    }

    return { success: true, sessionId: session.id }
}
