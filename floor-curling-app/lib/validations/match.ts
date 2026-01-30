import { z } from 'zod'

/**
 * 雙機流協議 (Dual-Cam Protocol) 驗證
 * - Cam B (Proof Cam): house_snapshot_url - 必填，大本營俯視圖
 * - Cam A (Vibe Cam): vibe_video_url - 選填，情緒影片
 */
export const matchEndSchema = z.object({
    endNumber: z.number().int().min(1).max(6),
    redScore: z.number().int().min(0).max(10),
    yellowScore: z.number().int().min(0).max(10),
    // 強制證據驗證 (Proof Cam - 防弊必要條件)
    houseSnapshotUrl: z.string()
        .min(1, { message: "【防弊協議】必須上傳 House Snapshot 證據照片" })
        .url({ message: "House Snapshot URL 格式無效" }),
    // 情緒影片 (Vibe Cam - 選填)
    vibeVideoUrl: z.string().url().optional().or(z.literal('')),
})

export const submitMatchSchema = z.object({
    redElderId: z.string().uuid({ message: "紅方長者 ID 格式無效" }),
    yellowElderId: z.string().uuid({ message: "黃方長者 ID 格式無效" }),
    storeId: z.string().min(1, { message: "藥局 ID 不可為空" }),
    ends: z.array(matchEndSchema).min(1, { message: "至少需要一個回合" }),
})

export type SubmitMatchInput = z.infer<typeof submitMatchSchema>
export type MatchEndInput = z.infer<typeof matchEndSchema>
