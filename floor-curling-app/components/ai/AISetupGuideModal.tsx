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
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            <li className="flex gap-2">
                                                <span className="text-blue-500">✅</span>
                                                <span>請站在投擲手的<strong>斜前方 45 度</strong></span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="text-blue-500">✅</span>
                                                <span>確保能同時看到<strong>手臂伸直</strong>與<strong>雙肩</strong></span>
                                            </li>
                                            <div className="mt-2 text-xs bg-white p-2 rounded-lg text-gray-500">
                                                ❌ 避免純正面 (手臂重疊)<br />
                                                ❌ 避免純側面 (擋住肩膀)
                                            </div>
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
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            <li className="flex gap-2">
                                                <span className="text-purple-500">✅</span>
                                                <span>約 <strong>100-120cm</strong> (肩膀高度)</span>
                                            </li>
                                            <li className="flex gap-2">
                                                <span className="text-red-500 font-bold">❌</span>
                                                <span><strong>嚴禁俯拍</strong> (由上往下)</span>
                                            </li>
                                            <div className="mt-2 text-xs bg-white p-2 rounded-lg text-gray-500">
                                                俯拍會導致角度計算錯誤，嚴重影響判讀！
                                            </div>
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
                                            <h4 className="font-bold text-gray-900">4. 長輩坐姿</h4>
                                        </div>
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            <li className="flex gap-2">
                                                <span className="text-green-500">✅</span>
                                                <span>臀部坐滿椅背</span>
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
