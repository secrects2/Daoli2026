'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Contact {
    id: string
    full_name: string
    avatar_url: string
    role: string
}

interface Message {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    created_at: string
}

export default function ManagerMessagesPage() {
    const { t } = useLanguage()
    const [contacts, setContacts] = useState<Contact[]>([])
    const [activeContact, setActiveContact] = useState<Contact | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')

    const bottomRef = useRef<HTMLDivElement>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Fetch User & Contacts (All Store Members)
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setCurrentUserId(user.id)

            try {
                const res = await fetch('/api/chat/contacts')
                const data = await res.json()
                if (data.success) setContacts(data.contacts)
            } catch (error) { console.error(error) }
            finally { setLoading(false) }
        }
        init()
    }, [supabase])

    // 2. Fetch Messages
    useEffect(() => {
        if (!activeContact) return
        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/chat/messages?target_id=${activeContact.id}`)
                const data = await res.json()
                if (data.success) setMessages(data.messages)
            } catch (error) { console.error(error) }
        }
        fetchMessages()
        const interval = setInterval(fetchMessages, 3000)
        return () => clearInterval(interval)
    }, [activeContact])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || !activeContact) return

        const tempId = crypto.randomUUID()
        const optimisitcMsg = {
            id: tempId,
            sender_id: currentUserId,
            receiver_id: activeContact.id,
            content: input,
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, optimisitcMsg])
        setInput('')

        try {
            await fetch('/api/chat/messages', {
                method: 'POST',
                body: JSON.stringify({
                    receiver_id: activeContact.id,
                    content: optimisitcMsg.content
                })
            })
        } catch (error) { console.error(error) }
    }

    const filteredContacts = contacts.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role?.includes(searchTerm)
    )

    if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar (Contacts) */}
            <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${activeContact ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-bold text-lg">對話列表</h2>
                    <Link href="/pharmacist/dashboard" className="text-sm text-blue-600 hover:underline">返回看板</Link>
                </div>

                {/* Search */}
                <div className="p-3">
                    <input
                        type="text"
                        placeholder="搜尋長輩或家屬..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredContacts.map(contact => (
                        <div
                            key={contact.id}
                            onClick={() => setActiveContact(contact)}
                            className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${activeContact?.id === contact.id ? 'bg-blue-50' : ''}`}
                        >
                            <img
                                src={contact.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.id}
                                className="w-10 h-10 rounded-full bg-gray-200"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className="font-semibold text-gray-900 truncate">{contact.full_name}</h3>
                                    <span className="text-xs text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                        {contact.role === 'elder' ? '長輩' : '家屬'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">點擊開始對話</p>
                            </div>
                        </div>
                    ))}
                    {filteredContacts.length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">沒有找到相關聯絡人</div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {activeContact ? (
                <div className="flex-1 flex flex-col h-full">
                    {/* Chat Header */}
                    <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveContact(null)} className="md:hidden text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <img
                                src={activeContact.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + activeContact.id}
                                className="w-8 h-8 rounded-full bg-gray-200"
                            />
                            <div>
                                <h3 className="font-bold text-gray-900">{activeContact.full_name}</h3>
                                <p className="text-xs text-green-600">線上</p>
                            </div>
                        </div>
                        <div className="text-sm">
                            <Link href={`/pharmacist/${activeContact.role === 'elder' ? 'elders' : 'family'}/${activeContact.id}`} className="text-blue-600 hover:underline">
                                查看詳細資料
                            </Link>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map(msg => {
                            const isMe = msg.sender_id === currentUserId
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'}`}>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                        <div className={`text-xs mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="bg-white p-4 border-t border-gray-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder="輸入訊息以回覆..."
                                className="flex-1 bg-gray-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                發送
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 text-gray-400 flex-col">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    <p>請選擇左側聯絡人開始對話</p>
                </div>
            )}
        </div>
    )
}
