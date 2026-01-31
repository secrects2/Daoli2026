import './globals.css'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { TabBar } from '@/components/TabBar'

export const metadata = {
    title: '道里地壺球 - Floor Curling Platform',
    description: 'Professional Floor Curling management platform',
    manifest: '/manifest.json',
    themeColor: '#7c3aed',
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: false, // Make it feel like an app
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
        <html lang="zh-TW">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            </head>
            <body>
                <LanguageProvider>
                    <main className="pb-[80px]"> {/* Padding for TabBar */}
                        {children}
                    </main>
                    <TabBar />
                </LanguageProvider>
            </body>
        </html>
    )
}
