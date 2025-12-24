"use client"

import { useState } from "react"
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

const supabase = createClient()

export function BackupManager() {
  const { t } = useLocale()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

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

      const tableData = (birthdays || []).map((b) => [
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
      const excelData = (birthdays || []).map((b) => ({
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
        const workbook = XLSX.read(arrayBuffer, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet)

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

        // Названия месяцев для поиска в колонках
        const monthColumns = [
          "Январь",
          "Февраль",
          "Март",
          "Апрель",
          "Май",
          "Июнь",
          "Июль",
          "Август",
          "Сентябрь",
          "Октябрь",
          "Ноябрь",
          "Декабрь",
        ]

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          console.log(`[v0] Processing row ${i + 1}:`, row)

          try {
            // Извлечь ФИО из колонки "Члены"
            let fullName = row["Члены"] || row["Members"] || row["Name"] || row["ФИО"]

            if (!fullName || fullName === "") {
              console.log(`[v0] Row ${i + 1} skipped: no name found`)
              continue
            }

            // Очистить ФИО от лишних пробелов
            fullName = String(fullName).trim()

            // Разделить ФИО на фамилию и имя (предполагаем формат "Фамилия Имя")
            const nameParts = fullName.split(/\s+/)
            const lastName = nameParts[0] || ""
            const firstName = nameParts.slice(1).join(" ") || lastName // Если нет имени, дублируем фамилию

            console.log(`[v0] Row ${i + 1} name: lastName="${lastName}", firstName="${firstName}"`)

            // Искать дату рождения в колонках месяцев
            let birthDate = null
            let birthDateStr = null

            for (const monthCol of monthColumns) {
              if (row[monthCol] !== undefined && row[monthCol] !== null && row[monthCol] !== "") {
                birthDateStr = row[monthCol]
                console.log(`[v0] Row ${i + 1} found date in ${monthCol}:`, birthDateStr)
                break
              }
            }

            if (!birthDateStr) {
              console.log(`[v0] Row ${i + 1} skipped: no date found`)
              continue
            }

            // Парсинг даты из разных форматов
            try {
              // Если это Excel date serial number
              if (typeof birthDateStr === "number") {
                const excelEpoch = new Date(1900, 0, 1)
                const days = birthDateStr - 2 // Excel считает 1900 високосным, корректировка
                birthDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
                console.log(`[v0] Row ${i + 1} parsed serial date:`, birthDate)
              } else {
                const dateStr = String(birthDateStr)
                // Попробовать разные форматы
                const formats = ["dd.MM.yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy", "dd.MM."]
                for (const fmt of formats) {
                  try {
                    // Для формата "dd.MM." без года, добавить текущий год
                    let fullDateStr = dateStr
                    if (
                      fmt === "dd.MM." &&
                      dateStr.endsWith(".") &&
                      !dateStr.includes("19") &&
                      !dateStr.includes("20")
                    ) {
                      fullDateStr = dateStr + new Date().getFullYear()
                    }

                    const parsed = parse(fullDateStr, fmt === "dd.MM." ? "dd.MM.yyyy" : fmt, new Date())
                    if (!isNaN(parsed.getTime())) {
                      birthDate = parsed
                      console.log(`[v0] Row ${i + 1} parsed date with format ${fmt}:`, birthDate)
                      break
                    }
                  } catch {}
                }
                // Если не удалось распарсить, попробовать встроенный парсер
                if (!birthDate) {
                  const parsed = new Date(dateStr)
                  if (!isNaN(parsed.getTime())) {
                    birthDate = parsed
                    console.log(`[v0] Row ${i + 1} parsed date with native parser:`, birthDate)
                  }
                }
              }
            } catch (error) {
              console.warn(`[v0] Could not parse date for row ${i + 1}:`, birthDateStr, error)
            }

            if (!birthDate || isNaN(birthDate.getTime())) {
              console.log(`[v0] Row ${i + 1} skipped: invalid date`)
              continue
            }

            // Извлечь дополнительные поля если они есть
            const phone = row["Телефон"] || row["Phone"] || row["phone"] || null
            const email = row["Email"] || row["E-mail"] || row["email"] || null

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

        console.log("[v0] Valid records to import:", birthdaysToImport.length)

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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
