"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2 } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

interface BulkMember {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  customFields: Array<{ name: string; value: string }>
}

interface BulkAddFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (members: any[]) => Promise<void>
}

export function BulkAddForm({ open, onOpenChange, onSave }: BulkAddFormProps) {
  const { t } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState<BulkMember[]>([
    { id: "1", first_name: "", last_name: "", birth_date: "", customFields: [] },
  ])

  const addMember = () => {
    setMembers([
      ...members,
      {
        id: Date.now().toString(),
        first_name: "",
        last_name: "",
        birth_date: "",
        customFields: [],
      },
    ])
  }

  const removeMember = (id: string) => {
    if (members.length > 1) {
      setMembers(members.filter((m) => m.id !== id))
    }
  }

  const updateMember = (id: string, field: keyof Omit<BulkMember, "id">, value: string) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const validMembers = members.filter((m) => m.first_name && m.last_name && m.birth_date)

      if (validMembers.length === 0) {
        return
      }

      // Convert customFields to phone/email for backwards compatibility
      const membersWithFields = validMembers.map(({ id, customFields, ...rest }) => {
        const phoneField = customFields.find(f => f.name.toLowerCase().includes('телефон') || f.name.toLowerCase().includes('phone'))
        const emailField = customFields.find(f => f.name.toLowerCase().includes('email') || f.name.toLowerCase().includes('почта'))
        
        return {
          ...rest,
          phone: phoneField?.value || "",
          email: emailField?.value || "",
        }
      })

      await onSave(membersWithFields)
      onOpenChange(false)
      setMembers([{ id: "1", first_name: "", last_name: "", birth_date: "", customFields: [] }])
    } catch (error) {
      console.error("Error saving members:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.addMultiple}</DialogTitle>
          <DialogDescription className="sr-only">
            {t.addMultiple}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {members.map((member, index) => (
            <div key={member.id} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">#{index + 1}</h3>
                {members.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(member.id)}
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t.lastName}</Label>
                  <Input
                    value={member.last_name}
                    onChange={(e) => updateMember(member.id, "last_name", e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>{t.firstName}</Label>
                  <Input
                    value={member.first_name}
                    onChange={(e) => updateMember(member.id, "first_name", e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label>{t.birthDate}</Label>
                  <Input
                    type="date"
                    value={member.birth_date}
                    onChange={(e) => updateMember(member.id, "birth_date", e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Дополнительные поля</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newMembers = members.map(m => 
                          m.id === member.id 
                            ? { ...m, customFields: [...m.customFields, { name: "", value: "" }] }
                            : m
                        )
                        setMembers(newMembers)
                      }}
                      className="h-7"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Добавить
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {member.customFields.map((field, fieldIndex) => (
                      <div key={fieldIndex} className="flex gap-2">
                        <Input
                          placeholder="Название"
                          value={field.name}
                          onChange={(e) => {
                            const newMembers = members.map(m => {
                              if (m.id === member.id) {
                                const newFields = [...m.customFields]
                                newFields[fieldIndex].name = e.target.value
                                return { ...m, customFields: newFields }
                              }
                              return m
                            })
                            setMembers(newMembers)
                          }}
                          className="w-1/3"
                        />
                        <Input
                          placeholder="Значение"
                          value={field.value}
                          onChange={(e) => {
                            const newMembers = members.map(m => {
                              if (m.id === member.id) {
                                const newFields = [...m.customFields]
                                newFields[fieldIndex].value = e.target.value
                                return { ...m, customFields: newFields }
                              }
                              return m
                            })
                            setMembers(newMembers)
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newMembers = members.map(m => {
                              if (m.id === member.id) {
                                return { ...m, customFields: m.customFields.filter((_, i) => i !== fieldIndex) }
                              }
                              return m
                            })
                            setMembers(newMembers)
                          }}
                          className="h-10 w-10 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addMember} className="w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            {t.addMember}
          </Button>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "..." : t.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
