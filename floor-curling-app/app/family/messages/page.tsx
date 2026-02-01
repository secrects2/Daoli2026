'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

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

export default function MessagesPage() {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [activeContact, setActiveContact] = useState<Contact | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const bottomRef = useRef<HTMLDivElement>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Fetch User & Contacts
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setCurrentUserId(user.id)

            try {
                const res = await fetch('/api/chat/contacts')
                const data = await res.json()
                if (data.success) {
                    setContacts(data.contacts)
                    // Auto-select first contact if only one (e.g., only Elder)
                    if (data.contacts.length === 1) {
                        setActiveContact(data.contacts[0])
                    }
                }
            } catch (error) {
                console.error('Error fetching contacts:', error)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [supabase])

    // 2. Fetch Messages when Active Contact changes (Polling)
    useEffect(() => {
        if (!activeContact) return

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/chat/messages?target_id=${activeContact.id}`)
                const data = await res.json()
                if (data.success) {
                    setMessages(data.messages)
                }
            } catch (error) {
                console.error(error)
            }
        }

        fetchMessages()
        const interval = setInterval(fetchMessages, 3000) // Poll every 3s
        return () => clearInterval(interval)
    }, [activeContact])

    // Scroll to bottom
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
            // No need to setMessages from response as polling will catch up, 
            // or we could replace the temp ID if we managed state strictly.
        } catch (error) {
            console.error('Send failed', error)
            alert('訊息發送失敗')
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>

    // CONTACT LIST VIEW
    if (!activeContact) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0">
                    <Link href="/family/dashboard" className="text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </Link>
                    <h1 className="font-bold text-gray-900 text-lg">訊息中心</h1>
                </div>

                <div className="p-4 space-y-4">
                    {contacts.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            暫無聯絡人 (需先綁定長輩或加入店家)
                        </div>
                    ) : (
                        contacts.map(contact => (
                            <div
                                key={contact.id}
                                onClick={() => setActiveContact(contact)}
                                className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 active:scale-98 transition-transform cursor-pointer"
                            >
                                <img
                                    src={contact.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.id}
                                    className="w-12 h-12 rounded-full bg-gray-200"
                                />
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{contact.full_name}</h3>
                                    <p className="text-xs text-gray-500">
                                        {contact.role === 'elder' ? '長輩' :
                                            contact.role === 'pharmacist' ? '店長' : '管理員'}
                                    </p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )
    }

    // CHAT VIEW
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10 sticky top-0">
                <button onClick={() => setActiveContact(null)} className="text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <img
                        src={activeContact.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + activeContact.id}
                        className="w-8 h-8 rounded-full bg-gray-200"
                    />
                    <div>
                        <h1 className="font-bold text-gray-900 text-base">{activeContact.full_name}</h1>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {activeContact.role === 'elder' ? '長輩' : '店長'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                    const isMe = msg.sender_id === currentUserId
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                                <img
                                    src={activeContact.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + activeContact.id}
                                    className="w-8 h-8 rounded-full bg-gray-200 mr-2 self-end mb-1"
                                />
                            )}
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative ${isMe
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white text-gray-900 rounded-bl-none'
                                }`}>
                                <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
                                <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4 pb-8">
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="輸入訊息..."
                        className="flex-1 bg-gray-100 text-gray-900 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:scale-95 transition-all shadow-md"
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    )
}
