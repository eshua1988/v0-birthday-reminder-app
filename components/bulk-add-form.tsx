"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2 } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

interface BulkMember {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  phone: string
  email: string
}

interface BulkAddFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (members: Omit<BulkMember, "id">[]) => Promise<void>
}

export function BulkAddForm({ open, onOpenChange, onSave }: BulkAddFormProps) {
  const { t } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState<BulkMember[]>([
    { id: "1", first_name: "", last_name: "", birth_date: "", phone: "", email: "" },
  ])

  const addMember = () => {
    setMembers([
      ...members,
      {
        id: Date.now().toString(),
        first_name: "",
        last_name: "",
        birth_date: "",
        phone: "",
        email: "",
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

      await onSave(validMembers.map(({ id, ...rest }) => rest))
      onOpenChange(false)
      setMembers([{ id: "1", first_name: "", last_name: "", birth_date: "", phone: "", email: "" }])
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

                <div className="grid gap-2">
                  <Label>{t.birthDate}</Label>
                  <Input
                    type="date"
                    value={member.birth_date}
                    onChange={(e) => updateMember(member.id, "birth_date", e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>{t.phone}</Label>
                  <Input
                    type="tel"
                    value={member.phone}
                    onChange={(e) => updateMember(member.id, "phone", e.target.value)}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label>{t.email}</Label>
                  <Input
                    type="email"
                    value={member.email}
                    onChange={(e) => updateMember(member.id, "email", e.target.value)}
                  />
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
