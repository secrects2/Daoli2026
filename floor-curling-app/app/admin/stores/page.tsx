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
        contact_name?: string
        phone?: string
        address?: string
        profiles?: { count: number }[]
    }

    let stores: Store[] = []
    let errorMsg = null

    try {
        const { data, error } = await supabase
            .from('stores')
            .select('*')
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
        <div className="min-h-screen bg-background p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">加盟店管理 (Franchise Control)</h1>
                        <p className="text-muted-foreground text-sm sm:text-base">管理各分店的營運狀態與權限</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                        <Link href="/admin/stores/new" className="flex-1 sm:flex-none text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                            + 新增加盟店
                        </Link>
                        <Link href="/admin" className="px-4 py-2 bg-muted text-gray-700 hover:bg-accent rounded-lg hover:text-foreground transition-colors">
                            ← 返回
                        </Link>
                    </div>
                </div>

                {errorMsg && !isTableMissing && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-700">
                                    <strong>載入失敗：</strong> {errorMsg}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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
                    <div className="bg-card shadow overflow-x-auto sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-background">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        店鋪 ID / 名稱
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        狀態 (Status)
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        聯絡人 / 電話
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        地址
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        成員數
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-gray-200">
                                {stores.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-muted-foreground">
                                            目前沒有任何加盟店資料
                                        </td>
                                    </tr>
                                ) : (
                                    stores.map((store: any) => (
                                        <tr key={store.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-foreground">{store.name}</div>
                                                <div className="text-sm text-muted-foreground">{store.id}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${store.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {store.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-foreground">{store.contact_name || '-'}</div>
                                                <div className="text-sm text-muted-foreground">{store.phone || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap max-w-[200px] truncate text-sm text-muted-foreground" title={store.address}>
                                                {store.address || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                {store.profiles && store.profiles[0] ? store.profiles[0].count : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2 items-center">
                                                <StoreStatusToggle storeId={store.id} currentStatus={store.status} />
                                                <Link
                                                    href={`/admin/stores/${store.id}`}
                                                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md"
                                                >
                                                    編輯
                                                </Link>
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
