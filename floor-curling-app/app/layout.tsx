import './globals.css'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { PullToRefresh } from '@/components/PullToRefresh'

export const metadata = {
    title: '道里地壺球 - Floor Curling Platform',
    description: 'Professional Floor Curling management platform',
    manifest: '/manifest.json',
    themeColor: '#7c3aed',
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
        viewportFit: 'cover',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: '道里地壺',
    },
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
                    <main className="relative min-h-screen">
                        <PullToRefresh>
                            {children}
                        </PullToRefresh>
                    </main>
                </LanguageProvider>
            </body>
        </html>
    )
}
