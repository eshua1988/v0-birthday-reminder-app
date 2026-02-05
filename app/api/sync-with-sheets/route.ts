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
    throw new Error(`Failed to fetch access token: ${text}`)
  }
  const data = await tokenRes.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    const supabase = createServiceRoleClient()

    // Get user from request
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    let userId: string | null = null
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id || null
    }

    if (!userId) {
      // Try to get from supabase context
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load settings for current user
    const { data: settings } = await supabase
      .from('settings')
      .select('key,value')
      .eq('user_id', userId)
      .in('key', ['spreadsheet_id', 'sheet_range', 'google_sheets_sheet_name'])

    const spreadsheet_id = settings?.find(s => s.key === 'spreadsheet_id')?.value
    const sheet_range = settings?.find(s => s.key === 'sheet_range')?.value || "'Data app'!A:Z"
    const sheet_name = settings?.find(s => s.key === 'google_sheets_sheet_name')?.value

    if (!spreadsheet_id) {
      return NextResponse.json({ error: 'Google Sheets not configured' }, { status: 400 })
    }

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT || ''
    if (!raw) return NextResponse.json({ error: 'No service account configured' }, { status: 500 })

    let serviceAccount: any = raw
    try {
      serviceAccount = typeof raw === 'string' ? JSON.parse(raw.replace(/\\n/g, '\n')) : raw
    } catch {
      serviceAccount = raw
    }

    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      return NextResponse.json({ error: 'Invalid service account' }, { status: 500 })
    }

    const accessToken = await fetchAccessToken(serviceAccount)

    if (action === 'export') {
      // Export birthdays to Google Sheets
      const { data: birthdays } = await supabase
        .from('birthdays')
        .select('*')
        .eq('user_id', userId)
        .order('birth_date')

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
        throw new Error(`Failed to write to Google Sheets: ${error}`)
      }

      return NextResponse.json({ success: true, action: 'export', rows: values.length - 1 })
    } else if (action === 'import') {
      // Import from Google Sheets
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
        throw new Error('Failed to read from Google Sheets')
      }

      const result = await sheetsRes.json()
      const rows = result.values || []

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

      // Delete records
      if (toDeleteById.length > 0) {
        await supabase.from('birthdays').delete().in('id', toDeleteById).eq('user_id', userId)
      }

      for (const del of toDeleteByFields) {
        let q = supabase.from('birthdays').delete().eq('user_id', userId)
        if (del.first_name) q = q.eq('first_name', del.first_name)
        if (del.last_name) q = q.eq('last_name', del.last_name)
        if (del.birth_date) q = q.eq('birth_date', del.birth_date)
        await q
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

        const { data: existing } = await q.limit(1).single().catch(() => ({ data: null }))

        if (existing?.id) {
          // Update existing
          await supabase
            .from('birthdays')
            .update(rec)
            .eq('id', existing.id)
            .eq('user_id', userId)
        } else {
          // Insert new
          await supabase
            .from('birthdays')
            .insert({ ...rec, user_id: userId })
        }
        imported++
      }

      return NextResponse.json({
        success: true,
        action: 'import',
        imported,
        deleted: toDeleteById.length + toDeleteByFields.length,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[v0] Sync error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
