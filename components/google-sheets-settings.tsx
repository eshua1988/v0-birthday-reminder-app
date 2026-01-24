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
                  <Label>ID таблицы или ссылка</Label>
                  <Input
                    value={spreadsheetInput}
                    onChange={(e) => setSpreadsheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/... или ID"
                  />
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

          <Button onClick={async () => {
            // quick open sheet in new tab if id present
            const id = extractSpreadsheetId(spreadsheetInput)
            if (id) window.open(`https://docs.google.com/spreadsheets/d/${id}`, '_blank')
          }}>
            Открыть таблицу
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default GoogleSheetsSettings
