import { Suspense } from 'react'
import LoginForm from './login-form'

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    道里地壺球
                    <span className="block text-sm font-normal text-muted-foreground mt-2">
                        數位管理平台
                    </span>
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-card py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
                    <Suspense fallback={<div className="text-center p-4">載入中...</div>}>
                        <LoginForm />
                    </Suspense>
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    &copy; 2026 DaoLi Floor Curling. All rights reserved.
                </p>
            </div>
        </div>
    )
}
