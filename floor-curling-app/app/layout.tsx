import './globals.css'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { PullToRefresh } from '@/components/PullToRefresh'
import ToastProvider from '@/components/ToastProvider'
import { ConfirmProvider } from '@/components/ConfirmContext'

import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
    title: '道里運動平台 - DaoLi Sports Platform',
    description: 'Professional Sports management platform',
    manifest: '/manifest.json',
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon.ico',
        apple: '/apple-touch-icon.png',
        other: {
            rel: 'apple-touch-icon-precomposed',
            url: '/apple-touch-icon-precomposed.png',
        },
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: '道里運動',
    },
}

export const viewport: Viewport = {
    themeColor: '#7c3aed',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh-TW" className="antialiased">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            </head>
            {/* Revert to simple white/gray background */}
            <body className="bg-gray-50 text-slate-800 min-h-screen selection:bg-blue-100 selection:text-blue-900">
                <LanguageProvider>
                    <ToastProvider />
                    <ConfirmProvider>
                        <main className="relative min-h-screen">
                            <PullToRefresh>
                                {children}
                            </PullToRefresh>
                        </main>
                    </ConfirmProvider>
                </LanguageProvider>
            </body>
        </html>
    )
}
