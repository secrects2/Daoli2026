'use client'

import { useState, useRef, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

interface Elder {
    id: string
    full_name: string | null
    nickname: string | null
}

interface ElderSearchInputProps {
    onSelect: (elderId: string, elderName: string) => void
    placeholder?: string
    disabled?: boolean
    excludeIds?: string[]
    className?: string
    storeId?: string
}

/**
 * 长者名字搜索输入框（自动补全）
 * 用户输入名字，从 profiles 表中搜索匹配的 elder，选中后回调 elderId
 */
export default function ElderSearchInput({
    onSelect,
    placeholder = '输入长者姓名...',
    disabled = false,
    excludeIds = [],
    className = '',
    storeId,
}: ElderSearchInputProps) {
    const supabase = createClientComponentClient()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Elder[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [loading, setLoading] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // 搜索长者
    useEffect(() => {
        if (!query.trim()) {
            setResults([])
            setShowDropdown(false)
            return
        }

        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                let q = supabase
                    .from('profiles')
                    .select('id, full_name, nickname')
                    .eq('role', 'elder')
                    .not('full_name', 'ilike', '%(停用)%')
                    .or(`full_name.ilike.%${query}%,nickname.ilike.%${query}%`)
                    .limit(8)

                if (storeId) {
                    q = q.eq('store_id', storeId)
                }

                const { data } = await q

                // 过滤掉已选的
                const filtered = (data || []).filter(e => !excludeIds.includes(e.id))
                setResults(filtered)
                setShowDropdown(filtered.length > 0)
            } catch (err) {
                console.error('搜索长者失败:', err)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query, excludeIds, storeId, supabase])

    // 点击外部关闭下拉
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const handleSelect = (elder: Elder) => {
        const name = elder.nickname || elder.full_name || elder.id.slice(0, 8)
        onSelect(elder.id, name)
        setQuery('')
        setResults([])
        setShowDropdown(false)
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all disabled:opacity-50 disabled:bg-background"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-border border-t-blue-500 rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* 自动补全下拉 */}
            {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                    {results.map(elder => (
                        <button
                            key={elder.id}
                            type="button"
                            onClick={() => handleSelect(elder)}
                            className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-sm">
                                👴
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground text-sm truncate">
                                    {elder.nickname || elder.full_name || '未命名'}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                    {elder.id.slice(0, 8)}...
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
