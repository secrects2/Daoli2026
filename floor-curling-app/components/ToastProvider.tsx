'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                style: {
                    background: '#fff',
                    color: '#333',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    borderRadius: '0.75rem',
                    padding: '16px',
                    fontSize: '1rem',
                },
                success: {
                    iconTheme: {
                        primary: '#10B981',
                        secondary: '#ECFDF5',
                    },
                    style: {
                        border: '1px solid #E5E7EB',
                    }
                },
                error: {
                    iconTheme: {
                        primary: '#EF4444',
                        secondary: '#FEF2F2',
                    },
                    style: {
                        border: '1px solid #E5E7EB',
                    }
                },
            }}
        />
    );
}
