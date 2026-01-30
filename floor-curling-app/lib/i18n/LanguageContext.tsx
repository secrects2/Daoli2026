'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language, Translations } from './types'
import { translations } from './translations'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    // 預設為繁體中文
    const [language, setLanguage] = useState<Language>('zh-TW')

    // 從 localStorage 讀取語言設定 (僅在客戶端執行)
    useEffect(() => {
        const savedLang = localStorage.getItem('app_language') as Language
        if (savedLang && ['zh-TW', 'zh-CN', 'en'].includes(savedLang)) {
            setLanguage(savedLang)
        }
    }, [])

    // 保存語言設定
    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem('app_language', lang)
    }

    // 翻譯函數
    // 使用 dot notation: t('login.title')
    const t = (key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.')
        let value: any = translations[language]

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k]
            } else {
                return key // Key not found
            }
        }

        if (typeof value !== 'string') {
            return key
        }

        // 參數替換 {param}
        if (params) {
            return Object.entries(params).reduce((acc, [k, v]) => {
                return acc.replace(new RegExp(`{${k}}`, 'g'), String(v))
            }, value)
        }

        return value
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
