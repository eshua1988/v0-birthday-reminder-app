"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Download, Upload, FileText, Table2 } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import * as XLSX from "xlsx"
import { useLocale } from "@/lib/locale-context"
import { format, parse } from "date-fns"
import { Birthday } from "@/types/birthday"

const supabase = createClient()

export function BackupManager() {
  const { t } = useLocale()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [sheetSettings, setSheetSettings] = useState<{ spreadsheet_id?: string; sheet_range?: string; autoSync?: boolean } | null>(null)

  // Load Google Sheets settings for current user
  const loadSheetSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: rows } = await supabase
        .from('settings')
        .select('key,value')
        .eq('user_id', user.id)
        .in('key', ['spreadsheet_id', 'sheet_range', 'google_sheets_auto_sync'])
      const res: any = {}
      ;(rows || []).forEach((r: any) => {
        if (r.key === 'spreadsheet_id') res.spreadsheet_id = r.value
        if (r.key === 'sheet_range') res.sheet_range = r.value
        if (r.key === 'google_sheets_auto_sync') res.autoSync = r.value === 'true'
      })
      setSheetSettings(res)
      return res
    } catch (e) {
      console.error('Failed to load sheet settings', e)
      return null
    }
  }

  // Auto-sync loop
  useEffect(() => {
    let interval: any
    let active = true
    ;(async () => {
      const s = await loadSheetSettings()
      if (!s) return
      if (s.autoSync) {
        // initial sync
        try { await handleGoogleExport() } catch (e) { console.error('Auto sync failed', e) }
        interval = setInterval(async () => {
          if (!active) return
          try { await handleGoogleExport() } catch (e) { console.error('Auto sync failed', e) }
        }, 60_000)
      }
    })()
    return () => { active = false; if (interval) clearInterval(interval) }
  }, [])

  // Экспорт данных в JSON файл (локально)
  const handleLocalExport = async () => {
    console.log("[v0] Starting local export...")
    setIsLoading(true)
    try {
      // Получить все данные
      console.log("[v0] Fetching birthdays from database...")
      const { data: birthdays, error: birthdaysError } = await supabase.from("birthdays").select("*")

      if (birthdaysError) {
        console.log("[v0] Birthdays fetch error:", birthdaysError)
        throw birthdaysError
      }
      console.log("[v0] Fetched birthdays:", birthdays?.length || 0)

      const backupData: any = {
        birthdays: birthdays || [],
        exportDate: new Date().toISOString(),
        version: "1.0",
      }

      console.log("[v0] Creating backup file...")
      // Создать и скачать файл
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const fileName = `birthday-backup-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log("[v0] Local export successful:", fileName)
      toast({
        title: t.exportSuccess || "Экспорт успешен",
        description: t.exportSuccessDescription || "Данные сохранены на ваше устройство",
      })
    } catch (error) {
      console.error("[v0] Local export error:", error)
      toast({
        title: t.exportError || "Ошибка экспорта",
        description: t.exportErrorDescription || "Не удалось экспортировать данные",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Экспорт данных в PDF файл (локально)
  const handlePdfExport = async () => {
    console.log("[v0] Starting PDF export...")
    setIsLoading(true)
    try {
      const { data: birthdays, error } = await supabase.from("birthdays").select("*").order("birth_date")
      if (error) throw error

      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text("Дни Рождения - Экспорт данных", 14, 20)
      doc.setFontSize(10)
      doc.text(`Дата экспорта: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, 14, 28)
      doc.text(`Всего записей: ${birthdays?.length || 0}`, 14, 34)

      const tableData = (birthdays || []).map((b: Birthday) => [
        b.last_name || "",
        b.first_name || "",
        b.birth_date ? format(new Date(b.birth_date), "dd.MM.yyyy") : "",
        b.phone || "",
        b.email || "",
        b.notification_time || "",
      ])

      // @ts-ignore - jspdf-autotable extends jsPDF
      doc.autoTable({
        startY: 40,
        head: [["Фамилия", "Имя", "Дата рождения", "Телефон", "Email", "Время оповещения"]],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      const fileName = `birthdays-${format(new Date(), "yyyy-MM-dd-HHmmss")}.pdf`
      doc.save(fileName)

      console.log("[v0] PDF export successful:", fileName)
      toast({
        title: t.exportSuccess || "Экспорт успешен",
        description: "Данные экспортированы в PDF",
      })
    } catch (error) {
      console.error("[v0] PDF export error:", error)
      toast({
        title: t.exportError || "Ошибка экспорта",
        description: "Не удалось экспортировать в PDF",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Экспорт данных в Excel файл (локально)
  const handleExcelExport = async () => {
    console.log("[v0] Starting Excel export...")
    setIsLoading(true)
    try {
      // Получить все данные
      const { data: birthdays, error } = await supabase.from("birthdays").select("*").order("birth_date")

      if (error) throw error

      // Подготовить данные для Excel
      const excelData = (birthdays || []).map((b: Birthday) => ({
        Фамилия: b.last_name || "",
        Имя: b.first_name || "",
        "Дата рождения": b.birth_date ? format(new Date(b.birth_date), "dd.MM.yyyy") : "",
        Телефон: b.phone || "",
        Email: b.email || "",
        "Время оповещения": b.notification_time || "",
        "Оповещение включено": b.notification_enabled ? "Да" : "Нет",
      }))

      // Создать книгу Excel
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Установить ширину колонок
      ws["!cols"] = [
        { wch: 20 }, // Фамилия
        { wch: 20 }, // Имя
        { wch: 15 }, // Дата рождения
        { wch: 18 }, // Телефон
        { wch: 25 }, // Email
        { wch: 18 }, // Время оповещения
        { wch: 20 }, // Оповещение включено
      ]

      // Добавить лист в книгу
      XLSX.utils.book_append_sheet(wb, ws, "Дни Рождения")

      // Сохранить файл
      const fileName = `birthdays-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`
      XLSX.writeFile(wb, fileName)

      console.log("[v0] Excel export successful:", fileName)
      toast({
        title: t.exportSuccess || "Экспорт успешен",
        description: "Данные экспортированы в Excel",
      })
    } catch (error) {
      console.error("[v0] Excel export error:", error)
      toast({
        title: t.exportError || "Ошибка экспорта",
        description: "Не удалось экспортировать в Excel",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Export to Google Sheets
  const handleGoogleExport = async () => {
    setIsLoading(true)
    try {
      const settings = sheetSettings || (await loadSheetSettings())
      if (!settings || !settings.spreadsheet_id) throw new Error('Google Sheets not configured')

      const { data: birthdays, error } = await supabase.from('birthdays').select('*').order('birth_date')
      if (error) throw error

      // Include ID and Delete column to allow remote deletion marking
      const header = ['ID','Фамилия','Имя','Дата рождения','Телефон','Email','Время оповещения','Оповещение включено','Удалить']
      const values = [header]
      ;(birthdays || []).forEach((b: Birthday) => {
        values.push([
          // include id if present for safe matching on import
          (b as any).id || '',
          b.last_name || '',
          b.first_name || '',
          b.birth_date ? format(new Date(b.birth_date), 'dd.MM.yyyy') : '',
          b.phone || '',
          b.email || '',
          b.notification_time || '',
          b.notification_enabled ? 'Да' : 'Нет',
          '', // empty 'Удалить' column for users to mark
        ])
      })

      const resp = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', spreadsheetId: settings.spreadsheet_id, range: settings.sheet_range || "'Data app'!A:Z", values }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Failed to write to Google Sheets')

      toast({ title: 'Экспорт в Google Sheets', description: `Записано ${values.length - 1} строк` })
    } catch (e: any) {
      console.error('Google export error', e)
      toast({ title: 'Ошибка', description: e.message || String(e), variant: 'destructive' })
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  // Import from Google Sheets
  const handleGoogleImport = async () => {
    setIsLoading(true)
    try {
      const settings = sheetSettings || (await loadSheetSettings())
      if (!settings || !settings.spreadsheet_id) throw new Error('Google Sheets not configured')

      const resp = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', spreadsheetId: settings.spreadsheet_id, range: settings.sheet_range || "'Data app'!A:Z" }),
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
          const parsed = parse(String(rawDate), 'dd.MM.yyyy', new Date())
          if (!isNaN(parsed.getTime())) birth_date = format(parsed, 'yyyy-MM-dd')
          else {
            const iso = new Date(String(rawDate))
            if (!isNaN(iso.getTime())) birth_date = format(iso, 'yyyy-MM-dd')
          }
        }

        // If marked for deletion, schedule deletion
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
          try {
            await supabase.from('birthdays').delete().eq('id', del.id)
            // clear the row in sheet
            try {
              await fetch('/api/google-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'write', spreadsheetId: settings.spreadsheet_id, range: `${settings.sheet_range?.split('!')[0] || "'Data app'"}!A${del.rowIndex}:Z${del.rowIndex}`, values: [Array(header.length).fill('')] }),
              })
            } catch (err) {
              console.warn('Failed to clear sheet row', del.rowIndex, err)
            }
          } catch (err) {
            console.warn('Failed to delete entry by id', del.id, err)
          }
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
            try {
              await fetch('/api/google-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'write', spreadsheetId: settings.spreadsheet_id, range: `${settings.sheet_range?.split('!')[0] || "'Data app'"}!A${del.rowIndex}:Z${del.rowIndex}`, values: [Array(header.length).fill('')] }),
              })
            } catch (err) {
              console.warn('Failed to clear sheet row', del.rowIndex, err)
            }
          } catch (err) {
            console.warn('Failed to delete entry by fields', del, err)
          }
        }
      }

      if (records.length === 0) {
        toast({ title: 'Импорт', description: 'Нет записей для импорта' })
        return
      }

      const { error } = await supabase.from('birthdays').upsert(records)
      if (error) throw error

      toast({ title: 'Импорт', description: `Импортировано ${records.length} записей` })
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) {
      console.error('Google import error', e)
      toast({ title: 'Ошибка', description: e.message || String(e), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  // Импорт данных из JSON файла (локально)
  const handleLocalImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsLoading(true)
      try {
        const text = await file.text()
        const backupData: any = JSON.parse(text)

        // Проверка версии
        if (!backupData.version || !backupData.birthdays) {
          throw new Error("Invalid backup file format")
        }

        // Импортировать данные
        if (backupData.birthdays.length > 0) {
          const { error: birthdaysError } = await supabase.from("birthdays").upsert(backupData.birthdays)
          if (birthdaysError) throw birthdaysError
        }

        toast({
          title: t.importSuccess || "Импорт успешен",
          description: t.importSuccessDescription || `Восстановлено ${backupData.birthdays.length} записей`,
        })

        // Перезагрузить страницу для обновления данных
        setTimeout(() => window.location.reload(), 1500)
      } catch (error) {
        console.error("Import error:", error)
        toast({
          title: t.importError || "Ошибка импорта",
          description: t.importErrorDescription || "Не удалось импортировать данные",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    input.click()
  }

  // Импорт данных из Excel файла (локально)
  const handleExcelImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".xlsx,.xls"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      console.log("[v0] Starting Excel import...")
      setIsLoading(true)
      try {
        const arrayBuffer = await file.arrayBuffer()
        // Read with cellDates so actual Excel date cells become JS Date objects
        const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        // defval: '' ensures missing cells are empty strings; raw:false lets library parse values
        const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false })

        console.log("[v0] Parsed Excel data:", jsonData.length, "rows")
        console.log("[v0] First row sample:", jsonData[0])
        console.log("[v0] Column headers:", Object.keys(jsonData[0] || {}))

        // Получить текущего пользователя
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("User not authenticated")
        }

        // Преобразовать данные Excel в формат базы данных
        const birthdaysToImport = []

        // Названия месяцев для поиска в колонках (поддерживаем rus/eng/pl/uk и сокращения)
        const monthMap: Record<string, number> = {
          // Russian
          'январь': 1, 'янв': 1,
          'февраль': 2, 'фев': 2,
          'март': 3, 'мар': 3,
          'апрель': 4, 'апр': 4,
          'май': 5,
          'июнь': 6, 'июн': 6,
          'июль': 7, 'июл': 7,
          'август': 8, 'авг': 8,
          'сентябрь': 9, 'сен': 9,
          'октябрь': 10, 'окт': 10,
          'ноябрь': 11, 'ноя': 11,
          'декабрь': 12, 'дек': 12,
          // English
          'january': 1, 'jan': 1,
          'february': 2, 'feb': 2,
          'march': 3, 'mar': 3,
          'april': 4, 'apr': 4,
          'may': 5,
          'june': 6, 'jun': 6,
          'july': 7, 'jul': 7,
          'august': 8, 'aug': 8,
          'september': 9, 'sep': 9,
          'october': 10, 'oct': 10,
          'november': 11, 'nov': 11,
          'december': 12, 'dec': 12,
          // Polish
          'styczeń': 1, 'styczen': 1, 'sty': 1,
          'luty': 2, 'lut': 2,
          'marzec': 3,
          'kwiecień': 4, 'kwiecien': 4, 'kwi': 4,
          'maj': 5,
          'czerwiec': 6, 'cze': 6,
          'lipiec': 7, 'lip': 7,
          'sierpień': 8, 'sierpien': 8, 'sie': 8,
          'wrzesień': 9, 'wrzesien': 9, 'wrz': 9,
          'październik': 10, 'pazdziernik': 10, 'paz': 10,
          'listopad': 11, 'lis': 11,
          'grudzień': 12, 'grudzien': 12, 'gru': 12,
          // Ukrainian
          'січень': 1, 'січ': 1,
          'лютий': 2, 'лют': 2,
          'березень': 3, 'бер': 3,
          'квітень': 4, 'кві': 4,
          'травень': 5, 'тра': 5,
          'червень': 6, 'черв': 6,
          'липень': 7, 'лип': 7,
          'серпень': 8, 'серп': 8,
          'вересень': 9, 'вер': 9,
          'жовтень': 10, 'жов': 10,
          'листопад': 11, 'лис': 11,
          'грудень': 12, 'гру': 12,
        }

        const lowerKeys = (obj: any) => Object.keys(obj || {}).map((k) => k.toString().trim().toLowerCase())
        const headers = lowerKeys(jsonData[0] || {})

        // Detect if file uses separate Day/Month/Year columns (support ru/en/pl/uk)
        const dayKeywords = ['день', 'day', 'dzień', 'dzien', 'день', 'день']
        const monthKeywords = ['месяц', 'month', 'miesiąc', 'miesiac', 'місяць']
        const yearKeywords = ['год', 'year', 'rok', 'рік']

        const dayCol = headers.find((h) => dayKeywords.some((k) => h.includes(k)))
        const monthCol = headers.find((h) => monthKeywords.some((k) => h.includes(k)))
        const yearCol = headers.find((h) => yearKeywords.some((k) => h.includes(k)))

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          console.log(`[v0] Processing row ${i + 1}:`, row)

          try {
            // Извлечь ФИО - попробовать разные варианты названий колонок (ru/en/pl/uk)
            const possibleNameColumns = [
              "Члены",
              "Члени",
              "Members",
              "Name",
              "ФИО",
              "Имя",
              "Ім'я",
              "Імя",
              "Імена",
              "Imie",
              "Imię",
              "Członkowie",
              "Фамилия",
              "Прізвище",
              "__EMPTY",
            ]
            let fullName = ""
            
            for (const col of possibleNameColumns) {
              if (row[col] && String(row[col]).trim() !== "") {
                fullName = String(row[col]).trim()
                break
              }
            }
            
            // Если не нашли в именованных колонках, попробовать первую колонку
            if (!fullName) {
              const firstKey = Object.keys(row)[0]
              if (firstKey && row[firstKey]) {
                fullName = String(row[firstKey]).trim()
              }
            }

            if (!fullName || fullName === "") {
              console.log(`[v0] Row ${i + 1} skipped: no name found`)
              continue
            }

            // Разделить ФИО на фамилию и имя (предполагаем формат "Фамилия Имя")
            const nameParts = fullName.split(/\s+/)
            const lastName = nameParts[0] || ""
            const firstName = nameParts.slice(1).join(" ") || lastName // Если нет имени, дублируем фамилию

            console.log(`[v0] Row ${i + 1} name: lastName="${lastName}", firstName="${firstName}"`)

            
                // Попытаться обнаружить дату в строке в нескольких вариантах:
                // 1) Отдельные колонки Day/Month/Year
                // 2) Колонка с датой (название содержит 'дата'/'birth')
                // 3) Колонки-месяцы (Январь, Feb, и т.д.)
                let birthDate = null
                let birthDateStr: any = null
                let foundMonth: number | null = null

                // Case: separate Day/Month/Year columns
                const rowLower: Record<string, any> = {}
                for (const k of Object.keys(row || {})) rowLower[k.toString().trim().toLowerCase()] = row[k]
                if (dayCol && monthCol && rowLower[dayCol]) {
                  const d = parseInt(String(rowLower[dayCol]).replace(/[^0-9]/g, ''), 10)
                  const m = parseInt(String(rowLower[monthCol] || '' ).replace(/[^0-9]/g, ''), 10)
                  const y = yearCol ? parseInt(String(rowLower[yearCol] || '' ).replace(/[^0-9]/g, ''), 10) : 2000
                  if (!isNaN(d) && !isNaN(m)) {
                    birthDate = new Date(y || 2000, m - 1, d)
                    console.log(`[v0] Row ${i + 1} parsed from Day/Month/Year columns:`, birthDate)
                  }
                }

                // Case: direct date-like column (header contains date/birth)
                if (!birthDate) {
                  for (const key of Object.keys(row || {})) {
                    const lk = key.toString().trim().toLowerCase()
                    if (/дата|date|birth|birthday|bday/.test(lk)) {
                      birthDateStr = row[key]
                      console.log(`[v0] Row ${i + 1} found date-like column ${key}:`, birthDateStr)
                      break
                    }
                  }
                }

                // Case: month-named columns
                if (!birthDate && !birthDateStr) {
                  for (const key of Object.keys(row || {})) {
                    const lk = key.toString().trim().toLowerCase()
                    if (lk in monthMap && row[key] !== undefined && row[key] !== null && row[key] !== '') {
                      birthDateStr = row[key]
                      foundMonth = monthMap[lk]
                      console.log(`[v0] Row ${i + 1} found date in month column ${key}:`, birthDateStr)
                      break
                    }
                  }
                }

                if (!birthDate && !birthDateStr) {
                  console.log(`[v0] Row ${i + 1} skipped: no date found`)
                  continue
                }

                // Общая функция парсинга значений разных типов
                const parseValueToDate = (val: any, monthHint: number | null) => {
                  if (val instanceof Date) return val
                  if (val === null || val === undefined || String(val).trim() === '') return null
                  // Если число
                  if (typeof val === 'number') {
                    // Число 1..31 -> день месяца
                    if (monthHint && Number.isInteger(val) && val >= 1 && val <= 31) {
                      return new Date(2000, (monthHint as number) - 1, val)
                    }
                    // Иначе - Excel serial
                    const excelEpoch = new Date(1899, 11, 30)
                    return new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000)
                  }
                  // Если строка
                  let s = String(val).trim()
                  // Убрать лишние слова вроде 'г.' и ненужные символы
                  s = s.replace(/\s*г\.?$/i, '')
                  // Числовая строка
                  if (/^\d+$/.test(s) && monthHint) {
                    const day = parseInt(s, 10)
                    if (day >= 1 && day <= 31) return new Date(2000, (monthHint as number) - 1, day)
                  }
                  // dd.MM.yyyy
                  const m1 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
                  if (m1) {
                    let day = parseInt(m1[1], 10)
                    let month = parseInt(m1[2], 10) - 1
                    let year = parseInt(m1[3], 10)
                    if (year < 100) year += year > 30 ? 1900 : 2000
                    return new Date(year, month, day)
                  }
                  // dd.MM without year, prefer monthHint
                  const m2 = s.match(/^(\d{1,2})\.(\d{1,2})\.?$/)
                  if (m2 && monthHint) {
                    const day = parseInt(m2[1], 10)
                    const month = (monthHint as number) - 1
                    return new Date(2000, month, day)
                  }
                  // dd/MM/yyyy
                  const m3 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
                  if (m3) {
                    let day = parseInt(m3[1], 10)
                    let month = parseInt(m3[2], 10) - 1
                    let year = parseInt(m3[3], 10)
                    if (year < 100) year += year > 30 ? 1900 : 2000
                    return new Date(year, month, day)
                  }
                  // ISO-like yyyy-mm-dd
                  const parsed = new Date(s)
                  if (!isNaN(parsed.getTime())) return parsed
                  return null
                }

                try {
                  if (!birthDate) {
                    birthDate = parseValueToDate(birthDateStr, foundMonth)
                  }
                } catch (err) {
                  console.warn(`[v0] Could not parse date for row ${i + 1}:`, birthDateStr, err)
                }

                if (birthDate && !isNaN(birthDate.getTime())) {
                  // Normalize to midday to avoid TZ shifting the day
                  birthDate.setHours(12, 0, 0, 0)
                }

                if (!birthDate || isNaN(birthDate.getTime())) {
                  console.log(`[v0] Row ${i + 1} skipped: invalid date`, birthDateStr)
                  continue
                }

              // Извлечь дополнительные поля если они есть
              const phone = row["Телефон"] || row["Phone"] || row["phone"] || row["Telefon"] || row["Telefon"] || null
              const email = row["Email"] || row["E-mail"] || row["email"] || row["Email"] || null

              const record = {
                user_id: user.id,
                first_name: firstName,
                last_name: lastName,
                birth_date: format(birthDate, "yyyy-MM-dd"),
                phone: phone ? String(phone).trim() : null,
                email: email ? String(email).trim() : null,
                notification_time: "09:00",
                notification_enabled: true,
              }

              console.log(`[v0] Row ${i + 1} valid record:`, record)
              birthdaysToImport.push(record)

            } catch (error) {
              console.error(`[v0] Error processing row ${i + 1}:`, row, error)
            }
          }

        if (birthdaysToImport.length === 0) {
          throw new Error(
            'Не найдено валидных записей в Excel файле. Пожалуйста, убедитесь, что файл содержит колонку "Члены" с именами и колонки с месяцами (Январь, Февраль и т.д.) с датами рождения.',
          )
        }

        // Импортировать данные в базу
        const { error: insertError } = await supabase.from("birthdays").insert(birthdaysToImport)

        if (insertError) {
          console.error("[v0] Insert error:", insertError)
          throw insertError
        }

        console.log("[v0] Excel import successful")
        toast({
          title: t.importSuccess || "Импорт успешен",
          description: `Импортировано ${birthdaysToImport.length} записей из Excel`,
        })

        setTimeout(() => window.location.reload(), 1500)
      } catch (error) {
        console.error("[v0] Excel import error:", error)
        toast({
          title: t.importError || "Ошибка импорта",
          description: error instanceof Error ? error.message : "Не удалось импортировать данные из Excel",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    input.click()
  }

  // Импорт данных из PDF файла (ограниченная поддержка)
  const handlePdfImport = () => {
    toast({
      title: "Функция в разработке",
      description: "Импорт из PDF пока не поддерживается. Используйте JSON или Excel форматы для импорта данных.",
      variant: "default",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.backupAndRestore || "Резервное копирование и восстановление"}</CardTitle>
        <CardDescription>
          {t.backupDescription || "Экспортируйте и импортируйте все данные о днях рождения"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t.exportData || "Экспорт данных"}</h4>
          <p className="text-sm text-muted-foreground">
            {t.exportDataDescription || "Сохраните данные на ваше устройство в различных форматах"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleLocalExport} disabled={isLoading} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button onClick={handlePdfExport} disabled={isLoading} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              {t.exportPdf || "PDF"}
            </Button>
            <Button onClick={handleExcelExport} disabled={isLoading} variant="outline">
              <Table2 className="h-4 w-4 mr-2" />
              {t.exportExcel || "Excel"}
            </Button>
            <Button onClick={handleGoogleExport} disabled={isLoading} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Google Sheets
            </Button>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium">{t.importData || "Импорт данных"}</h4>
          <p className="text-sm text-muted-foreground">
            {t.importDataDescription || "Восстановите данные из файлов резервных копий"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleLocalImport} disabled={isLoading} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button onClick={handlePdfImport} disabled={isLoading} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              {t.importPdf || "PDF"}
            </Button>
            <Button onClick={handleExcelImport} disabled={isLoading} variant="outline">
              <Table2 className="h-4 w-4 mr-2" />
              {t.importExcel || "Excel"}
            </Button>
            <Button onClick={handleGoogleImport} disabled={isLoading} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Google Sheets
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
