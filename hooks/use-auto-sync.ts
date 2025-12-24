"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { initGoogleDrive, authenticateGoogle, uploadToGoogleDrive } from "@/lib/google-drive"
import type { BackupData } from "@/lib/google-drive"

interface AutoSyncOptions {
  enabled: boolean
  debounceMs?: number
}

export function useAutoSync(options: AutoSyncOptions = { enabled: true, debounceMs: 5000 }) {
  const { enabled, debounceMs = 5000 } = options
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastSyncRef = useRef<string>()
  const accessTokenRef = useRef<string>()
  const isInitializedRef = useRef(false)
  const supabase = createClient()

  // Инициализация Google Drive при монтировании
  useEffect(() => {
    if (!enabled || isInitializedRef.current) return

    const initialize = async () => {
      try {
        console.log("[v0] Auto-sync: Initializing...")
        await initGoogleDrive()
        isInitializedRef.current = true
        console.log("[v0] Auto-sync: Initialized successfully")
      } catch (error) {
        console.error("[v0] Auto-sync: Failed to initialize:", error)
      }
    }

    initialize()
  }, [enabled])

  const performSync = useCallback(async () => {
    if (!enabled || !isInitializedRef.current) {
      console.log("[v0] Auto-sync: Sync skipped (disabled or not initialized)")
      return
    }

    try {
      console.log("[v0] Auto-sync: Starting sync...")

      // Получить токен доступа если его нет
      if (!accessTokenRef.current) {
        console.log("[v0] Auto-sync: Requesting authentication...")
        const authResponse = await authenticateGoogle()
        accessTokenRef.current = authResponse.access_token
        console.log("[v0] Auto-sync: Authentication successful")
      }

      // Получить все данные для резервного копирования
      console.log("[v0] Auto-sync: Fetching data...")
      const { data: birthdays } = await supabase.from("birthdays").select("*")
      const { data: settings } = await supabase.from("settings").select("*")

      const backupData: BackupData = {
        birthdays: birthdays || [],
        settings: settings || [],
        exportDate: new Date().toISOString(),
        version: "1.0",
      }

      const dataString = JSON.stringify(backupData, null, 2)
      const dataHash = btoa(dataString).substring(0, 20)

      // Проверить, изменились ли данные с последней синхронизации
      if (lastSyncRef.current === dataHash) {
        console.log("[v0] Auto-sync: No changes detected, skipping upload")
        return
      }

      // Загрузить в Google Drive
      const fileName = `birthday-backup-auto-${new Date().toISOString().split("T")[0]}.json`
      console.log("[v0] Auto-sync: Uploading to Google Drive...")

      await uploadToGoogleDrive(accessTokenRef.current, fileName, dataString)

      lastSyncRef.current = dataHash
      console.log("[v0] Auto-sync: Sync completed successfully")
    } catch (error: any) {
      console.error("[v0] Auto-sync: Sync failed:", error)

      // Если ошибка авторизации, сбросить токен
      if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
        console.log("[v0] Auto-sync: Auth token expired, resetting...")
        accessTokenRef.current = undefined
      }
    }
  }, [enabled, supabase])

  const scheduleSync = useCallback(() => {
    if (!enabled) return

    console.log("[v0] Auto-sync: Scheduling sync in", debounceMs, "ms")

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      performSync()
    }, debounceMs)
  }, [enabled, debounceMs, performSync])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    scheduleSync,
    performSync,
  }
}
