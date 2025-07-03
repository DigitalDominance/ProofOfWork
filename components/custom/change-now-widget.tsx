"use client"

import { useTheme } from "next-themes"
import Script from "next/script"
import { useEffect, useState } from "react"

export function ChangeNowWidget() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // To prevent hydration mismatch, don't render iframe on server
    // You can render a placeholder if needed
    return <div style={{ height: "356px", width: "100%", background: "hsl(var(--muted))" }} aria-busy="true" />
  }

  const isDarkMode = theme === "dark"
  const widgetSrc = `https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=true&amount=0.1&amountFiat=1500&backgroundColor=${isDarkMode ? "2B2B35" : "FFFFFF"}&darkMode=${isDarkMode}&from=btc&fromFiat=eur&horizontal=false&isFiat&lang=en-US&link_id=26eb6983a7bef9&locales=true&logo=true&primaryColor=49EACB&to=kas&toFiat=eth&toTheMoon=true`

  return (
    <div className="rounded-xl overflow-hidden shadow-2xl border border-border/20">
      <iframe
        id="iframe-widget"
        src={widgetSrc}
        style={{ height: "356px", width: "100%", border: "none" }}
        title="ChangeNOW Crypto Exchange Widget"
      />
      <Script
        id="changenow-stepper-connector"
        strategy="afterInteractive" // Load after page is interactive
        src="https://changenow.io/embeds/exchange-widget/v2/stepper-connector.js"
      />
    </div>
  )
}
