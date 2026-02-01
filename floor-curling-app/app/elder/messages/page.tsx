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

export default function ElderMessagesPage() {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [activeContact, setActiveContact] = useState<Contact | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    interface QuickReply {
        text: string;
        label: string;
    }
    const quickReplies: QuickReply[] = [
        { label: '👋 打招呼', text: '你好！我今天過得很好。' },
        { label: '🆗 收到了', text: '好喔，我知道了。' },
        { label: '❤️ 謝謝', text: '謝謝你，愛你喔！' },
        { label: '❓ 詢問', text: '請問下次什麼時候回來？' },
    ]

    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const bottomRef = useRef<HTMLDivElement>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Init Logic similar to Family Chat
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
                }
            } catch (error) {
                console.error('Error fetching contacts:', error)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [supabase])

    // Polling Logic
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

    const sendMessage = async (text: string) => {
        if (!activeContact) return
        const tempId = crypto.randomUUID()
        const optimisitcMsg = {
            id: tempId,
            sender_id: currentUserId,
            receiver_id: activeContact.id,
            content: text,
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, optimisitcMsg])

        try {
            await fetch('/api/chat/messages', {
                method: 'POST',
                body: JSON.stringify({ receiver_id: activeContact.id, content: text })
            })
        } catch (error) { alert('發送失敗') }
    }

    if (loading) return <div className="p-8 text-center text-gray-500 text-2xl">載入中...</div>

    // CONTACT LIST (Big Cards)
    if (!activeContact) {
        return (
            <div className="min-h-screen bg-orange-50 flex flex-col">
                <div className="bg-white border-b-2 border-orange-200 px-6 py-6 flex items-center gap-4 sticky top-0 shadow-sm">
                    <Link href="/elder/dashboard" className="text-gray-700 bg-gray-100 p-3 rounded-full">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                    </Link>
                    <h1 className="font-bold text-gray-900 text-3xl">聊天室</h1>
                </div>

                <div className="p-6 space-y-6">
                    {contacts.length === 0 ? (
                        <div className="text-center text-gray-500 mt-20 text-xl">
                            目前沒有聯絡人
                        </div>
                    ) : (
                        contacts.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => setActiveContact(contact)}
                                className="w-full bg-white p-6 rounded-3xl shadow-md border-2 border-orange-100 flex items-center gap-6 active:scale-95 transition-transform"
                            >
                                <img
                                    src={contact.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.id}
                                    className="w-20 h-20 rounded-full bg-gray-200"
                                />
                                <div className="text-left flex-1">
                                    <h3 className="font-bold text-gray-900 text-2xl">{contact.full_name}</h3>
                                    <p className="text-lg text-gray-500 mt-1">
                                        {contact.role === 'family' ? '家人' : '店長'}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    Let&apos;s Chat ➤
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        )
    }

    // CHAT VIEW (Simplified)
    return (
        <div className="flex flex-col h-screen bg-orange-50">
            {/* Header */}
            <div className="bg-white border-b-2 border-orange-200 px-4 py-4 flex items-center gap-4 shadow-sm z-10 sticky top-0">
                <button onClick={() => setActiveContact(null)} className="text-gray-700 bg-gray-100 p-2 rounded-full">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="flex items-center gap-4 flex-1">
                    <img
                        src={activeContact.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + activeContact.id}
                        className="w-14 h-14 rounded-full bg-gray-200"
                    />
                    <h1 className="font-bold text-gray-900 text-2xl">{activeContact.full_name}</h1>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map(msg => {
                    const isMe = msg.sender_id === currentUserId
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-3xl px-6 py-4 shadow-sm text-xl leading-relaxed ${isMe
                                ? 'bg-orange-500 text-white rounded-br-none'
                                : 'bg-white text-gray-900 rounded-bl-none border-2 border-orange-100'
                                }`}>
                                <p>{msg.content}</p>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            {/* Quick Replies (Instead of Keyboard) */}
            <div className="bg-white border-t-2 border-orange-200 p-4 pb-8">
                <p className="text-center text-gray-500 mb-3 text-sm">點擊下方按鈕回復</p>
                <div className="grid grid-cols-2 gap-3">
                    {quickReplies.map((reply, idx) => (
                        <button
                            key={idx}
                            onClick={() => sendMessage(reply.text)}
                            className="bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold py-4 px-2 rounded-xl text-lg transition-colors border-b-4 border-orange-200 active:border-b-0 active:translate-y-1"
                        >
                            {reply.label}
                        </button>
                    ))}
                </div>
                {/* Optional: Simple TextInput if they key better? Maybe simplified. Let's keep it simple for now as requested. */}
            </div>
        </div>
    )
}
