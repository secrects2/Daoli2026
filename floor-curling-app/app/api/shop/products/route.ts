import { NextResponse } from 'next/server'

export async function GET() {
    // Mock Data for Shop
    const products = [
        { id: 1, name: '專業冰壺推桿', price_points: 500, image_url: 'https://api.dicebear.com/7.x/icons/svg?seed=stick', description: '輕量化設計' },
        { id: 2, name: '防滑運動手套', price_points: 200, image_url: 'https://api.dicebear.com/7.x/icons/svg?seed=glove', description: '增加抓握力' },
        { id: 3, name: '能量營養棒', price_points: 150, image_url: 'https://api.dicebear.com/7.x/icons/svg?seed=bar', description: '體力補充' },
        { id: 4, name: '紀念毛巾', price_points: 300, image_url: 'https://api.dicebear.com/7.x/icons/svg?seed=towel', description: '專屬紀念' },
    ]
    return NextResponse.json({ data: products })
}
