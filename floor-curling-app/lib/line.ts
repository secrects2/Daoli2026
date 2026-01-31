const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile'

export async function getLineToken(code: string, redirectUri: string) {
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', code)
    params.append('redirect_uri', redirectUri)
    params.append('client_id', process.env.LINE_CHANNEL_ID!)
    params.append('client_secret', process.env.LINE_CHANNEL_SECRET!)

    const res = await fetch(LINE_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    })

    if (!res.ok) {
        const error = await res.json()
        console.error('LINE Token Error:', error)
        throw new Error(error.error_description || 'Failed to exchange LINE token')
    }

    return res.json()
}

export async function getLineProfile(accessToken: string) {
    const res = await fetch(LINE_PROFILE_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })

    if (!res.ok) {
        throw new Error('Failed to fetch LINE profile')
    }

    return res.json()
}

export async function pushMessage(userId: string, messages: any[]) {
    // Check if Access Token is provided
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

    if (!channelAccessToken) {
        console.warn('⚠️ LINE Push Message Skipped: LINE_CHANNEL_ACCESS_TOKEN is not set.')
        return
    }

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify({
            to: userId,
            messages: messages
        })
    })

    if (!res.ok) {
        const error = await res.json()
        console.error('LINE Push Error:', error)
        // Don't throw error to avoid breaking the main flow, just log it
    } else {
        console.log('✅ LINE Push Sent to:', userId)
    }
}
