import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { cookies: { get: () => undefined, set: () => { }, remove: () => { } } }
        )

        const products = [
            {
                name: '關節活力膠囊 (Joint Vitality)',
                description: '針對投擲時膝蓋卡卡設計，提升關節靈活度，讓您蹲得更低、瞄得更準！',
                price: 300,
                category: 'health',
                image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=joint&backgroundColor=e6f2ff'
            },
            {
                name: '肌力蛋白飲 (Muscle Power)',
                description: '增強推球力道，避免球路中途停下。補充優質蛋白，維持肌肉量。',
                price: 250,
                category: 'health',
                image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=protein&backgroundColor=ffebe6'
            },
            {
                name: '黃金手感冰壺 (Pro Stone)',
                description: '專屬個人的幸運冰壺，擁有更穩定的重心與獨特配色，提升投擲準確度。',
                price: 800,
                category: 'equipment',
                image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=stone&backgroundColor=fffbeb'
            },
            {
                name: '冠軍戰隊球衣 (Champion Jersey)',
                description: '象徵榮譽的戰隊制服，穿上它，氣勢先贏一半！',
                price: 500,
                category: 'equipment',
                image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=jersey&backgroundColor=f0fdf4'
            },
            {
                name: '穩定護腕 (Stabilizer Wristband)',
                description: '保護手腕，減少運動傷害，增加出手穩定性。',
                price: 150,
                category: 'equipment',
                image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=wrist&backgroundColor=f3e8ff'
            }
        ]

        const results = []

        for (const p of products) {
            // Check if exists
            const { data: existing } = await supabase
                .from('products')
                .select('id')
                .eq('name', p.name)
                .single()

            if (!existing) {
                const { data, error } = await supabase.from('products').insert(p).select()
                if (error) console.error(error)
                else results.push(data[0])
            } else {
                results.push({ ...p, status: 'Already Exists' })
            }
        }

        return NextResponse.json({
            status: 'Success',
            message: 'Products seeded',
            products: results
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
