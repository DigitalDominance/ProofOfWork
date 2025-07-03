"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a placeholder or null during SSR/hydration mismatch to avoid layout shift
    return <div className="flex items-center space-x-2 h-[1.2rem] w-[calc(1.2rem*2+24px+0.5rem*2)]" /> // Approx size
  }

  const isDarkMode = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark")
  }

  // Classes for icon animations from user's file
  const sunAnimationClasses = `h-[1.2rem] w-[1.2rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
    isDarkMode ? "text-muted-foreground scale-75 rotate-12" : "text-accent scale-100 rotate-0"
  }`
  const moonAnimationClasses = `h-[1.2rem] w-[1.2rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
    !isDarkMode ? "text-muted-foreground scale-75 rotate-12" : "text-accent scale-100 rotate-0"
  }`
  const switchAnimationClasses = "transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"

  return (
    <div className="flex items-center space-x-2">
      <Sun
        className={sunAnimationClasses}
        onClick={() => setTheme("light")}
        aria-label="Switch to light mode"
        role="button"
      />
      <Switch
        checked={isDarkMode}
        onCheckedChange={toggleTheme}
        aria-label="Toggle theme"
        className={`${switchAnimationClasses} data-[state=checked]:bg-accent data-[state=unchecked]:bg-muted-foreground/30 focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background`}
      />
      <Moon
        className={moonAnimationClasses}
        onClick={() => setTheme("dark")}
        aria-label="Switch to dark mode"
        role="button"
      />
    </div>
  )
}
