'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'

interface AISetupGuideModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AISetupGuideModal({ isOpen, onClose }: AISetupGuideModalProps) {
    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-50">
                {/* Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                {/* Modal Position */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300 transform"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200 transform"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-black flex items-center gap-2">
                                            <span>📏</span> AI 檢測架設規範
                                        </h3>
                                        <p className="text-blue-100 text-sm mt-1 opacity-90">準確度取決於架設位置，請務必遵守以下 SOP</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* Content Grid */}
                                <div className="p-6 grid gap-6 md:grid-cols-2">

                                    {/* 1. Angle */}
                                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">
                                                📐
                                            </div>
                                            <h4 className="font-bold text-gray-900">1. 拍攝角度：45° 側前</h4>
                                        </div>
                                        {/* SVG Schema: Top-down 45 degree view */}
                                        <div className="w-full h-32 bg-white rounded-lg border border-blue-100 mb-3 flex items-center justify-center overflow-hidden">
                                            <svg viewBox="0 0 200 120" className="w-full h-full">
                                                {/* Person (Top view) */}
                                                <circle cx="100" cy="80" r="15" fill="#CBD5E1" /> {/* Head */}
                                                <ellipse cx="100" cy="80" rx="22" ry="10" fill="#94A3B8" /> {/* Shoulders */}
                                                <rect x="85" y="90" width="30" height="5" rx="2" fill="#64748B" /> {/* Chair back */}

                                                {/* Camera */}
                                                <g transform="translate(150, 30) rotate(-45)">
                                                    <rect x="0" y="0" width="20" height="12" fill="#3B82F6" />
                                                    <polygon points="20,2 28,6 20,10" fill="#3B82F6" />
                                                </g>

                                                {/* Field of View */}
                                                <path d="M150 36 L115 70" stroke="#60A5FA" strokeWidth="2" strokeDasharray="4 2" markerEnd="url(#arrowhead)" />
                                                <text x="140" y="20" fontSize="10" fill="#3B82F6" fontWeight="bold">45° Camera</text>
                                            </svg>
                                        </div>
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            <li className="flex gap-2">
                                                <span className="text-blue-500">✅</span>
                                                <span>請站在長輩的<strong>斜前方 45 度</strong></span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="text-blue-500">✅</span>
                                                <span>能看清<strong>投擲手臂</strong>與<strong>雙肩</strong></span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* 2. Height */}
                                    <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl">
                                                📏
                                            </div>
                                            <h4 className="font-bold text-gray-900">2. 拍攝高度：視線平行</h4>
                                        </div>
                                        {/* SVG Schema: Side view eye level */}
                                        <div className="w-full h-32 bg-white rounded-lg border border-purple-100 mb-3 flex items-center justify-center overflow-hidden">
                                            <svg viewBox="0 0 200 120" className="w-full h-full">
                                                {/* Person (Side view sitting) */}
                                                <circle cx="140" cy="50" r="10" fill="#CBD5E1" /> {/* Head */}
                                                <path d="M140 60 L140 90 L160 90" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" /> {/* Body/Leg */}
                                                <path d="M135 90 L135 110" stroke="#64748B" strokeWidth="4" strokeLinecap="round" /> {/* Chair Leg */}
                                                <path d="M130 90 L150 90" stroke="#64748B" strokeWidth="4" strokeLinecap="round" /> {/* Chair Seat */}

                                                {/* Camera */}
                                                <rect x="40" y="45" width="15" height="10" fill="#8B5CF6" />
                                                <line x1="47" y1="55" x2="47" y2="110" stroke="#8B5CF6" strokeWidth="2" /> {/* Tripod */}

                                                {/* Level Line */}
                                                <line x1="55" y1="50" x2="130" y2="50" stroke="#A78BFA" strokeWidth="2" strokeDasharray="4 2" />
                                                <text x="65" y="45" fontSize="10" fill="#8B5CF6" fontWeight="bold">Eye Level (100-120cm)</text>
                                            </svg>
                                        </div>
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            <li className="flex gap-2">
                                                <span className="text-purple-500">✅</span>
                                                <span>約 <strong>100-120cm</strong> (與肩膀平行)</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="text-red-500 font-bold">❌</span>
                                                <span><strong>嚴禁俯拍</strong> (由上往下)</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* 3. Environment */}
                                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xl">
                                                💡
                                            </div>
                                            <h4 className="font-bold text-gray-900">3. 環境光線</h4>
                                        </div>
                                        {/* SVG Schema: Lighting */}
                                        <div className="w-full h-32 bg-white rounded-lg border border-amber-100 mb-3 flex items-center justify-center overflow-hidden">
                                            <svg viewBox="0 0 200 120" className="w-full h-full">
                                                {/* Good Light */}
                                                <g transform="translate(40, 20)">
                                                    <circle cx="20" cy="20" r="10" fill="#FCD34D" opacity="0.5" />
                                                    <circle cx="20" cy="20" r="5" fill="#F59E0B" />
                                                    <text x="0" y="45" fontSize="8" fill="#D97706">Front Light</text>
                                                    <text x="50" y="60" fontSize="20" fill="#10B981">✓</text>

                                                    {/* Person */}
                                                    <circle cx="50" cy="80" r="8" fill="#CBD5E1" />
                                                </g>

                                                {/* Divider */}
                                                <line x1="100" y1="10" x2="100" y2="110" stroke="#E2E8F0" strokeWidth="1" />

                                                {/* Bad Light */}
                                                <g transform="translate(130, 20)">
                                                    {/* Window */}
                                                    <rect x="30" y="60" width="20" height="30" fill="#BAE6FD" />
                                                    <text x="35" y="55" fontSize="8" fill="#0EA5E9">Window</text>
                                                    <text x="0" y="60" fontSize="20" fill="#EF4444">✕</text>

                                                    {/* Person Silhouette */}
                                                    <circle cx="20" cy="80" r="8" fill="#1E293B" />
                                                </g>
                                            </svg>
                                        </div>
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            <li className="flex gap-2">
                                                <span className="text-amber-500">✅</span>
                                                <span>光源充足，背景單純</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="text-red-500 font-bold">❌</span>
                                                <span><strong>避免背光</strong> (背後不要有窗戶)</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* 4. Subject */}
                                    <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl">
                                                🪑
                                            </div>
                                            <h4 className="font-bold text-gray-900">4. 亞健康長輩坐姿</h4>
                                        </div>
                                        {/* SVG Schema: Seated Posture */}
                                        <div className="w-full h-32 bg-white rounded-lg border border-green-100 mb-3 flex items-center justify-center overflow-hidden">
                                            <svg viewBox="0 0 200 120" className="w-full h-full">
                                                {/* Chair */}
                                                <path d="M80 60 L80 110" stroke="#94A3B8" strokeWidth="4" />
                                                <path d="M80 90 L120 90" stroke="#94A3B8" strokeWidth="4" />
                                                <path d="M120 90 L120 110" stroke="#94A3B8" strokeWidth="4" />

                                                {/* Person Sitting Upright */}
                                                <line x1="100" y1="90" x2="100" y2="40" stroke="#10B981" strokeWidth="6" strokeLinecap="round" /> {/* Spine */}
                                                <circle cx="100" cy="30" r="12" fill="#10B981" opacity="0.2" /> {/* Halo */}
                                                <circle cx="100" cy="30" r="8" fill="#047857" /> {/* Head */}

                                                <text x="130" y="50" fontSize="10" fill="#047857" fontWeight="bold">Sit Upright</text>
                                                <path d="M125 55 L110 40" stroke="#047857" strokeWidth="1" markerEnd="url(#arrowhead)" />

                                                {/* Arm */}
                                                <path d="M100 50 L120 70" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            <li className="flex gap-2">
                                                <span className="text-green-500">✅</span>
                                                <span>坐姿端正，臀部坐滿單人椅</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="text-green-500">✅</span>
                                                <span>稍微捲袖，露出手肘與手腕</span>
                                            </li>
                                        </ul>
                                    </div>

                                </div>

                                {/* Footer Action */}
                                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={onClose}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-200"
                                    >
                                        我了解了，開始檢測
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
