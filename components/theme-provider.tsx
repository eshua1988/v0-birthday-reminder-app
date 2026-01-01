'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { theme } = useTheme()

  React.useEffect(() => {
    console.log('[ThemeProvider] Current theme:', theme)
  }, [theme])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
