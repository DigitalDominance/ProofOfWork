"use client"
import { motion } from "framer-motion"
import Image from "next/image"
import { useState } from "react"

export function AnimatedLogo() {
  const [isClicked, setIsClicked] = useState(false)

  // Animation variants for stacking effect - bottom piece loads first
  // Added 1.5s base delay to wait for page load animation
  const bottomVariants = {
    initial: {
      opacity: 0,
      y: 100,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        delay: 1.7, // 1.5s base delay + 0.2s original delay
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    hover: {
      y: isClicked ? [0, 8, 25] : [0, 8, 20],
      transition: {
        duration: isClicked ? 0.8 : 0.6,
        ease: "easeInOut",
        times: [0, 0.4, 1],
      },
    },
  }

  // Center piece stacks on top of bottom with slight delay
  const centerVariants = {
    initial: {
      opacity: 0,
      y: 80,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.7,
        delay: 2.1, // 1.5s base delay + 0.6s original delay
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    hover: {
      y: isClicked ? [0, 3, 0] : [0, 2, 0],
      transition: {
        duration: isClicked ? 0.8 : 0.6,
        ease: "easeInOut",
        times: [0, 0.4, 1],
      },
    },
  }

  // Top piece stacks last with the most dramatic entrance
  const topVariants = {
    initial: {
      opacity: 0,
      y: 60,
      scale: 1.1,
      rotate: -5,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.9,
        delay: 2.5, // 1.5s base delay + 1.0s original delay
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    hover: {
      y: isClicked ? [0, -8, -25] : [0, -8, -20],
      transition: {
        duration: isClicked ? 0.8 : 0.6,
        ease: "easeInOut",
        times: [0, 0.4, 1],
      },
    },
  }

  const handleClick = () => {
    setIsClicked(true)
    setTimeout(() => setIsClicked(false), 800)
  }

  return (
    <div className="w-full flex justify-center items-center">
      {/* Absolutely centered container */}
      <div
        className="relative cursor-pointer mx-auto"
        style={{ width: "200px", height: "200px" }}
        onClick={handleClick}
      >
        {/* Bottom piece (V-shape) - appears first, lowest z-index */}
        <motion.div
          className="absolute z-10"
          style={{
            left: "50%",
            top: "98px",
            transform: "translateX(-50%)",
            width: "200px",
          }}
          variants={bottomVariants}
          initial="initial"
          animate="visible"
          whileHover="hover"
        >
          <Image
            src="/logoanimationbottom.png"
            alt="Logo bottom part"
            width={200}
            height={98}
            className="object-contain w-full h-auto"
            draggable={false}
          />
        </motion.div>

        {/* Center piece - stacks on top of bottom, medium z-index */}
        <motion.div
          className="absolute z-20"
          style={{
            left: "50%",
            top: "42px",
            transform: "translateX(-50%)",
            width: "200px",
          }}
          variants={centerVariants}
          initial="initial"
          animate="visible"
          whileHover="hover"
        >
          <Image
            src="/logoanimationcenter.png"
            alt="Logo center part"
            width={200}
            height={98}
            className="object-contain w-full h-auto"
            draggable={false}
          />
        </motion.div>

        {/* Top piece (diamond) - stacks last, highest z-index */}
        <motion.div
          className="absolute z-30"
          style={{
            left: "50%",
            top: "3px",
            transform: "translateX(-50%)",
            width: "200px",
          }}
          variants={topVariants}
          initial="initial"
          animate="visible"
          whileHover="hover"
        >
          <Image
            src="/logoanimationtop.png"
            alt="Logo top part"
            width={200}
            height={98}
            className="object-contain w-full h-auto"
            draggable={false}
          />
        </motion.div>
      </div>
    </div>
  )
}
