"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCw, CheckCircle2, XCircle, Calendar } from "lucide-react"

export default function TestCronPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-cron-now")
      const data = await response.json()
      setResult(data)
      console.log("[v0] Test result:", data)
    } catch (error) {
      console.error("[v0] Test error:", error)
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Тест Cron прямо сейчас
          </CardTitle>
          <CardDescription>
            Проверка логики работы cron в текущий момент времени
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTest} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Запустить тест
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-4">
              {result.error ? (
                <div className="p-4 border border-red-500 rounded bg-red-50 dark:bg-red-950">
                  <p className="text-red-900 dark:text-red-100 font-medium">Ошибка:</p>
                  <p className="text-sm text-red-800 dark:text-red-200">{result.error}</p>
                  {result.details && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2">{result.details}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="p-4 border rounded bg-muted/50">
                    <h3 className="font-medium mb-2">Серверное время</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Время:</span> <code className="font-bold">{result.server_time?.formatted}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Дата:</span> {result.server_time?.date}
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">ISO:</span> <code className="text-xs">{result.server_time?.iso}</code>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{result.total_birthdays}</div>
                        <p className="text-xs text-muted-foreground">Всего с уведомлениями</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{result.birthdays_today}</div>
                        <p className="text-xs text-muted-foreground">Именинников сегодня</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{result.should_notify_now}</div>
                        <p className="text-xs text-muted-foreground">Сработает сейчас</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {result.firebase_configured ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Firebase</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Результаты проверки</h3>
                    {result.results?.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 border rounded">
                        Нет именинников с включенными уведомлениями
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {result.results?.map((birthday: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`p-4 border rounded space-y-2 ${
                              birthday.should_notify_now ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{birthday.name}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {birthday.birth_date}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {birthday.is_birthday_today && (
                                  <Badge variant="default">Сегодня ДР</Badge>
                                )}
                                {birthday.should_notify_now && (
                                  <Badge variant="default" className="bg-green-500">
                                    Сработает!
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Timezone:</span>
                                <br />
                                <code className="text-xs">{birthday.user_timezone}</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Время в timezone:</span>
                                <br />
                                <code className="text-xs font-bold">{birthday.user_current_time}</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Серверное время:</span>
                                <br />
                                <code className="text-xs">{birthday.server_current_time}</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Уведомления:</span>
                                <br />
                                {birthday.notification_enabled ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500 inline" />
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-sm text-muted-foreground">Времена уведомлений:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {birthday.all_notification_times?.length === 0 ? (
                                  <Badge variant="outline" className="text-yellow-600">
                                    Не установлены
                                  </Badge>
                                ) : (
                                  birthday.all_notification_times?.map((time: string, tidx: number) => (
                                    <Badge 
                                      key={tidx}
                                      variant={time === birthday.user_current_time ? "default" : "outline"}
                                      className={time === birthday.user_current_time ? "bg-green-500" : ""}
                                    >
                                      {time}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>

                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground">Raw данные</summary>
                              <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                                {JSON.stringify(
                                  {
                                    notification_times_raw: birthday.notification_times_raw,
                                    notification_time_raw: birthday.notification_time_raw,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
