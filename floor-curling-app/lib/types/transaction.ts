/**
 * 交易記錄類型定義
 * 對應資料庫 transactions 表
 */

export type TransactionType =
    | 'match_win'           // 比賽勝利 (Global + Local)
    | 'match_participate'   // 比賽參與 (敗方獎勵)
    | 'local_grant'         // 藥師發放 Local Points
    | 'local_redeem'        // 兌換商品扣除 Local Points
    | 'adjustment'          // 管理員調整

export interface Transaction {
    id: string
    user_id: string
    type: TransactionType
    global_points_delta: number
    local_points_delta: number
    global_points_after: number
    local_points_after: number
    match_id: string | null
    store_id: string | null
    operator_id: string | null
    operator_role: string | null
    description: string | null
    evidence_url: string | null
    created_at: string
}

export interface TransactionCreateInput {
    user_id: string
    type: TransactionType
    global_points_delta: number
    local_points_delta: number
    global_points_after: number
    local_points_after: number
    match_id?: string | null
    store_id?: string | null
    operator_id?: string | null
    operator_role?: string | null
    description?: string | null
    evidence_url?: string | null
}
