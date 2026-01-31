import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { StoreStatusToggle } from './StoreStatusToggle'

export const dynamic = 'force-dynamic'

export default async function AdminStoresPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                    }
                },
            },
        }
    )

    interface Store {
        id: string
        name: string
        status: string
        created_at: string
    }

    let stores: Store[] = []
    let errorMsg = null

    try {
        const { data, error } = await supabase
            .from('stores')
            .select`
                *,
                profiles:profiles(count)
            `
            .order('created_at', { ascending: false })

        if (error) throw error
        stores = data || []
    } catch (err: any) {
        console.error('Failed to fetch stores:', err)
        errorMsg = err.message
    }

    // Check if table missing (error 42P01: relation "stores" does not exist)
    const isTableMissing = errorMsg && errorMsg.includes('relation "stores" does not exist')

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">加盟店管理 (Franchise Control)</h1>
                        <p className="text-gray-500">管理各分店的營運狀態與權限</p>
                    </div>
                    <Link href="/admin" className="text-blue-600 hover:text-blue-800">
                        ← 返回儀表板
                    </Link>
                </div>

                {isTableMissing ? (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    <strong>警告：</strong> 系統偵測到 `stores` 資料表尚未建立。
                                </p>
                                <p className="mt-2 text-sm text-yellow-700">
                                    請務必前往 Supabase SQL Editor 執行 `scripts/setup_franchise_system.sql` 腳本以完成初始化。
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        店鋪 ID / 名稱
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        狀態 (Status)
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        成員數
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stores.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                            目前沒有任何加盟店資料
                                        </td>
                                    </tr>
                                ) : (
                                    stores.map((store: any) => (
                                        <tr key={store.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{store.name}</div>
                                                <div className="text-sm text-gray-500">{store.id}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${store.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {store.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {store.profiles && store.profiles[0] ? store.profiles[0].count : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <StoreStatusToggle storeId={store.id} currentStatus={store.status} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
