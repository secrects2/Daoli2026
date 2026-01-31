import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    // Force production URL to match LINE Console strict allowlist
    const callbackUrl = `https://daoli2026.vercel.app/api/auth/line/callback`
    const clientId = process.env.LINE_CHANNEL_ID
    const state = Math.random().toString(36).substring(7) // Simple state for now

    if (!clientId) {
        return NextResponse.json({ error: 'LINE_CHANNEL_ID not set' }, { status: 500 })
    }

    const lineUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
    lineUrl.searchParams.append('response_type', 'code')
    lineUrl.searchParams.append('client_id', clientId)
    lineUrl.searchParams.append('redirect_uri', callbackUrl)
    lineUrl.searchParams.append('state', state)
    lineUrl.searchParams.append('scope', 'profile openid')

    return NextResponse.redirect(lineUrl)
}
