'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export default function MessagesPage() {
    const [messages, setMessages] = useState([
        { id: 1, text: '媽，今天比賽加油喔！', sender: 'me', time: '09:00' },
        { id: 2, text: '好喔，我會努力的！下午要去據點練習。', sender: 'elder', time: '09:15' },
        { id: 3, text: '記得帶水壺，不要中暑了。', sender: 'me', time: '09:16' },
    ])
    const [input, setInput] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = () => {
        if (!input.trim()) return
        const newMsg = {
            id: Date.now(),
            text: input,
            sender: 'me',
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
        }
        setMessages(prev => [...prev, newMsg])
        setInput('')

        // Auto reply simulation
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: '收到！謝謝關心 ❤️',
                sender: 'elder',
                time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
            }])
        }, 1500)
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10 sticky top-0">
                <Link href="/family/dashboard" className="text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </Link>
                <div className="flex-1">
                    <h1 className="font-bold text-gray-900 text-lg">與長輩的對話</h1>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> 線上
                    </p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative ${msg.sender === 'me'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white text-gray-900 rounded-bl-none'
                            }`}>
                            <p className="text-[15px] leading-relaxed">{msg.text}</p>
                            <span className={`text-[10px] block text-right mt-1 ${msg.sender === 'me' ? 'text-blue-200' : 'text-gray-400'
                                }`}>
                                {msg.time}
                            </span>
                        </div>
                    </div>
                ))}
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
                        className="flex-1 bg-gray-100 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
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
