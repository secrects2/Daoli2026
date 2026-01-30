import { createBrowserClient } from '@supabase/ssr'

// 獲取環境變量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 創建瀏覽器端 Supabase 客戶端（使用 cookie 存儲 session）
export const createClientComponentClient = () =>
    createBrowserClient(supabaseUrl, supabaseAnonKey)

// 導出類型定義
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    role: 'admin' | 'pharmacist' | 'family' | 'elder'
                    store_id: string | null
                    linked_family_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    role?: 'admin' | 'pharmacist' | 'family' | 'elder'
                    store_id?: string | null
                    linked_family_id?: string | null
                }
                Update: {
                    role?: 'admin' | 'pharmacist' | 'family' | 'elder'
                    store_id?: string | null
                    linked_family_id?: string | null
                }
            }
        }
    }
}
