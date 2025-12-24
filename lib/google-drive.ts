// Утилиты для работы с Google Drive API
const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.appdata",
]

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

export interface BackupData {
  birthdays: any[]
  settings: any[]
  exportDate: string
  version: string
}

// Инициализация Google Drive API
export const initGoogleDrive = () => {
  return new Promise<void>((resolve, reject) => {
    console.log("[v0] Initializing Google Drive API...")
    console.log("[v0] Google Client ID:", GOOGLE_CLIENT_ID ? "Set" : "Not set")

    if (typeof window === "undefined") {
      console.log("[v0] Error: Attempted to load Google API on server side")
      reject(new Error("Google API can only be loaded in browser"))
      return
    }

    // Загрузка Google API скрипта
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => {
      console.log("[v0] Google API script loaded successfully")
      resolve()
    }
    script.onerror = () => {
      console.log("[v0] Error: Failed to load Google API script")
      reject(new Error("Failed to load Google API"))
    }
    document.body.appendChild(script)
  })
}

// Авторизация в Google
export const authenticateGoogle = async (): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.log("[v0] Starting Google authentication...")

    if (typeof window === "undefined" || !(window as any).google) {
      console.log("[v0] Error: Google API not available")
      reject(new Error("Google API not loaded"))
      return
    }

    console.log("[v0] Creating OAuth2 token client...")
    console.log("[v0] Client ID:", GOOGLE_CLIENT_ID)
    console.log("[v0] Scopes:", GOOGLE_DRIVE_SCOPES)

    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_SCOPES.join(" "),
      callback: (response: any) => {
        if (response.error) {
          console.log("[v0] Authentication error:", response.error)
          reject(response)
        } else {
          console.log("[v0] Authentication successful")
          console.log("[v0] Access token received:", response.access_token ? "Yes" : "No")
          resolve(response)
        }
      },
    })

    console.log("[v0] Requesting access token...")
    client.requestAccessToken()
  })
}

// Загрузка файла в Google Drive
export const uploadToGoogleDrive = async (
  accessToken: string,
  fileName: string,
  content: string,
  mimeType = "application/json",
): Promise<any> => {
  console.log("[v0] Uploading file to Google Drive...")
  console.log("[v0] File name:", fileName)
  console.log("[v0] Content size:", content.length, "bytes")
  console.log("[v0] MIME type:", mimeType)

  const metadata = {
    name: fileName,
    mimeType: mimeType,
  }

  const form = new FormData()
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
  form.append("file", new Blob([content], { type: mimeType }))

  console.log("[v0] Sending upload request...")
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  })

  console.log("[v0] Upload response status:", response.status)

  if (!response.ok) {
    console.log("[v0] Upload failed:", response.statusText)
    throw new Error(`Failed to upload to Google Drive: ${response.statusText}`)
  }

  const result = await response.json()
  console.log("[v0] Upload successful, file ID:", result.id)
  return result
}

// Список файлов в Google Drive
export const listGoogleDriveFiles = async (accessToken: string, query = ""): Promise<any> => {
  console.log("[v0] Listing Google Drive files...")
  console.log("[v0] Query:", query || "name contains 'birthday-backup'")

  const params = new URLSearchParams({
    q: query || "name contains 'birthday-backup'",
    fields: "files(id, name, createdTime, modifiedTime, size)",
    orderBy: "modifiedTime desc",
  })

  console.log("[v0] Sending list request...")
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  console.log("[v0] List response status:", response.status)

  if (!response.ok) {
    console.log("[v0] List failed:", response.statusText)
    throw new Error(`Failed to list Google Drive files: ${response.statusText}`)
  }

  const result = await response.json()
  console.log("[v0] Files found:", result.files?.length || 0)
  return result
}

// Скачать файл из Google Drive
export const downloadFromGoogleDrive = async (accessToken: string, fileId: string): Promise<string> => {
  console.log("[v0] Downloading file from Google Drive...")
  console.log("[v0] File ID:", fileId)

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  console.log("[v0] Download response status:", response.status)

  if (!response.ok) {
    console.log("[v0] Download failed:", response.statusText)
    throw new Error(`Failed to download from Google Drive: ${response.statusText}`)
  }

  const content = await response.text()
  console.log("[v0] Downloaded file size:", content.length, "bytes")
  return content
}

// Удалить файл из Google Drive
export const deleteFromGoogleDrive = async (accessToken: string, fileId: string): Promise<void> => {
  console.log("[v0] Deleting file from Google Drive...")
  console.log("[v0] File ID:", fileId)

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  console.log("[v0] Delete response status:", response.status)

  if (!response.ok) {
    console.log("[v0] Delete failed:", response.statusText)
    throw new Error(`Failed to delete from Google Drive: ${response.statusText}`)
  }

  console.log("[v0] File deleted successfully")
}

export const saveVerificationCode = async (accessToken: string, email: string, code: string): Promise<any> => {
  console.log("[v0] Saving verification code to Google Drive...")
  console.log("[v0] Email:", email)

  const fileName = `verification-${email}-${Date.now()}.json`
  const content = JSON.stringify({
    email,
    code,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 минут
  })

  return await uploadToGoogleDrive(accessToken, fileName, content)
}

export const verifyCodeFromGoogleDrive = async (accessToken: string, email: string, code: string): Promise<boolean> => {
  console.log("[v0] Verifying code from Google Drive...")
  console.log("[v0] Email:", email)

  try {
    const filesData = await listGoogleDriveFiles(accessToken, `name contains 'verification-${email}'`)
    console.log("[v0] Found verification files:", filesData.files?.length || 0)

    for (const file of filesData.files || []) {
      const content = await downloadFromGoogleDrive(accessToken, file.id)
      const data = JSON.parse(content)

      if (data.code === code && new Date(data.expiresAt) > new Date()) {
        console.log("[v0] Verification code is valid")
        // Удаляем файл после успешной проверки
        await deleteFromGoogleDrive(accessToken, file.id)
        return true
      }
    }

    console.log("[v0] Verification code not found or expired")
    return false
  } catch (error) {
    console.log("[v0] Error verifying code:", error)
    return false
  }
}
