import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - Seed 商品測試數據
 * 
 * ⚠️ 安全控制：僅管理員可用
 */
export async function POST(request: NextRequest) {
    const auth = await verifyAdmin()
    if (!auth.isAdmin) {
        return unauthorizedResponse('僅限管理員使用')
    }

    try {
        const supabaseAdmin = getSupabaseAdmin()

        const products = [
            { name: '養生茶包', description: '精選有機養生茶', points_cost: 50, category: 'health', stock: 100, image_url: '/products/tea.png' },
            { name: '健康手冊', description: '長者健康指南', points_cost: 30, category: 'books', stock: 50, image_url: '/products/book.png' },
            { name: '運動毛巾', description: '吸汗快乾運動毛巾', points_cost: 80, category: 'sports', stock: 30, image_url: '/products/towel.png' },
        ]

        const { data, error } = await supabaseAdmin
            .from('products')
            .insert(products)
            .select()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: `已創建 ${data?.length || 0} 個測試商品`,
            products: data,
            createdBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
