import Link from 'next/link'

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 shadow rounded-lg">
                <div className="mb-8">
                    <Link href="/" className="text-blue-600 hover:text-blue-800">
                        ← 返回首頁
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">服務條款 (Terms of Service)</h1>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-4">
                    <p className="text-sm text-gray-500">最後更新日期：2026年1月31日</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">1. 同意條款</h2>
                    <p>
                        當您訪問或使用道里地壺球數位平台（以下簡稱「本服務」），即表示您已閱讀、理解並同意受本服務條款的約束。
                        若您不同意本條款的任何部分，請停止使用本服務。
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">2. 服務內容</h2>
                    <p>
                        本服務提供地壺球比賽的數位化計分、數據記錄、家屬查詢及相關社群功能。
                        我們保留隨時修改、暫停或終止部分或全部服務的權利。
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">3. 帳號規範</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>您需透過 LINE 帳號進行註冊，並確保提供真實、準確的資訊。</li>
                        <li>您有責任維護帳號的安全，對於使用該帳號進行的所有活動負責。</li>
                        <li>嚴禁使用他人帳號或試圖破壞系統安全。</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">4. 使用者行為</h2>
                    <p>您在使用本服務時，不得進行以下行為：</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>輸入虛假比賽數據或試圖操縱積分。</li>
                        <li>干擾或破壞服務的正常運作。</li>
                        <li>發佈違法、仇恨或侵犯他人權益的內容。</li>
                    </ul>
                    <p>若違反上述規範，我們有權立即暫停或終止您的帳號。</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">5. 智慧財產權</h2>
                    <p>
                        本服務包含的所有內容（包括但不限於文字、圖標、程式碼及系統架構）均歸道里總部或相關權利人所有，
                        受著作權法及相關法律保護。未經授權，不得擅自複製或使用。
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">6. 免責聲明</h2>
                    <p>
                        本服務按「現狀」提供，不保證服務不會中斷或無錯誤。
                        對於因使用本服務而產生的任何直接或間接損害，我們不承擔賠償責任，除非法律另有規定。
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">7. 適用法律</h2>
                    <p>
                        本條款之解釋與適用，均依據中華民國法律為準據法。
                    </p>
                </div>
            </div>
        </div>
    )
}
