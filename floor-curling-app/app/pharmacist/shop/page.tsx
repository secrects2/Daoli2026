'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext' // Added
import LanguageSwitcher from '@/components/LanguageSwitcher' // Added

interface Equipment {
    id: string
    name: string
    description: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    attributes: Record<string, number>
    price: number // Local Points 價格
    image_url?: string | null
}

interface UserWallet {
    local_points: number
    global_points: number
}

export default function ShopPage() {
    const { t } = useLanguage() // Added
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [equipment, setEquipment] = useState<Equipment[]>([])
    const [wallet, setWallet] = useState<UserWallet | null>(null)
    const [loading, setLoading] = useState(true)
    const [purchasing, setPurchasing] = useState<string | null>(null)
    const [selectedRarity, setSelectedRarity] = useState<string>('all')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 獲取當前用戶
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // 獲取錢包
            const { data: walletData } = await supabase
                .from('wallets')
                .select('local_points, global_points')
                .eq('user_id', user.id)
                .single()

            if (walletData) {
                setWallet(walletData)
            }

            // 獲取所有裝備（添加價格）
            const { data: equipmentData, error } = await supabase
                .from('equipment')
                .select('*')
                .order('rarity')

            if (error) throw error

            // 根據稀有度設置價格
            const priceByRarity: Record<string, number> = {
                common: 50,
                rare: 150,
                epic: 400,
                legendary: 1000
            }

            const equipmentWithPrice = (equipmentData || []).map(item => ({
                ...item,
                price: priceByRarity[item.rarity] || 100
            }))

            setEquipment(equipmentWithPrice)
        } catch (error) {
            console.error('獲取數據失敗:', error)
        } finally {
            setLoading(false)
        }
    }

    // 購買裝備
    const handlePurchase = async (item: Equipment) => {
        if (!wallet || wallet.local_points < item.price) {
            setMessage({ type: 'error', text: t('shop.insufficient') }) // Updated
            setTimeout(() => setMessage(null), 3000)
            return
        }

        setPurchasing(item.id)
        setMessage(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('未登錄')

            // 扣除積分
            const newPoints = wallet.local_points - item.price
            const { error: walletError } = await supabase
                .from('wallets')
                .update({ local_points: newPoints })
                .eq('user_id', user.id)

            if (walletError) throw walletError

            // 記錄交易
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    amount: -item.price,
                    type: 'spend',
                    description: `購買裝備: ${item.name}`
                })

            if (txError) console.error('記錄交易失敗:', txError)

            // 更新本地狀態
            setWallet({ ...wallet, local_points: newPoints })
            setMessage({ type: 'success', text: t('shop.success', { item: item.name }) }) // Updated
            setTimeout(() => setMessage(null), 3000)
        } catch (error: any) {
            console.error('購買失敗:', error)
            setMessage({ type: 'error', text: t('shop.failed') + `: ${error.message}` }) // Updated
            setTimeout(() => setMessage(null), 3000)
        } finally {
            setPurchasing(null)
        }
    }

    // 稀有度顏色
    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'bg-gray-100 text-gray-700 border-gray-300'
            case 'rare': return 'bg-blue-100 text-blue-700 border-blue-300'
            case 'epic': return 'bg-purple-100 text-purple-700 border-purple-300'
            case 'legendary': return 'bg-yellow-100 text-yellow-700 border-yellow-400'
            default: return 'bg-gray-100 text-gray-700 border-gray-300'
        }
    }

    const getRarityLabel = (rarity: string) => {
        // Use i18n map
        switch (rarity) {
            case 'common': return t('shop.rarity.common')
            case 'rare': return t('shop.rarity.rare')
            case 'epic': return t('shop.rarity.epic')
            case 'legendary': return t('shop.rarity.legendary')
            default: return rarity
        }
    }

    // 篩選裝備
    const filteredEquipment = equipment.filter(item => {
        if (selectedRarity === 'all') return true
        return item.rarity === selectedRarity
    })

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p> {/* Updated */}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
            {/* 導航欄 */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.push('/pharmacist/dashboard')}
                                className="mr-4 text-gray-600 hover:text-gray-900"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-blue-600">{t('shop.title')}</h1> {/* Updated */}
                        </div>
                        {/* 積分顯示 */}
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher /> {/* Added */}

                            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                                <span className="text-green-600">💎</span>
                                <span className="font-bold text-green-700">
                                    {wallet?.local_points?.toLocaleString() || 0}
                                </span>
                                <span className="text-sm text-green-600">{t('shop.balanceLabel')}</span> {/* Updated */}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 消息提示 */}
            {message && (
                <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* 主內容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 篩選器 */}
                <div className="mb-6 flex gap-2 flex-wrap">
                    {['all', 'common', 'rare', 'epic', 'legendary'].map(rarity => (
                        <button
                            key={rarity}
                            onClick={() => setSelectedRarity(rarity)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedRarity === rarity
                                ? rarity === 'all' ? 'bg-blue-600 text-white' :
                                    rarity === 'legendary' ? 'bg-yellow-500 text-white' :
                                        rarity === 'epic' ? 'bg-purple-600 text-white' :
                                            rarity === 'rare' ? 'bg-blue-500 text-white' :
                                                'bg-gray-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {rarity === 'all' ? t('shop.rarity.all') : getRarityLabel(rarity)} {/* Updated */}
                            ({rarity === 'all' ? equipment.length : equipment.filter(e => e.rarity === rarity).length})
                        </button>
                    ))}
                </div>

                {/* 裝備網格 */}
                {filteredEquipment.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <span className="text-6xl mb-4 block">🛒</span>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('shop.empty.title')}</h3> {/* Updated */}
                        <p className="text-gray-500">{t('shop.empty.desc')}</p> {/* Updated */}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredEquipment.map(item => {
                            const canAfford = wallet && wallet.local_points >= item.price
                            const isPurchasing = purchasing === item.id

                            return (
                                <div
                                    key={item.id}
                                    className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-all hover:shadow-lg ${getRarityColor(item.rarity)}`}
                                >
                                    {/* 裝備圖標 */}
                                    <div className={`h-32 flex items-center justify-center ${item.rarity === 'legendary' ? 'bg-gradient-to-br from-yellow-100 to-orange-100' :
                                        item.rarity === 'epic' ? 'bg-gradient-to-br from-purple-100 to-pink-100' :
                                            item.rarity === 'rare' ? 'bg-gradient-to-br from-blue-100 to-cyan-100' :
                                                'bg-gray-50'
                                        }`}>
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-24 h-24 object-contain"
                                            />
                                        ) : (
                                            <span className="text-6xl">
                                                {item.rarity === 'legendary' ? '👑' :
                                                    item.rarity === 'epic' ? '💎' :
                                                        item.rarity === 'rare' ? '⭐' : '🎯'}
                                            </span>
                                        )}
                                    </div>

                                    {/* 裝備信息 */}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${getRarityColor(item.rarity)}`}>
                                                {getRarityLabel(item.rarity)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>

                                        {/* 屬性 */}
                                        {item.attributes && Object.keys(item.attributes).length > 0 && (
                                            <div className="flex gap-2 flex-wrap mb-3">
                                                {Object.entries(item.attributes).map(([key, value]) => (
                                                    <span key={key} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                        {key}: +{value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* 價格和購買按鈕 */}
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <span className="text-green-600">💎</span>
                                                <span className="font-bold text-gray-900">{item.price}</span>
                                            </div>
                                            <button
                                                onClick={() => handlePurchase(item)}
                                                disabled={!canAfford || isPurchasing}
                                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${isPurchasing
                                                    ? 'bg-gray-300 text-gray-500 cursor-wait'
                                                    : canAfford
                                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isPurchasing ? t('shop.buying') : canAfford ? t('shop.buy') : t('shop.insufficient')} {/* Updated */}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
