import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import crypto from 'crypto'
import { format, parse } from 'date-fns'
import { Birthday } from '@/types/birthday'

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

  console.log('[v0] Creating JWT with iss:', serviceAccount.client_email)

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(unsigned, 'utf8')
  sign.end()
  const signature = sign.sign(serviceAccount.private_key)
  const jwt = `${unsigned}.${base64url(signature)}`

  console.log('[v0] JWT created, sending to token endpoint:', serviceAccount.token_uri || 'https://oauth2.googleapis.com/token')

  const tokenRes = await fetch(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  })

  console.log('[v0] Token endpoint response status:', tokenRes.status)

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    console.error('[v0] Token endpoint error response:', text)
    throw new Error(`Failed to fetch access token: ${text}`)
  }
  const data = await tokenRes.json()
  console.log('[v0] Token obtained successfully')
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    const supabase = createServiceRoleClient()

    console.log('[v0] Sync endpoint called with action:', action)

    // Get user from request authorization header
    const authHeader = request.headers.get('authorization')
    console.log('[v0] Authorization header present:', !!authHeader)
    const token = authHeader?.replace('Bearer ', '')
    console.log('[v0] Token extracted:', !!token, token?.substring(0, 20) + '...')
    
    let userId: string | null = null
    
    if (token) {
      try {
        console.log('[v0] Attempting to get user from token...')
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error) {
          console.error('[v0] Error getting user from token:', error.message, error.code)
        } else if (user) {
          userId = user.id
          console.log('[v0] Got user from token:', userId)
        } else {
          console.log('[v0] No user in response, user is null')
        }
      } catch (e: any) {
        console.error('[v0] Exception getting user from token:', e.message, e.cause)
      }
    } else {
      console.log('[v0] No token provided in authorization header')
    }

    if (!userId) {
      console.log('[v0] No user found in token, trying default context')
      try {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id || null
        if (userId) console.log('[v0] Got user from default context:', userId)
      } catch (e: any) {
        console.error('[v0] Exception getting user from context:', e.message)
      }
    }

    if (!userId) {
      console.error('[v0] Unauthorized - no user ID')
      return NextResponse.json({ error: 'Unauthorized - no user ID' }, { status: 401 })
    }

    // Load settings for current user
    console.log('[v0] Loading settings for user:', userId)
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)

    if (settingsError) {
      console.error('[v0] Error loading settings:', settingsError.message)
      return NextResponse.json({ error: 'Failed to load settings: ' + settingsError.message }, { status: 500 })
    }

    console.log('[v0] Settings loaded:', settings?.length || 0, 'rows')

    // Find spreadsheet_id from either direct column or key-value pair
    let spreadsheet_id = (settings as any)?.[0]?.spreadsheet_id
    let sheet_range = (settings as any)?.[0]?.sheet_range || "'Data app'!A:Z"

    if (!spreadsheet_id) {
      // Try finding in key-value pairs
      const spreadsheetSetting = settings?.find((s: any) => s.key === 'spreadsheet_id')
      spreadsheet_id = spreadsheetSetting?.value
    }

    if (!sheet_range || sheet_range === "'Data app'!A:Z") {
      const rangeSetting = settings?.find((s: any) => s.key === 'sheet_range')
      sheet_range = rangeSetting?.value || "'Data app'!A:Z"
    }

    console.log('[v0] Spreadsheet ID:', spreadsheet_id ? 'set' : 'not set')

    if (!spreadsheet_id) {
      return NextResponse.json({ error: 'Google Sheets not configured' }, { status: 400 })
    }

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT || ''
    if (!raw) {
      console.error('[v0] No service account configured in env vars')
      console.error('[v0] Checking env vars: FIREBASE_SERVICE_ACCOUNT_KEY=', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'GOOGLE_SERVICE_ACCOUNT=', !!process.env.GOOGLE_SERVICE_ACCOUNT)
      return NextResponse.json({ error: 'No service account configured' }, { status: 500 })
    }

    console.log('[v0] Service account env found, length:', (raw as string).length)

    let serviceAccount: any = raw
    try {
      // Remove actual newlines from the string and parse
      const cleaned = typeof raw === 'string' ? raw.split('\n').join('').trim() : raw
      serviceAccount = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned
      console.log('[v0] Service account parsed successfully')
    } catch (e: any) {
      console.error('[v0] Error parsing service account:', e.message)
      console.error('[v0] Raw string first 300 chars:', (raw as string).substring(0, 300))
      // Try to handle if it's a base64 encoded JSON
      try {
        const decoded = Buffer.from(raw as string, 'base64').toString('utf-8')
        serviceAccount = JSON.parse(decoded)
        console.log('[v0] Service account parsed from base64')
      } catch (e2: any) {
        console.error('[v0] Base64 parsing also failed:', e2.message)
        // Last resort: if raw is already an object
        if (typeof raw === 'object' && raw && (raw as any).private_key) {
          serviceAccount = raw
          console.log('[v0] Service account is already an object')
        } else {
          serviceAccount = null
        }
      }
    }

    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      console.error('[v0] Invalid service account structure')
      return NextResponse.json({ error: 'Invalid service account' }, { status: 500 })
    }

    console.log('[v0] Getting access token...')
    let accessToken: string
    try {
      accessToken = await fetchAccessToken(serviceAccount)
      console.log('[v0] Access token obtained')
    } catch (e: any) {
      console.error('[v0] Error getting access token:', e.message)
      return NextResponse.json({ error: 'Failed to get access token: ' + e.message }, { status: 500 })
    }

    if (action === 'export') {
      // Export birthdays to Google Sheets
      console.log('[v0] Starting export...')
      const { data: birthdays, error: bdayError } = await supabase
        .from('birthdays')
        .select('*')
        .eq('user_id', userId)
        .order('birth_date')

      if (bdayError) {
        console.error('[v0] Error fetching birthdays:', bdayError.message)
        return NextResponse.json({ error: 'Failed to fetch birthdays: ' + bdayError.message }, { status: 500 })
      }

      console.log('[v0] Found', birthdays?.length || 0, 'birthdays')

      const header = ['ID', 'Фамилия', 'Имя', 'Дата рождения', 'Телефон', 'Email', 'Время оповещения', 'Оповещение включено', 'Удалить']
      const values = [header]

      ;(birthdays || []).forEach((b: Birthday) => {
        values.push([
          (b as any).id || '',
          b.last_name || '',
          b.first_name || '',
          b.birth_date ? format(new Date(b.birth_date), 'dd.MM.yyyy') : '',
          b.phone || '',
          b.email || '',
          b.notification_time || '',
          b.notification_enabled ? 'Да' : 'Нет',
          '',
        ])
      })

      console.log('[v0] Writing to Google Sheets:', sheet_range)
      const sheetsRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(sheet_range)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      )

      if (!sheetsRes.ok) {
        const error = await sheetsRes.text()
        console.error('[v0] Google Sheets error:', error)
        throw new Error(`Failed to write to Google Sheets: ${error}`)
      }

      console.log('[v0] Export completed')
      return NextResponse.json({ success: true, action: 'export', rows: values.length - 1 })
    } else if (action === 'import') {
      // Import from Google Sheets
      console.log('[v0] Starting import...')
      const sheetsRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(sheet_range)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!sheetsRes.ok) {
        const error = await sheetsRes.text()
        console.error('[v0] Google Sheets read error:', error)
        throw new Error('Failed to read from Google Sheets: ' + error)
      }

      const result = await sheetsRes.json()
      const rows = result.values || []

      console.log('[v0] Read', rows.length, 'rows from Google Sheets')

      if (rows.length <= 1) {
        return NextResponse.json({ success: true, action: 'import', imported: 0, deleted: 0 })
      }

      const header = rows[0].map((h: any) => String(h || '').trim().toLowerCase())
      const records: any[] = []
      const toDeleteById: string[] = []
      const toDeleteByFields: any[] = []

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        const obj: any = {}
        header.forEach((h: string, idx: number) => { obj[h] = r[idx] })

        const id = obj['id'] || obj['ид'] || ''
        const last_name = obj['фамилия'] || obj['last name'] || obj['surname'] || ''
        const first_name = obj['имя'] || obj['first name'] || obj['name'] || ''
        const rawDate = obj['дата рождения'] || obj['birth date'] || obj['date'] || ''
        const deleteFlag = (obj['удалить'] || obj['delete'] || obj['remove'] || '')

        let birth_date = null
        if (rawDate) {
          const parsed = parse(String(rawDate), 'dd.MM.yyyy', new Date())
          if (!isNaN(parsed.getTime())) birth_date = format(parsed, 'yyyy-MM-dd')
          else {
            const iso = new Date(String(rawDate))
            if (!isNaN(iso.getTime())) birth_date = format(iso, 'yyyy-MM-dd')
          }
        }

        if (String(deleteFlag).toString().trim() !== '') {
          if (id) toDeleteById.push(String(id))
          else toDeleteByFields.push({ first_name: String(first_name || '').trim(), last_name: String(last_name || '').trim(), birth_date: birth_date || undefined })
          continue
        }

        records.push({
          id: id || undefined,
          first_name: first_name || '',
          last_name: last_name || '',
          birth_date: birth_date || null,
          phone: obj['телефон'] || obj['phone'] || null,
          email: obj['email'] || obj['e-mail'] || null,
        })
      }

      console.log('[v0] Found', records.length, 'records to import,', toDeleteById.length + toDeleteByFields.length, 'to delete')

      // Delete records
      if (toDeleteById.length > 0) {
        const { error: delError } = await supabase.from('birthdays').delete().in('id', toDeleteById).eq('user_id', userId)
        if (delError) console.error('[v0] Error deleting by ID:', delError.message)
      }

      for (const del of toDeleteByFields) {
        let q = supabase.from('birthdays').delete().eq('user_id', userId)
        if (del.first_name) q = q.eq('first_name', del.first_name)
        if (del.last_name) q = q.eq('last_name', del.last_name)
        if (del.birth_date) q = q.eq('birth_date', del.birth_date)
        const { error: delError } = await q
        if (delError) console.error('[v0] Error deleting by fields:', delError.message)
      }

      // Import records
      let imported = 0
      for (const rec of records) {
        if (!rec.first_name && !rec.last_name) continue

        let q = supabase.from('birthdays').select('id').eq('user_id', userId)
        if (rec.id) q = q.eq('id', rec.id)
        if (rec.first_name) q = q.eq('first_name', rec.first_name)
        if (rec.last_name) q = q.eq('last_name', rec.last_name)
        if (rec.birth_date) q = q.eq('birth_date', rec.birth_date)

        const { data: existing, error: existingError } = await q.limit(1).single()

        if (existing?.id) {
          // Update existing
          const { error: updateError } = await supabase
            .from('birthdays')
            .update(rec)
            .eq('id', existing.id)
            .eq('user_id', userId)
          if (updateError) console.error('[v0] Error updating birthday:', updateError.message)
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('birthdays')
            .insert({ ...rec, user_id: userId })
          if (insertError) console.error('[v0] Error inserting birthday:', insertError.message)
        }
        imported++
      }

      console.log('[v0] Import completed, imported:', imported)
      return NextResponse.json({
        success: true,
        action: 'import',
        imported,
        deleted: toDeleteById.length + toDeleteByFields.length,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[v0] Sync error:', error.message || error)
    console.error('[v0] Stack:', error.stack)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
