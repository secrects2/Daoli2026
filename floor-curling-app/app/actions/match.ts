'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 创建比赛和回合
export async function createMatch(formData: FormData) {
    try {
        const redElderId = formData.get('redElderId') as string
        const yellowElderId = formData.get('yellowElderId') as string
        const storeId = formData.get('storeId') as string
        const endsData = JSON.parse(formData.get('endsData') as string)

        // 1. 创建比赛记录
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert({
                store_id: storeId,
                red_team_elder_id: redElderId,
                yellow_team_elder_id: yellowElderId,
                status: 'in_progress'
            })
            .select()
            .single()

        if (matchError) throw matchError

        // 2. 创建回合记录
        const matchEnds = endsData.map((end: any, index: number) => ({
            match_id: match.id,
            end_number: index + 1,
            red_score: end.redScore,
            yellow_score: end.yellowScore,
            house_snapshot_url: end.houseSnapshotUrl || null,
            vibe_video_url: end.vibeVideoUrl || null
        }))

        const { error: endsError } = await supabase
            .from('match_ends')
            .insert(matchEnds)

        if (endsError) throw endsError

        // 3. 计算总分和获胜者
        const redTotalScore = endsData.reduce((sum: number, end: any) => sum + end.redScore, 0)
        const yellowTotalScore = endsData.reduce((sum: number, end: any) => sum + end.yellowScore, 0)

        let winnerColor = null
        let winnerId = null

        if (redTotalScore > yellowTotalScore) {
            winnerColor = 'red'
            winnerId = redElderId
        } else if (yellowTotalScore > redTotalScore) {
            winnerColor = 'yellow'
            winnerId = yellowElderId
        }

        // 4. 更新比赛状态
        await supabase
            .from('matches')
            .update({
                winner_color: winnerColor,
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', match.id)

        // 5. 更新获胜者积分
        if (winnerId) {
            await updateWallet(winnerId, 100, 50)
        }

        revalidatePath('/pharmacist/dashboard')

        return { success: true, matchId: match.id }
    } catch (error: any) {
        console.error('创建比赛失败:', error)
        return { success: false, error: error.message }
    }
}

// 更新钱包积分
async function updateWallet(userId: string, globalPoints: number, localPoints: number) {
    const { data: wallet } = await supabase
        .from('wallets')
        .select('global_points, local_points')
        .eq('user_id', userId)
        .single()

    if (wallet) {
        await supabase
            .from('wallets')
            .update({
                global_points: wallet.global_points + globalPoints,
                local_points: wallet.local_points + localPoints
            })
            .eq('user_id', userId)
    }
}

// 搜索长者
export async function searchElders(query: string) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('role', 'elder')
            .ilike('id', `%${query}%`)
            .limit(10)

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// 上传文件到 Storage
export async function uploadFile(file: File, matchId: string, endNumber: number, type: 'photo' | 'video') {
    try {
        const fileExt = file.name.split('.').pop()
        const fileName = type === 'photo'
            ? `match-${matchId}/house-snapshot-end-${endNumber}.${fileExt}`
            : `match-${matchId}/vibe-video-end-${endNumber}.${fileExt}`

        // 读取文件为 ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data, error } = await supabase.storage
            .from('evidence')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (error) throw error

        // 获取公共 URL
        const { data: { publicUrl } } = supabase.storage
            .from('evidence')
            .getPublicUrl(fileName)

        return { success: true, url: publicUrl }
    } catch (error: any) {
        console.error('文件上传失败:', error)
        return { success: false, error: error.message }
    }
}
