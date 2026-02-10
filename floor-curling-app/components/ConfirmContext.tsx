'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'info';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

    const confirm = (opts: ConfirmOptions) => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve);
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolver) resolver(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (resolver) resolver(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {options.title || '確認'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {options.message.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    <br />
                                </React.Fragment>
                            ))}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                                autoFocus
                            >
                                {options.cancelLabel || '取消'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-colors shadow-lg ${options.variant === 'info'
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                        : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                    }`}
                            >
                                {options.confirmLabel || '確定'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
