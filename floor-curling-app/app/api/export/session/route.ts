import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exportFramesToCSV, exportSessionSummaryToCSV, exportSessionToExcelXML, exportBatchSummaryToCSV, type SessionSummary } from '@/lib/data-export'

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
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('id')
        const elderId = searchParams.get('elderId')
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        const format = searchParams.get('format') || 'csv'
        const type = searchParams.get('type') || 'summary'

        // 初始化 Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: '数据库配置缺失' }, { status: 500 })
        }
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 单笔 session 导出
        if (sessionId) {
            const { data: session, error } = await supabase
                .from('training_sessions')
                .select('*, profiles:elder_id(display_name)')
                .eq('id', sessionId)
                .single()

            if (error || !session) {
                return NextResponse.json({ error: '找不到该训练记录' }, { status: 404 })
            }

            const summary: SessionSummary = {
                sessionId: session.id,
                elderId: session.elder_id,
                elderName: session.profiles?.display_name || '未知',
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
                return NextResponse.json({ error: '找不到训练记录' }, { status: 404 })
            }

            const summaries: SessionSummary[] = sessions.map(s => ({
                sessionId: s.id,
                elderId: s.elder_id,
                elderName: s.profiles?.display_name || '未知',
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

        return NextResponse.json({
            error: '请提供 id 或 elderId 参数',
            usage: {
                single: '/api/export/session?id=<session_id>&format=csv|excel',
                batch: '/api/export/session?elderId=<elder_id>&from=2024-01-01&to=2024-12-31&format=csv',
            }
        }, { status: 400 })

    } catch (err: any) {
        console.error('Export API error:', err)
        return NextResponse.json({ error: err.message || '导出失败' }, { status: 500 })
    }
}
