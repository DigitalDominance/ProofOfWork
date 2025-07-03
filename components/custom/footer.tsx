"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

export function Footer() {
  const socialLinks = [
    {
      name: "Telegram",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      href: "https://t.me/+WxraM9RZITBlNDhh",
    },
    {
      name: "X",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: "https://x.com/ProofOfWorksKAS",
    },
  ]

  const footerLinks = [
    { name: "About Us", href: "/about" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Documentation", href: "/docs" },
  ]

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="border-t border-border/40 bg-background/80"
    >
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center mb-4">
              <motion.div className="relative h-16 w-auto" whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }}>
                {/* Dark mode logo (default) */}
                <Image
                  src="/powlogodarkmode.webp"
                  alt="Proof of Works Logo"
                  width={240}
                  height={64}
                  className="object-contain h-16 w-auto dark:block hidden"
                />
                {/* Light mode logo */}
                <Image
                  src="/powlogolightmode.webp"
                  alt="Proof of Works Logo"
                  width={240}
                  height={64}
                  className="object-contain h-16 w-auto dark:hidden block"
                />
              </motion.div>
            </Link>
            <p className="text-sm text-muted-foreground font-varien tracking-wider">
              Revolutionizing hiring with on-chain transparency and trust.
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold text-foreground mb-4 font-varien tracking-wider">Quick Links</h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-accent transition-colors font-varien tracking-wider"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-md font-semibold text-foreground mb-4 font-varien tracking-wider">Connect With Us</h3>
            <div className="flex space-x-4">
              {socialLinks.map((link) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-accent transition-colors"
                  aria-label={link.name}
                  whileHover={{ y: -2, scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {link.icon}
                </motion.a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-6 font-varien tracking-wider">
              Built on Kaspa's EVM Layer.
            </p>
            {/* Powered by Kaspa, left-aligned & smaller */}
            <div className="mt-4">
              <Image
                src="/LND-CLEAR.png"
                alt="Powered by Kaspa"
                width={200}
                height={70}
                className="object-contain"
              />
            </div>
          </div>
        </div>
        <div className="border-t border-border/40 pt-8 text-center">
          <p className="text-sm text-muted-foreground font-varien tracking-wider">
            &copy; {new Date().getFullYear()} Proof Of Works. All rights reserved.
          </p>
        </div>
      </div>
    </motion.footer>
  )
}
