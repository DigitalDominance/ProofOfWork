"use client"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface InteractiveCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
  as?: "div" | "a"
}

export function InteractiveCard({ children, className, onClick, href, as: Component = "div" }: InteractiveCardProps) {
  const cardVariants = {
    rest: { scale: 1, boxShadow: "0px 5px 10px rgba(0,0,0,0.1)" },
    hover: {
      scale: 1.03,
      boxShadow: "0px 10px 20px hsl(var(--accent) / 0.2), 0px 5px 15px rgba(0,0,0,0.15)",
      transition: { duration: 0.3, ease: "easeOut" },
    },
    tap: { scale: 0.98, transition: { duration: 0.2, ease: "easeOut" } },
  }

  const content = (
    <motion.div
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      className={cn(
        "p-6 rounded-xl glass-effect overflow-hidden relative group",
        "border-2 border-transparent hover:border-accent/50 transition-colors duration-300",
        className,
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-radial-accent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )

  if (Component === "a" && href) {
    return (
      <a
        href={href}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      >
        {content}
      </a>
    )
  }

  return content
}
