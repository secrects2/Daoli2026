import { Suspense } from 'react'
import LoginForm from './login-form'

export default function LoginPage() {
    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-black">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                {/* Gradient Blobs */}
                <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-purple-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute top-[20%] right-[0%] w-[60vw] h-[60vw] bg-blue-600/30 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow delay-1000"></div>
                <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] bg-pink-600/30 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow delay-2000"></div>
            </div>

            {/* Glass Container */}
            <div className="relative z-10 w-full max-w-md w-full animate-scale-in">
                {/* Card */}
                <div className="backdrop-blur-xl bg-white/70 shadow-glass border border-white/50 rounded-3xl p-8 sm:p-10 relative overflow-hidden">

                    {/* Decorative Shine */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-xl"></div>

                    {/* Header */}
                    <div className="text-center mb-8 relative z-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg mb-4 transform rotate-3 hover:rotate-6 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-gray-900 drop-shadow-sm">
                            道里地壺球
                        </h2>
                        <p className="mt-2 text-sm font-medium text-gray-500 uppercase tracking-widest">
                            數位管理平台
                        </p>
                    </div>

                    {/* Form Component */}
                    <Suspense fallback={
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    }>
                        <LoginForm />
                    </Suspense>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-white/40 font-medium tracking-wide">
                    &copy; 2026 DaoLi Floor Curling. <br /> Designed for Digital Health.
                </p>
            </div>
        </div>
    )
}
