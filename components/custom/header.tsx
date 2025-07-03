"use client"

import Link from "next/link"
import { Briefcase, Users, ShieldCheck, Menu, X, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ConnectWallet } from "./connect-wallet"
import { ThemeSwitch } from "./theme-switch"
import Image from "next/image"

const navItems = [
  { name: "Find Work", href: "/jobs", icon: <Briefcase className="h-5 w-5" /> },
  { name: "Tasks", href: "/tasks", icon: <Target className="h-5 w-5" /> },
  { name: "Post a Job", href: "/post-job", icon: <Users className="h-5 w-5" /> },
  { name: "Disputes", href: "/disputes", icon: <ShieldCheck className="h-5 w-5" /> },
]

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect screen size and update state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768) // Tailwind's `md` breakpoint is 768px
    }

    handleResize() // Set initial value
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="w-full max-w-none px-4 lg:px-8 xl:px-12 2xl:px-16 flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative h-12 w-auto logo-glow">
            {/* Dark mode logo (default) */}
            <Image
              src="/powlogodarkmode.webp"
              alt="Proof of Works Logo"
              width={200}
              height={48}
              className="object-contain h-12 w-auto dark:block hidden"
              priority
            />
            {/* Light mode logo */}
            <Image
              src="/powlogolightmode.webp"
              alt="Proof of Works Logo"
              width={200}
              height={48}
              className="object-contain h-12 w-auto dark:hidden block"
              priority
            />
          </div>
        </Link>

        {isMobile ? (
          // Mobile Navigation
          <div className="md:hidden flex items-center justify-end w-full ml-2">
            <div className="flex items-center gap-1">
              <div className="scale-[0.5]">
                <ThemeSwitch />
              </div>
              <div className="block md:hidden scale-[0.65] -mx-8">
                <ConnectWallet />
              </div>
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="scale-75 translate-x-2">
                    <Menu className="h-6 w-6 text-accent" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px] glass-effect border-0 [&>button]:hidden">
                  <div className="flex flex-col h-full p-6">
                    <div className="flex justify-between items-center mb-8">
                      <Link href="/" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="relative h-8 w-auto">
                          {/* Dark mode logo (default) */}
                          <Image
                            src="/powlogodarkmode.webp"
                            alt="Proof of Works Logo"
                            width={160}
                            height={32}
                            className="object-contain h-8 w-auto dark:block hidden"
                          />
                          {/* Light mode logo */}
                          <Image
                            src="/powlogolightmode.webp"
                            alt="Proof of Works Logo"
                            width={160}
                            height={32}
                            className="object-contain h-8 w-auto dark:hidden block"
                          />
                        </div>
                      </Link>
                      <motion.button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-md hover:bg-accent/10 transition-colors"
                        whileTap={{ scale: 0.9, rotate: 90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <X className="h-5 w-5 text-accent" />
                        <span className="sr-only">Close menu</span>
                      </motion.button>
                    </div>

                    <nav className="flex flex-col gap-6">
                      {navItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="font-varien italic text-base font-medium text-muted-foreground transition-colors hover:text-accent flex items-center gap-3 p-2 rounded-md hover:bg-accent/10 tracking-wider"
                        >
                          {item.icon}
                          {item.name}
                        </Link>
                      ))}
                    </nav>

                    <div className="mt-auto pt-6 border-t border-border/40">
                      <p className="text-xs text-muted-foreground text-center font-varien tracking-wider">
                        &copy; {new Date().getFullYear()} Proof Of Works
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        ) : (
          // Desktop Navigation
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-4">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    className="font-varien italic text-sm font-medium text-muted-foreground transition-colors hover:text-accent flex items-center gap-2 group tracking-wider"
                  >
                    <span className="group-hover:text-accent transition-colors">{item.icon}</span>
                    {item.name}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="hidden md:block">
              <ConnectWallet />
            </div>

            <ThemeSwitch />
          </div>
        )}
      </div>
    </motion.header>
  )
}
