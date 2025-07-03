import type React from "react"
import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google" // Import Poppins
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/custom/header"
import { Footer } from "@/components/custom/footer"
import { Toaster } from "sonner"
import { Web3Provider } from "@/components/custom/web3-provider"
import { headers } from "next/headers"
import { cookieToInitialState } from "wagmi"
// import { wagmiConfig } from "@/lib/web3modal-config"
import { AnimatedBackground } from "@/components/custom/animated-background"
import { AppKitProvider } from "./appkit"
import { UserProvider } from "@/context/UserContext"
// import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
// Initialize Poppins font
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins", // CSS variable for this font
  weight: ["300", "400", "500", "600", "700", "800", "900"], // Include desired weights
  display: "swap",
})

export const metadata: Metadata = {
  title: "Proof Of Works - On-Chain Hiring & Payroll",
  description: "Transparent, trustless, and accountable hiring on Kaspa's EVM layer.",
  icons: {
    icon: [
      { url: "/favicon.ico", media: "(prefers-color-scheme: light)" },
      { url: "/favicon.ico", media: "(prefers-color-scheme: dark)" },
    ],
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // const initialState = cookieToInitialState(wagmiConfig, headers().get("cookie"))

  return (
    // Add poppins.variable to the html tag classes
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className={`font-sans antialiased min-h-screen flex flex-col bg-background`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AnimatedBackground />
          {/* <Web3Provider initialState={initialState}> */}
          <AppKitProvider>
            <UserProvider>
              <Header />
              <main className="flex-1 relative z-10">{children}</main>
              <Footer />
            </UserProvider>
            <Toaster richColors position="top-right" />
            {/* <Toaster/> */}
          </AppKitProvider>            
          {/* </Web3Provider> */}
        </ThemeProvider>
      </body>
    </html>
  )
}
