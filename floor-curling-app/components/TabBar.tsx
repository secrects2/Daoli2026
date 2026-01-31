'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function TabBar() {
    const pathname = usePathname()
    // Hide tab bar on login page
    if (pathname === '/login') return null

    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#F9F9F9]/90 backdrop-blur-lg border-t border-[#B3B3B3] pb-safe-area-bottom">
            <div className="flex justify-around items-center h-[49px]">
                {/* 1. Dashboard / Pharmacist */}
                <Link href="/" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/pharmacist') || pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <svg className="w-[28px] h-[28px]" fill={isActive('/pharmacist') || pathname === '/' ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive('/pharmacist') || pathname === '/' ? "0" : "2"} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-[10px] mt-[1px] font-medium">首頁</span>
                </Link>

                {/* 2. Family */}
                <Link href="/family" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/family') ? 'text-primary' : 'text-muted-foreground'}`}>
                    <svg className="w-[28px] h-[28px]" fill={isActive('/family') ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive('/family') ? "0" : "2"} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-[10px] mt-[1px] font-medium">家屬</span>
                </Link>

                {/* 3. Admin (Only visible if needed, or put in standard menu) */}
                <Link href="/admin" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/admin') ? 'text-primary' : 'text-muted-foreground'}`}>
                    <svg className="w-[28px] h-[28px]" fill={isActive('/admin') ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive('/admin') ? "0" : "2"} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] mt-[1px] font-medium">管理</span>
                </Link>
            </div>
        </div>
    )
}
