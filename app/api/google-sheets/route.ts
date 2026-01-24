import { NextResponse } from 'next/server'
import crypto from 'crypto'

function base64url(input: Buffer | string) {
  const base64 = (typeof input === 'string' ? Buffer.from(input) : input).toString('base64')
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function fetchAccessToken(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(unsigned)
  sign.end()
  const signature = sign.sign(serviceAccount.private_key, 'base64')
  const jwt = `${unsigned}.${base64url(signature)}`

  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error('Failed to fetch access token: ' + text)
  }
  const data = await tokenRes.json()
  return data.access_token
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, spreadsheetId, range, values } = body

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT || ''
    if (!raw) return NextResponse.json({ error: 'No service account configured' }, { status: 500 })

    const serviceAccount = typeof raw === 'string' && raw.trim().startsWith('{') ? JSON.parse(raw) : raw
    const token = await fetchAccessToken(serviceAccount)

    if (!spreadsheetId) return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 })

    if (action === 'read') {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ data })
    }

    if (action === 'write') {
      // values should be array of arrays
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      })
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
