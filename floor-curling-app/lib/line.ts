export async function getLineToken(code: string, redirectUri: string) {
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', code)
    params.append('redirect_uri', redirectUri)
    params.append('client_id', process.env.LINE_CHANNEL_ID!)
    params.append('client_secret', process.env.LINE_CHANNEL_SECRET!)

    const res = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    })

    if (!res.ok) {
        throw new Error('Failed to get LINE token')
    }

    return res.json()
}

export async function getLineProfile(accessToken: string) {
    const res = await fetch('https://api.line.me/v2/profile', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })

    if (!res.ok) {
        throw new Error('Failed to get LINE profile')
    }

    return res.json()
}

export async function pushMessage(userId: string, messages: any[]) {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        console.warn('⚠️ Missing LINE_CHANNEL_ACCESS_TOKEN, skipping push message')
        return
    }

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
            to: userId,
            messages: messages
        })
    })

    if (!res.ok) {
        const error = await res.json()
        console.error('LINE Push Error:', error)
        // Don't throw to avoid breaking the main chat flow, just log it.
    }
}
