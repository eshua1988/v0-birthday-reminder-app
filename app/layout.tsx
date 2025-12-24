import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LocaleProvider } from "@/lib/locale-context"
import { NotificationManager } from "@/components/notification-manager"
import { NotificationPermissionPrompt } from "@/components/notification-permission-prompt"
import { InactivityLogout } from "@/components/inactivity-logout"
import { Toaster } from "@/components/ui/toaster"
import { FirebaseNotificationManager } from "@/components/firebase-notification-manager"
import { NotificationPermissionAutoRequest } from "@/components/notification-permission-auto-request"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Дни Рождения - Church Birthday Reminder",
  description: "Приложение для напоминания дней рождений в церкви",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className={`font-sans antialiased`}>
        <LocaleProvider>
          {children}
          <NotificationPermissionAutoRequest />
          <FirebaseNotificationManager />
          <NotificationManager />
          <NotificationPermissionPrompt />
          <InactivityLogout />
          <Toaster />
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}
