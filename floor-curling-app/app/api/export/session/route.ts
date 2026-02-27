import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exportFramesToCSV, exportSessionSummaryToCSV, exportSessionToExcelXML, exportBatchSummaryToCSV, type SessionSummary } from '@/lib/data-export'

function jsonError(body: any, status: number = 400) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    })
}
/**
 * GET /api/export/session
 *
 * 数据导出 API 端点
 *
 * 参数：
 * - id:     训练 session ID（单笔导出）
 * - elderId: 长辈 ID（批量导出该长辈所有训练）
 * - from:   起始日期 (YYYY-MM-DD)
 * - to:     结束日期 (YYYY-MM-DD)
 * - format: 'csv' | 'excel'（默认 csv）
 * - type:   'frames' | 'summary'（默认 summary）
 */
/**
 * 将真实姓名去识别化，保留姓氏并替换名字
 * 规则：张三丰 -> 张O丰，李四 -> 李O，王大槌子 -> 王O子
 */
function anonymizeName(name: string | null | undefined): string {
    if (!name) return '未知';
    const trimmed = name.trim();
    if (trimmed.length <= 1) return trimmed;
    if (trimmed.length === 2) return `${trimmed[0]}O`;
    // 保留第一个字和最后一个字，中间全部替换为 'O'
    return `${trimmed[0]}${'O'.repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('id')
        const elderId = searchParams.get('elderId')
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        const format = searchParams.get('format') || 'csv'
        const type = searchParams.get('type') || 'summary'

        // 使用带 cookie 的 SSR client，确保能通过 RLS 策略
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

        // 验证登入身份（取代 Token 验证，更安全）
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return jsonError({ error: '请先登入后再进行数据导出' }, 401)
        }

        // 单笔 session 导出
        if (sessionId) {
            const { data: session, error } = await supabase
                .from('training_sessions')
                .select('*, profiles:elder_id(display_name)')
                .eq('id', sessionId)
                .single()

            if (error || !session) {
                return jsonError({ error: '找不到该训练记录' }, 404)
            }

            const summary: SessionSummary = {
                sessionId: session.id,
                elderId: session.elder_id,
                // 强制去识别化：剥离真实姓名
                elderName: anonymizeName(session.profiles?.display_name),
                sessionDate: new Date(session.created_at).toISOString().slice(0, 19),
                durationSeconds: session.duration_seconds || 0,
                metrics: session.metrics || {},
                frameCount: session.metrics?.throw_count || 0,
            }

            if (format === 'excel') {
                // Excel XML 格式 — 空帧数据（逐帧数据不存于DB）
                const xml = exportSessionToExcelXML(summary, [])
                return new Response(xml, {
                    headers: {
                        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
                        'Content-Disposition': `attachment; filename="boccia_report_${session.elder_id}_${new Date().toISOString().slice(0, 10)}.xml"`,
                    }
                })
            }

            // CSV 格式
            if (type === 'frames') {
                return jsonError({ error: '逐帧数据未存储于云端数据库（仅存放于前端设备内存），无法通过此接口进行历史导出。' }, 400)
            }
            const csv = exportSessionSummaryToCSV(summary)
            return new Response(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="boccia_summary_${session.elder_id}_${new Date().toISOString().slice(0, 10)}.csv"`,
                }
            })
        }

        // 批量导出 — 按长辈 ID + 日期范围
        if (elderId) {
            let query = supabase
                .from('training_sessions')
                .select('*, profiles:elder_id(display_name)')
                .eq('elder_id', elderId)
                .order('created_at', { ascending: false })

            if (from) query = query.gte('created_at', `${from}T00:00:00`)
            if (to) query = query.lte('created_at', `${to}T23:59:59`)

            const { data: sessions, error } = await query

            if (error || !sessions?.length) {
                return jsonError({ error: '找不到训练记录' }, 404)
            }

            const summaries: SessionSummary[] = sessions.map(s => ({
                sessionId: s.id,
                elderId: s.elder_id,
                // 强制去识别化：剥离真实姓名
                elderName: anonymizeName(s.profiles?.display_name),
                sessionDate: new Date(s.created_at).toISOString().slice(0, 19),
                durationSeconds: s.duration_seconds || 0,
                metrics: s.metrics || {},
                frameCount: s.metrics?.throw_count || 0,
            }))

            const csv = exportBatchSummaryToCSV(summaries)
            const dateRange = from && to ? `${from}_${to}` : new Date().toISOString().slice(0, 10)
            return new Response(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="boccia_batch_${elderId}_${dateRange}.csv"`,
                }
            })
        }

        return jsonError({
            error: '请提供 id 或 elderId 参数',
            usage: {
                single: '/api/export/session?id=<session_id>&format=csv|excel',
                batch: '/api/export/session?elderId=<elder_id>&from=2024-01-01&to=2024-12-31&format=csv',
            }
        }, 400)

    } catch (err: any) {
        console.error('Export API error:', err)
        return jsonError({ error: err.message || '导出失败' }, 500)
    }
}
