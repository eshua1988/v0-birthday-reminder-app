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
    iat: now - 30,
  }

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(unsigned, 'utf8')
  sign.end()
  const signature = sign.sign(serviceAccount.private_key)
  const jwt = `${unsigned}.${base64url(signature)}`

  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Failed to fetch access token (status ${tokenRes.status}): ${text}`)
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

    let serviceAccount: any = raw
    // If value is a JSON string (possibly with escaped newlines), try to normalize and parse it robustly
    if (typeof raw === 'string') {
      let candidate = raw.trim()
      // If wrapped in extra quotes, remove them
      if ((candidate.startsWith('"') && candidate.endsWith('"')) || (candidate.startsWith("'") && candidate.endsWith("'"))) {
        candidate = candidate.slice(1, -1)
      }

      // Try direct parse first
      try {
        serviceAccount = JSON.parse(candidate)
      } catch (err) {
        // Replace escaped newlines and try parse again
        try {
          const replaced = candidate.replace(/\\n/g, '\n')
          serviceAccount = JSON.parse(replaced)
        } catch (err2) {
          // As a last resort, leave raw as-is
          serviceAccount = raw
        }
      }
    }

    // Ensure private_key has real newlines (in case it's stored with escaped \n and parsing missed it)
    if (serviceAccount && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '').trim()
    }

    // Basic validation
    if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
      return NextResponse.json({ error: 'Invalid service account configuration. Ensure FIREBASE_SERVICE_ACCOUNT_KEY contains the full JSON for the service account with a valid private_key and client_email.' }, { status: 500 })
    }
    if (!serviceAccount.private_key.includes('-----BEGIN')) {
      return NextResponse.json({ error: 'serviceAccount.private_key does not look valid. Ensure newlines are preserved (replace \\n with actual newlines) when setting the environment variable.' }, { status: 500 })
    }
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

    if (action === 'insert-shift') {
      // Insert N blank columns at the specified position, then write data there
      // 1. Get spreadsheet metadata to find sheetId
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!metaRes.ok) {
        const text = await metaRes.text()
        return NextResponse.json({ error: text }, { status: metaRes.status })
      }
      const meta = await metaRes.json()

      // Find sheetId by name from range like 'SheetName'!A1 or SheetName!A1
      const sheetNameMatch = range.match(/^'?([^'!]+)'?!/)
      const sheetName = sheetNameMatch ? sheetNameMatch[1] : ''
      const sheet = meta.sheets?.find((s: any) =>
        s.properties.title === sheetName || (!sheetName && s.properties.index === 0)
      )
      const sheetId = sheet?.properties?.sheetId ?? 0

      // Parse column index from range (e.g. 'Sheet1'!F1 → 5, A1 → 0)
      const colMatch = range.match(/!([A-Z]+)/i)
      const colStr = colMatch ? colMatch[1].toUpperCase() : 'A'
      let colIndex = 0
      for (let i = 0; i < colStr.length; i++) {
        colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64)
      }
      colIndex -= 1 // convert to 0-based

      const numCols = (values as any[][])[0]?.length || 1

      // 2. Insert blank columns at colIndex
      const batchRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              insertDimension: {
                range: { sheetId, dimension: 'COLUMNS', startIndex: colIndex, endIndex: colIndex + numCols },
                inheritFromBefore: false,
              }
            }]
          }),
        }
      )
      if (!batchRes.ok) {
        const text = await batchRes.text()
        return NextResponse.json({ error: text }, { status: batchRes.status })
      }

      // 3. Write data into the newly inserted columns
      const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values }),
        }
      )
      if (!writeRes.ok) {
        const text = await writeRes.text()
        return NextResponse.json({ error: text }, { status: writeRes.status })
      }
      const data = await writeRes.json()
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
