"use client"
import { motion, type Variants } from "framer-motion"
import type { JSX } from "react"

interface AnimatedTextProps {
  text: string
  el?: keyof JSX.IntrinsicElements
  className?: string
  once?: boolean
  staggerChildren?: number
  delay?: number
}

const defaultVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 100,
    },
  },
}

export function AnimatedText({
  text,
  el: Wrapper = "p",
  className,
  once = true,
  staggerChildren = 0.04,
  delay = 0,
}: AnimatedTextProps) {
  const textArray = Array.isArray(text) ? text : [text]
  const reflow = (arr: string[]) => arr.join("").split("")

  const containerVariants: Variants = {
    visible: {
      transition: {
        staggerChildren: staggerChildren,
        delayChildren: delay,
      },
    },
  }

  return (
    <Wrapper className={className}>
      <motion.span initial="hidden" whileInView="visible" viewport={{ once }} variants={containerVariants} aria-hidden>
        {reflow(textArray).map((char, i) => (
          <motion.span key={i} variants={defaultVariants} style={{ display: "inline-block", whiteSpace: "pre" }}>
            {char}
          </motion.span>
        ))}
      </motion.span>
    </Wrapper>
  )
}
