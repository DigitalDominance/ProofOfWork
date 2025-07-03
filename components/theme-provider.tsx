"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes" // Corrected import path

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Applying disableSystemTheme as per user's file.
  // The actual props like attribute="class" and defaultTheme="dark" will be passed from layout.tsx
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
