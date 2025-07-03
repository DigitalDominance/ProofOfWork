"use client"
import { motion } from "framer-motion"
import type { LucideProps } from "lucide-react"
import type { ElementType } from "react"

interface PulsatingGradientIconProps {
  IconComponent: ElementType<LucideProps>
  className?: string
  iconClassName?: string
  size?: number | string
}

export function PulsatingGradientIcon({
  IconComponent,
  className = "relative inline-flex items-center justify-center p-1 rounded-full",
  iconClassName = "text-accent",
  size = 24,
}: PulsatingGradientIconProps) {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/50 to-transparent animate-pulse-glow opacity-50" />
      <IconComponent size={size} className={`relative z-10 ${iconClassName}`} />
    </motion.div>
  )
}
