import Link from 'next/link'

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 shadow rounded-lg">
                <div className="mb-8">
                    <Link href="/" className="text-blue-600 hover:text-blue-800">
                        ← 返回首頁
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">隱私權政策 (Privacy Policy)</h1>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-4">
                    <p className="text-sm text-gray-500">最後更新日期：2026年1月31日</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">1. 引言</h2>
                    <p>
                        歡迎使用道里地壺球數位平台（以下簡稱「本平台」）。我們非常重視您的隱私權。
                        本政策旨在說明我們如何收集、使用及保護您的個人資訊。
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">2. 我們收集的資訊</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>LINE 帳號資訊：</strong> 當您透過 LINE 登入時，我們會收集您的公開個人檔案（顯示名稱、頭像）及唯一識別碼 (User ID)，用於建立帳號與身分驗證。
                        </li>
                        <li>
                            <strong>長者資料 (UID)：</strong> 若您是家屬，我們會記錄您綁定的長者編號，以便提供比賽數據查詢服務。
                        </li>
                        <li>
                            <strong>使用記錄：</strong> 我們會記錄比賽成績、積分變動及系統操作歷程（如登入時間）。
                        </li>
                    </ul>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">3. 資訊的使用方式</h2>
                    <p>我們收集的資訊僅用於以下用途：</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>驗證您的身分並提供個人化服務。</li>
                        <li>記錄與統計地壺球比賽成績。</li>
                        <li>發送比賽結果通知及平台重要公告。</li>
                        <li>維護系統安全並防止濫用。</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">4. 資料包含與安全</h2>
                    <p>
                        本平台採用符合業界標準的安全技術（如 RLS 資料列級安全機制）保護您的資料。
                        您的個人資訊儲存於安全的雲端資料庫中，僅限授權人員存取。
                        我們承諾絕不將您的個人資料販售或無故洩漏給第三方。
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">5. 您的權利</h2>
                    <p>
                        您有權隨時要求刪除您的帳號及相關個人資料。
                        若需行使此權利，請透過 LINE 官方帳號與我們聯繫。
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">6. 政策更新</h2>
                    <p>
                        我們可能會不時修訂本隱私權政策。更新後的版本將公佈於本頁面，恕不另行個別通知。
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6">7. 聯絡我們</h2>
                    <p>
                        若您對本隱私權政策有任何疑問，請聯繫道里總部管理團隊。
                    </p>
                </div>
            </div>
        </div>
    )
}
