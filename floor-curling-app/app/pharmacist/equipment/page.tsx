'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext' // Added
import LanguageSwitcher from '@/components/LanguageSwitcher' // Added

interface Equipment {
    id: string
    name: string
    description: string | null
    stats: Record<string, number>
    rarity: string | null
    image_url: string | null
    created_at: string
}

// 稀有度配置 (Will render labels using translations in component, keeping styles here)
const rarityConfig: Record<string, { color: string; bgColor: string; labelKey: string }> = {
    common: { color: 'text-gray-700', bgColor: 'bg-muted', labelKey: 'common' },
    rare: { color: 'text-blue-700', bgColor: 'bg-blue-100', labelKey: 'rare' },
    epic: { color: 'text-purple-700', bgColor: 'bg-purple-100', labelKey: 'epic' },
    legendary: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', labelKey: 'legendary' }
}

// 屬性圖標
const statIcons: Record<string, string> = {
    speed: '⚡',
    control: '🎯',
    accuracy: '🎯',
    defense: '🛡️',
    stability: '⚖️',
    power: '💪'
}

export default function EquipmentPage() {
    const { t } = useLanguage() // Added
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [equipment, setEquipment] = useState<Equipment[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedRarity, setSelectedRarity] = useState<string>('all')
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)

    useEffect(() => {
        fetchEquipment()
    }, [])

    const fetchEquipment = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('equipment')
                .select('*')
                .order('rarity', { ascending: true })
                .order('name')

            if (error) throw error
            setEquipment(data || [])
        } catch (error) {
            console.error('獲取裝備數據失敗:', error)
        } finally {
            setLoading(false)
        }
    }

    // 篩選裝備
    const filteredEquipment = equipment.filter(eq => {
        if (selectedRarity === 'all') return true
        return eq.rarity === selectedRarity
    })

    // 獲取稀有度統計
    const rarityStats = {
        all: equipment.length,
        common: equipment.filter(e => e.rarity === 'common').length,
        rare: equipment.filter(e => e.rarity === 'rare').length,
        epic: equipment.filter(e => e.rarity === 'epic').length,
        legendary: equipment.filter(e => e.rarity === 'legendary').length
    }

    // Helper to get translated rarity label
    const getRarityLabel = (key: string) => {
        return t(`shop.rarity.${key}`) // Reusing shop keys as they are identical 'shop.rarity.common' etc.
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted">
            {/* 導航欄 */}
            <nav className="bg-card shadow-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.push('/pharmacist/dashboard')}
                                className="mr-4 text-gray-600 hover:text-foreground"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-primary">{t('equipment.title')}</h1> {/* Updated */}
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                            <span className="text-sm text-muted-foreground">
                                {t('equipment.total', { n: equipment.length })} {/* Updated */}
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 稀有度篩選 */}
                <div className="mb-6 flex gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedRarity('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedRarity === 'all'
                            ? 'bg-primary text-white'
                            : 'bg-card text-gray-600 hover:bg-background'
                            }`}
                    >
                        {t('shop.rarity.all')} ({rarityStats.all}) {/* Reuse shop key */}
                    </button>
                    {Object.entries(rarityConfig).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedRarity(key)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedRarity === key
                                ? `${config.bgColor} ${config.color}`
                                : 'bg-card text-gray-600 hover:bg-background'
                                }`}
                        >
                            {getRarityLabel(config.labelKey)} ({rarityStats[key as keyof typeof rarityStats]})
                        </button>
                    ))}
                </div>

                {/* 裝備列表 */}
                {filteredEquipment.length === 0 ? (
                    <div className="bg-card rounded-xl shadow-card p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {selectedRarity !== 'all' ? t('equipment.emptyRarity') : t('equipment.empty')} {/* Updated */}
                        </h3>
                        <p className="text-muted-foreground">
                            {t('equipment.emptyDesc')} {/* Updated */}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredEquipment.map((eq) => {
                            const rarity = rarityConfig[eq.rarity || 'common'] || rarityConfig.common

                            return (
                                <div
                                    key={eq.id}
                                    onClick={() => setSelectedEquipment(eq)}
                                    className={`bg-card rounded-xl shadow-card p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300 ${eq.rarity === 'legendary' ? 'ring-2 ring-yellow-400' : ''
                                        }`}
                                >
                                    {/* 裝備圖標 */}
                                    <div className={`w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center ${rarity.bgColor}`}>
                                        {eq.image_url ? (
                                            <img src={eq.image_url} alt={eq.name} className="w-12 h-12 object-contain" />
                                        ) : (
                                            <span className="text-3xl">🎮</span>
                                        )}
                                    </div>

                                    {/* 名稱和稀有度 */}
                                    <div className="text-center mb-4">
                                        <h3 className="font-semibold text-foreground mb-1">{eq.name}</h3>
                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${rarity.bgColor} ${rarity.color}`}>
                                            {getRarityLabel(rarity.labelKey)}
                                        </span>
                                    </div>

                                    {/* 描述 */}
                                    {eq.description && (
                                        <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2">
                                            {eq.description}
                                        </p>
                                    )}

                                    {/* 屬性 */}
                                    <div className="border-t border-border/50 pt-4">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {Object.entries(eq.stats || {}).map(([stat, value]) => (
                                                <div
                                                    key={stat}
                                                    className="flex items-center gap-1 bg-background rounded-lg px-2 py-1"
                                                >
                                                    <span className="text-sm">{statIcons[stat] || '📊'}</span>
                                                    <span className="text-xs text-gray-600 capitalize">{t(`equipment.stat.${stat as any}`) || stat}</span> {/* Updated */}
                                                    <span className="text-xs font-bold text-primary">+{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* 裝備詳情彈窗 */}
            {selectedEquipment && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]"
                    onClick={() => setSelectedEquipment(null)}
                >
                    <div
                        className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 關閉按鈕 */}
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setSelectedEquipment(null)}
                                className="text-muted-foreground hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 裝備圖標 */}
                        <div className={`w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center ${rarityConfig[selectedEquipment.rarity || 'common']?.bgColor || 'bg-muted'
                            }`}>
                            {selectedEquipment.image_url ? (
                                <img src={selectedEquipment.image_url} alt={selectedEquipment.name} className="w-16 h-16 object-contain" />
                            ) : (
                                <span className="text-5xl">🎮</span>
                            )}
                        </div>

                        {/* 名稱和稀有度 */}
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-foreground mb-2">{selectedEquipment.name}</h2>
                            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${rarityConfig[selectedEquipment.rarity || 'common']?.bgColor || 'bg-muted'
                                } ${rarityConfig[selectedEquipment.rarity || 'common']?.color || 'text-gray-700'}`}>
                                {getRarityLabel(rarityConfig[selectedEquipment.rarity || 'common']?.labelKey || 'common')}
                            </span>
                        </div>

                        {/* 描述 */}
                        {selectedEquipment.description && (
                            <p className="text-gray-600 text-center mb-6">
                                {selectedEquipment.description}
                            </p>
                        )}

                        {/* 詳細屬性 */}
                        <div className="bg-background rounded-xl p-4">
                            <h3 className="font-semibold text-foreground mb-3">{t('equipment.attributes')}</h3> {/* Updated */}
                            <div className="space-y-2">
                                {Object.entries(selectedEquipment.stats || {}).map(([stat, value]) => (
                                    <div key={stat} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{statIcons[stat] || '📊'}</span>
                                            <span className="text-gray-700 capitalize">{t(`equipment.stat.${stat as any}`) || stat}</span> {/* Updated */}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary/100 rounded-full"
                                                    style={{ width: `${Math.min(value, 100)}%` }}
                                                />
                                            </div>
                                            <span className="font-bold text-primary w-8 text-right">+{value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
