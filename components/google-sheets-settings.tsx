"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

const supabase = createClient()

function extractSpreadsheetId(input: string) {
  if (!input) return input
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (urlMatch) return urlMatch[1]
  // if user pasted a full url with /edit#gid etc, try query
  const idOnly = input.trim()
  return idOnly
}

export const GoogleSheetsSettings: React.FC = () => {
  const { toast } = useToast()
  const [autoSync, setAutoSync] = useState(false)
  const [autoDeleteCheck, setAutoDeleteCheck] = useState(false)
  const [spreadsheetInput, setSpreadsheetInput] = useState("")
  const [sheetRange, setSheetRange] = useState("'Data app'!A:Z")
  const [isSaving, setIsSaving] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: ss } = await supabase
          .from('settings')
          .select('key,value')
          .eq('user_id', user.id)
          .in('key', ['spreadsheet_id','sheet_range','google_sheets_auto_sync','google_sheets_auto_delete_check'])

        if (ss && Array.isArray(ss)) {
          ss.forEach((r: any) => {
            if (r.key === 'spreadsheet_id') setSpreadsheetInput(r.value || '')
            if (r.key === 'sheet_range') setSheetRange(r.value || "'Data app'!A:Z")
            if (r.key === 'google_sheets_auto_sync') setAutoSync(r.value === 'true')
            if (r.key === 'google_sheets_auto_delete_check') setAutoDeleteCheck(r.value === 'true')
          })
        }
      } catch (e) {
        console.error('Failed to load sheets settings', e)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const spreadsheetId = extractSpreadsheetId(spreadsheetInput)

      // upsert multiple keys
      const entries = [
        { user_id: user.id, key: 'spreadsheet_id', value: spreadsheetId || null },
        { user_id: user.id, key: 'sheet_range', value: sheetRange || "'Data app'!A:Z" },
        { user_id: user.id, key: 'google_sheets_auto_sync', value: autoSync ? 'true' : 'false' },
        { user_id: user.id, key: 'google_sheets_auto_delete_check', value: autoDeleteCheck ? 'true' : 'false' },
      ]

      const { error } = await supabase.from('settings').upsert(entries, { onConflict: 'user_id,key' })
      if (error) throw error

      toast({ title: 'Сохранено', description: 'Настройки Google Sheets обновлены' })
    } catch (e: any) {
      console.error(e)
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить настройки', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Sheets</CardTitle>
        <CardDescription>Синхронизация с вашей таблицей</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="font-medium">Автоматическая синхронизация</Label>
            <p className="text-sm text-muted-foreground">Автосинхронизация данных в фоновом режиме</p>
          </div>
          <Switch checked={autoSync} onCheckedChange={setAutoSync} />
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="font-medium">Автопроверка удалений (каждую минуту)</Label>
            <p className="text-sm text-muted-foreground">Проверять удалённые строки в таблице</p>
          </div>
          <Switch checked={autoDeleteCheck} onCheckedChange={setAutoDeleteCheck} />
        </div>

        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Настройки</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Настройки Google Sheets</DialogTitle>
                <DialogDescription>Укажите ID или ссылку на вашу таблицу и диапазон листа</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label>ID или ссылка на таблицу</Label>
                  <Input value={spreadsheetInput} onChange={(e) => setSpreadsheetInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/... или ID" />
                </div>

                <div>
                  <Label>Диапазон листа</Label>
                  <Input value={sheetRange} onChange={(e) => setSheetRange(e.target.value)} placeholder="'Data app'!A:Z" />
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Как настроить:</p>
                  <ol className="list-decimal ml-5">
                    <li>Создайте новую Google таблицу</li>
                    <li>Откройте доступ для сервисного аккаунта</li>
                    <li>Скопируйте ссылку или ID таблицы</li>
                    <li>Вставьте сюда и сохраните</li>
                  </ol>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Отмена</Button>
                </DialogClose>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить настройки'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="ml-2 flex gap-2">
            <Button onClick={async () => {
              setIsProcessing(true)
              try {
                const spreadsheetId = extractSpreadsheetId(spreadsheetInput)
                if (!spreadsheetId) throw new Error('Spreadsheet ID not configured')
                const { data: birthdays, error } = await supabase.from('birthdays').select('*').order('birth_date')
                if (error) throw error

                const header = ['ID','Фамилия','Имя','Дата рождения','Телефон','Email','Время оповещения','Оповещение включено','Удалить']
                const values: any[] = [header]
                ;(birthdays || []).forEach((b: any) => {
                  values.push([
                    b.id || '',
                    b.last_name || '',
                    b.first_name || '',
                    b.birth_date ? (new Date(b.birth_date)).toLocaleDateString('ru-RU').split('.').reverse().join('.') : (b.birth_date ? b.birth_date : ''),
                    b.phone || '',
                    b.email || '',
                    b.notification_time || '',
                    b.notification_enabled ? 'Да' : 'Нет',
                    '',
                  ])
                })

                const resp = await fetch('/api/google-sheets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'write', spreadsheetId, range: sheetRange || "'Data app'!A:Z", values }),
                })
                const body = await resp.json()
                if (!resp.ok) throw new Error(body.error || 'Failed to write to Google Sheets')
                toast({ title: 'Экспорт', description: `Записано ${values.length - 1} строк` })
              } catch (e: any) {
                console.error('Export to Google Sheets failed', e)
                toast({ title: 'Ошибка экспорта', description: e.message || String(e), variant: 'destructive' })
              } finally {
                setIsProcessing(false)
              }
            }} disabled={isProcessing} variant="outline">Экспорт в Google Sheets</Button>

            <Button onClick={async () => {
              setIsProcessing(true)
              try {
                const spreadsheetId = extractSpreadsheetId(spreadsheetInput)
                if (!spreadsheetId) throw new Error('Spreadsheet ID not configured')
                const resp = await fetch('/api/google-sheets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'read', spreadsheetId, range: sheetRange || "'Data app'!A:Z" }),
                })
                const result = await resp.json()
                if (!resp.ok) throw new Error(result.error || 'Failed to read from Google Sheets')

                const rows = result.data?.values || []
                if (rows.length <= 1) {
                  toast({ title: 'Импорт', description: 'Таблица пуста или только заголовки' })
                  return
                }

                const header = rows[0].map((h: any) => String(h || '').trim().toLowerCase())
                const records: any[] = []
                const toDeleteById: Array<{ id: string, rowIndex: number }> = []
                const toDeleteByFields: Array<{ first_name?: string, last_name?: string, birth_date?: string, rowIndex: number }> = []

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
                    const parsed = new Date(String(rawDate))
                    if (!isNaN(parsed.getTime())) birth_date = parsed.toISOString().slice(0,10)
                  }

                  if (String(deleteFlag).toString().trim() !== '') {
                    if (id) toDeleteById.push({ id: String(id), rowIndex: i + 1 })
                    else toDeleteByFields.push({ first_name: String(first_name || '').trim(), last_name: String(last_name || '').trim(), birth_date: birth_date || undefined, rowIndex: i + 1 })
                    continue
                  }

                  records.push({ id: id || undefined, first_name: first_name || '', last_name: last_name || '', birth_date: birth_date || null, phone: obj['телефон'] || obj['phone'] || obj['telefon'] || null, email: obj['email'] || obj['e-mail'] || null })
                }

                // Process deletions first
                if (toDeleteById.length > 0) {
                  for (const del of toDeleteById) {
                    try { await supabase.from('birthdays').delete().eq('id', del.id) } catch (err) { console.warn('Failed to delete by id', del.id, err) }
                    try { await fetch('/api/google-sheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'write', spreadsheetId, range: `${sheetRange.split('!')[0] || "'Data app'"}!A${del.rowIndex}:Z${del.rowIndex}`, values: [Array(header.length).fill('')] }) }) } catch (err) { console.warn('Failed to clear sheet row', del.rowIndex, err) }
                  }
                }

                if (toDeleteByFields.length > 0) {
                  for (const del of toDeleteByFields) {
                    try {
                      let query = supabase.from('birthdays').delete()
                      if (del.birth_date) query = query.eq('birth_date', del.birth_date)
                      if (del.first_name) query = query.eq('first_name', del.first_name)
                      if (del.last_name) query = query.eq('last_name', del.last_name)
                      await query
                    } catch (err) { console.warn('Failed to delete by fields', del, err) }
                    try { await fetch('/api/google-sheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'write', spreadsheetId, range: `${sheetRange.split('!')[0] || "'Data app'"}!A${del.rowIndex}:Z${del.rowIndex}`, values: [Array(header.length).fill('')] }) }) } catch (err) { console.warn('Failed to clear sheet row', del.rowIndex, err) }
                  }
                }

                if (records.length > 0) {
                  const { error } = await supabase.from('birthdays').upsert(records)
                  if (error) throw error
                }

                toast({ title: 'Импорт', description: `Импортировано ${records.length} записей, удалено ${toDeleteById.length + toDeleteByFields.length}` })
                setTimeout(() => window.location.reload(), 1200)
              } catch (e: any) {
                console.error('Import from Google Sheets failed', e)
                toast({ title: 'Ошибка импорта', description: e.message || String(e), variant: 'destructive' })
              } finally {
                setIsProcessing(false)
              }
            }} disabled={isProcessing} variant="outline">Импорт из Google Sheets</Button>
          </div>

          {/* Открыть таблицу - располагаем после Экспорт/Импорт, стиль как primary */}
          <div className="ml-2">
            <Button onClick={async () => {
              const id = extractSpreadsheetId(spreadsheetInput)
              if (id) window.open(`https://docs.google.com/spreadsheets/d/${id}`, '_blank')
            }} className="px-6">
              Открыть таблицу
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default GoogleSheetsSettings
