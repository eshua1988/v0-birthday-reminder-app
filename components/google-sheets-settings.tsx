"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, ExternalLink, Plus, Trash2, Upload, Download, TableProperties } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const supabase = createClient()

function extractSpreadsheetId(input: string) {
  if (!input) return input
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (urlMatch) return urlMatch[1]
  const idOnly = input.trim()
  return idOnly
}

// Builds a valid Sheets range like 'Лист4'!A:Z from sheet_name + sheet_range
function buildRange(sheetName: string, rangeInput: string): string {
  const range = (rangeInput || 'A:Z').trim()
  const name = (sheetName || '').trim()

  // If range already contains '!' — use as-is (user provided full range)
  if (range.includes('!')) return range

  if (!name) return range

  // Wrap sheet name in single quotes if it doesn't already have them
  const quotedName = name.startsWith("'") ? name : `'${name.replace(/'/g, "\\'")}'`
  return `${quotedName}!${range}`
}

interface BirthdayList {
  id: string
  name: string
}

interface SheetConnection {
  id: string
  spreadsheet_input: string
  spreadsheet_id: string
  sheet_name: string
  sheet_range: string
  list_id: string | null
  list_name: string
}

function makeConnection(overrides?: Partial<SheetConnection>): SheetConnection {
  return {
    id: crypto.randomUUID(),
    spreadsheet_input: "",
    spreadsheet_id: "",
    sheet_name: "",
    sheet_range: "'Data app'!A:Z",
    list_id: null,
    list_name: "Все участники",
    ...overrides,
  }
}

export const GoogleSheetsSettings: React.FC = () => {
  const { toast } = useToast()
  const [autoSync, setAutoSync] = useState(false)
  const [autoDeleteCheck, setAutoDeleteCheck] = useState(false)
  const [connections, setConnections] = useState<SheetConnection[]>([])
  const [lists, setLists] = useState<BirthdayList[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [prayerConnectionId, setPrayerConnectionId] = useState<string | null>(null)
  const [prayerListId, setPrayerListId] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConn, setEditingConn] = useState<SheetConnection>(makeConnection())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Load settings
        const { data: ss } = await supabase
          .from('settings')
          .select('key,value')
          .eq('user_id', user.id)
          .in('key', ['google_sheets_connections', 'spreadsheet_id', 'sheet_range', 'google_sheets_sheet_name', 'google_sheets_auto_sync', 'google_sheets_auto_delete_check', 'prayer_sheets_connection_id', 'prayer_list_id'])

        if (ss && Array.isArray(ss)) {
          let loadedConnections: SheetConnection[] = []
          let legacySpreadsheetId = ''
          let legacyRange = "'Data app'!A:Z"
          let legacySheetName = ''

          ss.forEach((r: any) => {
            if (r.key === 'google_sheets_connections') {
              try { loadedConnections = JSON.parse(r.value || '[]') } catch {}
            }
            if (r.key === 'spreadsheet_id') legacySpreadsheetId = r.value || ''
            if (r.key === 'sheet_range') legacyRange = r.value || "'Data app'!A:Z"
            if (r.key === 'google_sheets_sheet_name') legacySheetName = r.value || ''
            if (r.key === 'google_sheets_auto_sync') setAutoSync(r.value === 'true')
            if (r.key === 'google_sheets_auto_delete_check') setAutoDeleteCheck(r.value === 'true')
            if (r.key === 'prayer_sheets_connection_id') setPrayerConnectionId(r.value || null)
            if (r.key === 'prayer_list_id') setPrayerListId(r.value || null)
          })

          // Migrate legacy single connection
          if (loadedConnections.length === 0 && legacySpreadsheetId) {
            loadedConnections = [{
              id: crypto.randomUUID(),
              spreadsheet_input: legacySpreadsheetId,
              spreadsheet_id: legacySpreadsheetId,
              sheet_name: legacySheetName,
              sheet_range: legacyRange,
              list_id: null,
              list_name: "Все участники",
            }]
          }
          setConnections(loadedConnections)
        }

        // Load birthday lists
        const { data: listsData } = await supabase
          .from('birthday_lists')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at')
        setLists(listsData || [])
      } catch (e) {
        console.error('Failed to load sheets settings', e)
      }
    }
    load()
  }, [])

  const saveConnections = async (updated: SheetConnection[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('settings').upsert(
        [{ user_id: user.id, key: 'google_sheets_connections', value: JSON.stringify(updated) }],
        { onConflict: 'user_id,key' }
      )
    } catch (e) {
      console.error('Failed to save connections', e)
    }
  }

  const handleSaveConnection = async () => {
    setIsSaving(true)
    try {
      const spreadsheetId = extractSpreadsheetId(editingConn.spreadsheet_input)
      const conn: SheetConnection = {
        ...editingConn,
        spreadsheet_id: spreadsheetId,
      }
      const exists = connections.find(c => c.id === conn.id)
      const updated = exists
        ? connections.map(c => c.id === conn.id ? conn : c)
        : [...connections, conn]
      setConnections(updated)
      await saveConnections(updated)
      setDialogOpen(false)
      toast({ title: 'Сохранено', description: 'Подключение Google Sheets добавлено' })
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConnection = async (id: string) => {
    const updated = connections.filter(c => c.id !== id)
    setConnections(updated)
    await saveConnections(updated)
    toast({ title: 'Удалено', description: 'Подключение удалено' })
  }

  const saveSingleSetting = async (key: string, value: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('settings').upsert([{ user_id: user.id, key, value }], { onConflict: 'user_id,key' })
    } catch (e) {
      console.error('Failed to save setting', key, e)
      toast({ title: 'Ошибка', description: `Не удалось сохранить настройку ${key}`, variant: 'destructive' })
    }
  }

  const handleExport = async (conn: SheetConnection) => {
    setProcessingId(conn.id)
    const isPrayerConn = prayerConnectionId && conn.id === prayerConnectionId
    try {
      const values: any[] = []

      // If this is the prayer connection — write prayer assignments first
      if (isPrayerConn) {
        const currentMonth = new Date().toISOString().slice(0, 7)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: assignments } = await supabase
            .from('prayer_assignments')
            .select('warrior_id, recipient_name')
            .eq('user_id', user.id)
            .eq('assigned_month', currentMonth)
          const { data: warriors } = await supabase
            .from('prayer_warriors')
            .select('id, name')
            .eq('user_id', user.id)
          if (assignments && assignments.length > 0) {
            const warriorMap = new Map((warriors || []).map((w: any) => [w.id, w.name]))
            const order: string[] = []
            const grouped = new Map<string, string[]>()
            for (const a of assignments) {
              const wname: string = (warriorMap.get(a.warrior_id) as string) || '—'
              if (!grouped.has(wname)) { grouped.set(wname, []); order.push(wname) }
              grouped.get(wname)!.push(a.recipient_name as string)
            }
            values.push(['Молящийся', 'Участники'])
            for (const wname of order) {
              values.push([wname, (grouped.get(wname) || []).join(', ')])
            }
            values.push(['']) // separator
          }
        }
      }

      // Export participants
      let query = supabase.from('birthdays').select('*')
      if (conn.list_id) {
        query = query.eq('list_id', conn.list_id)
      }
      // If prayer connection has a specific list — use that list for participants
      if (isPrayerConn && prayerListId && prayerListId !== '__all__') {
        query = supabase.from('birthdays').select('*').eq('list_id', prayerListId)
      }
      const { data: birthdays, error } = await query.order('birth_date')
      if (error) throw error

      if (birthdays && birthdays.length > 0) {
        values.push(['ID', 'ФИО', 'Дата рождения', 'Телефон', 'Email', 'Удалить'])
        ;(birthdays || []).forEach((b: any) => {
          values.push([
            b.id || '',
            [b.last_name, b.first_name].filter(Boolean).join(' '),
            b.birth_date ? new Date(b.birth_date).toLocaleDateString('ru-RU') : '',
            b.phone || '',
            b.email || '',
            '',
          ])
        })
      } else if (!isPrayerConn) {
        values.push(['ID', 'ФИО', 'Дата рождения', 'Телефон', 'Email', 'Удалить'])
      }

      if (values.length === 0) {
        toast({ title: 'Экспорт', description: 'Нет данных для экспорта' })
        return
      }

      const resp = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', spreadsheetId: conn.spreadsheet_id, range: buildRange(conn.sheet_name, conn.sheet_range), values }),
      })
      const body = await resp.json()
      if (!resp.ok) throw new Error(body.error || 'Failed to write')
      toast({ title: 'Экспорт', description: `Записано строк: ${values.filter(r => r.length > 1 || (r[0] && r[0] !== '')).length}` })
    } catch (e: any) {
      toast({ title: 'Ошибка экспорта', description: e.message || String(e), variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleImport = async (conn: SheetConnection) => {
    setProcessingId(conn.id)
    try {
      const resp = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', spreadsheetId: conn.spreadsheet_id, range: buildRange(conn.sheet_name, conn.sheet_range) }),
      })
      const result = await resp.json()
      if (!resp.ok) throw new Error(result.error || 'Failed to read')

      const rows = result.data?.values || []
      if (rows.length <= 1) {
        toast({ title: 'Импорт', description: 'Таблица пуста или только заголовки' })
        return
      }

      const header = rows[0].map((h: any) => String(h || '').trim().toLowerCase())
      const records: any[] = []
      const toDeleteById: Array<{ id: string; rowIndex: number }> = []

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
          if (!isNaN(parsed.getTime())) birth_date = parsed.toISOString().slice(0, 10)
        }

        if (String(deleteFlag).trim() !== '') {
          if (id) toDeleteById.push({ id: String(id), rowIndex: i + 1 })
          continue
        }

        records.push({
          id: id || undefined,
          first_name: first_name || '',
          last_name: last_name || '',
          birth_date: birth_date || null,
          phone: obj['телефон'] || obj['phone'] || null,
          email: obj['email'] || obj['e-mail'] || null,
          list_id: conn.list_id || null,
        })
      }

      for (const del of toDeleteById) {
        try { await supabase.from('birthdays').delete().eq('id', del.id) } catch {}
      }

      if (records.length > 0) {
        const { error } = await supabase.from('birthdays').upsert(records)
        if (error) throw error
      }

      toast({ title: 'Импорт', description: `Импортировано ${records.length} записей, удалено ${toDeleteById.length}` })
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) {
      toast({ title: 'Ошибка импорта', description: e.message || String(e), variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  const openAdd = () => {
    setEditingConn(makeConnection())
    setDialogOpen(true)
  }

  const openEdit = (conn: SheetConnection) => {
    setEditingConn({ ...conn })
    setDialogOpen(true)
  }

  const handleListSelect = (val: string) => {
    if (val === '__all__') {
      setEditingConn(prev => ({ ...prev, list_id: null, list_name: 'Все участники' }))
    } else {
      const found = lists.find(l => l.id === val)
      setEditingConn(prev => ({ ...prev, list_id: val, list_name: found?.name || val }))
    }
  }

  const isSavingNothing = false // placeholder

  return (
    <Card>
      <CardHeader>
        <div className="w-full flex items-start justify-between">
          <div>
            <CardTitle>Google Sheets</CardTitle>
            <CardDescription>Синхронизация с вашими таблицами</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Global toggles */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="font-medium">Автоматическая синхронизация</Label>
            <p className="text-sm text-muted-foreground">Автосинхронизация данных в фоновом режиме</p>
          </div>
          <Switch checked={autoSync} onCheckedChange={async (v) => { setAutoSync(!!v); await saveSingleSetting('google_sheets_auto_sync', v ? 'true' : 'false') }} />
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="font-medium">Автопроверка удалений (каждую минуту)</Label>
            <p className="text-sm text-muted-foreground">Проверять удалённые строки в таблице</p>
          </div>
          <Switch checked={autoDeleteCheck} onCheckedChange={async (v) => { setAutoDeleteCheck(!!v); await saveSingleSetting('google_sheets_auto_delete_check', v ? 'true' : 'false') }} />
        </div>

        {/* Connections list */}
        <div className="space-y-2">
          {connections.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Нет подключённых таблиц</p>
          )}
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <TableProperties className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conn.sheet_name || conn.spreadsheet_id.slice(0, 20) + '…'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Список: <span className="text-foreground">{conn.list_name || 'Все участники'}</span>
                  {conn.sheet_range ? <> · {conn.sheet_range}</> : null}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={processingId === conn.id}
                  onClick={() => handleExport(conn)}
                  title="Экспорт"
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={processingId === conn.id}
                  onClick={() => handleImport(conn)}
                  title="Импорт"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => {
                    const id = conn.spreadsheet_id
                    if (!id) return
                    window.open(`https://docs.google.com/spreadsheets/d/${id}`, '_blank')
                  }}
                  title="Открыть таблицу"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => openEdit(conn)}
                  title="Настройки"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteConnection(conn.id)}
                  title="Удалить"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add connection button */}
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Добавить таблицу
        </Button>

        {/* Add/Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{connections.find(c => c.id === editingConn.id) ? 'Редактировать подключение' : 'Добавить Google Sheets'}</DialogTitle>
              <DialogDescription>Укажите ID или ссылку на таблицу, диапазон и список участников</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>ID или ссылка на таблицу</Label>
                <Input
                  value={editingConn.spreadsheet_input}
                  onChange={(e) => setEditingConn(prev => ({ ...prev, spreadsheet_input: e.target.value }))}
                  placeholder="https://docs.google.com/spreadsheets/d/... или ID"
                />
              </div>

              <div>
                <Label>Название листа (вкладки)</Label>
                <Input
                  value={editingConn.sheet_name}
                  onChange={(e) => setEditingConn(prev => ({ ...prev, sheet_name: e.target.value }))}
                  placeholder="Например: Data app или Лист1"
                />
              </div>

              <div>
                <Label>Диапазон листа</Label>
                <Input
                  value={editingConn.sheet_range}
                  onChange={(e) => setEditingConn(prev => ({ ...prev, sheet_range: e.target.value }))}
                  placeholder="A:Z"
                />
                {(editingConn.sheet_name.trim() || editingConn.sheet_range.trim()) && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Итоговый диапазон:</span>
                    <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">
                      {buildRange(editingConn.sheet_name, editingConn.sheet_range)}
                    </code>
                  </div>
                )}
              </div>

              <div>
                <Label>Список участников</Label>
                <Select
                  value={editingConn.list_id ?? '__all__'}
                  onValueChange={handleListSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите список" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Все участники</SelectItem>
                    {lists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Экспорт/импорт будет работать только с участниками выбранного списка
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Как настроить:</p>
                <ol className="list-decimal ml-5 space-y-0.5">
                  <li>Создайте Google таблицу</li>
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
              <Button onClick={handleSaveConnection} disabled={isSaving || !editingConn.spreadsheet_input.trim()}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  )
}

export default GoogleSheetsSettings
