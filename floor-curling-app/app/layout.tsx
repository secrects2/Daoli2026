import './globals.css'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { PullToRefresh } from '@/components/PullToRefresh'
import ToastProvider from '@/components/ToastProvider'
import { ConfirmProvider } from '@/components/ConfirmContext'
import NextTopLoader from 'nextjs-toploader'

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
    themeColor: '#2ba89d',
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
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            </head>
            {/* Revert to simple white/gray background */}
            <body className="bg-background text-foreground min-h-screen selection:bg-primary/10 selection:text-primary">
                <NextTopLoader color="hsl(174, 60%, 45%)" height={3} showSpinner={false} easing="ease" speed={200} shadow="0 0 10px hsla(174,60%,45%,0.4)" zIndex={1600} />
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
