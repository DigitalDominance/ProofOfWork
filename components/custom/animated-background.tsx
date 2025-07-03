"use client"
import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    let gradientAngle = 0

    const particles: Particle[] = []
    const particleCount = Math.floor((width * height) / 12000)

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string

      constructor(x: number, y: number, color: string) {
        this.x = x
        this.y = y
        this.size = Math.random() * 1.8 + 0.6
        this.speedX = Math.random() * 0.8 - 0.4
        this.speedY = Math.random() * 0.8 - 0.4
        this.color = color
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        if (this.size > 0.1) this.size -= 0.003
        if (this.x < 0 || this.x > width) this.speedX *= -1
        if (this.y < 0 || this.y > height) this.speedY *= -1
      }

      draw() {
        if (ctx && this.size > 0.1) {
          ctx.fillStyle = this.color
          ctx.beginPath()
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    function init() {
      particles.length = 0
      const particleColor = resolvedTheme === "dark" ? "hsla(169, 79%, 60%, 0.4)" : "hsla(169, 79%, 70%, 0.5)"
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(Math.random() * width, Math.random() * height, particleColor))
      }
    }

    function drawGlobalGradient(context: CanvasRenderingContext2D) {
      gradientAngle += 0.0005 // Slow rotation speed

      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.max(width, height) * 0.8

      // Define base HSL values without the 'hsl()' wrapper for easier HSLA construction
      const accentBaseHSL = resolvedTheme === "dark" ? "169, 79%, 60%" : "169, 79%, 70%"
      const backgroundBaseHSL = resolvedTheme === "dark" ? "224, 71%, 4%" : "0, 0%, 100%"

      const grad = context.createLinearGradient(
        centerX + Math.cos(gradientAngle) * radius,
        centerY + Math.sin(gradientAngle) * radius,
        centerX - Math.cos(gradientAngle) * radius,
        centerY - Math.sin(gradientAngle) * radius,
      )

      // Correctly formatted HSLA strings
      grad.addColorStop(0, `hsla(${accentBaseHSL}, 0)`) // Transparent start (accent)
      grad.addColorStop(0.3, `hsla(${accentBaseHSL}, 0.1)`) // Subtle accent (alpha 10%)
      grad.addColorStop(0.7, `hsla(${accentBaseHSL}, 0.05)`) // More subtle accent (alpha 5%)
      grad.addColorStop(1, `hsla(${backgroundBaseHSL}, 0)`) // Transparent end (background)

      context.fillStyle = grad
      context.fillRect(0, 0, width, height)
    }

    function animateParticles() {
      if (ctx) {
        ctx.clearRect(0, 0, width, height)
        drawGlobalGradient(ctx)
        for (let i = 0; i < particles.length; i++) {
          particles[i].update()
          particles[i].draw()
        }
        connectParticles(ctx)
      }
      animationFrameId = requestAnimationFrame(animateParticles)
    }

    function connectParticles(context: CanvasRenderingContext2D) {
      const lineColor = resolvedTheme === "dark" ? "hsla(169, 79%, 60%, 0.08)" : "hsla(169, 79%, 70%, 0.1)"
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x
          const dy = particles[a].y - particles[b].y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < 120) {
            context.strokeStyle = lineColor
            context.lineWidth = 0.3
            context.beginPath()
            context.moveTo(particles[a].x, particles[a].y)
            context.lineTo(particles[b].x, particles[b].y)
            context.stroke()
          }
        }
      }
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      init()
    }

    init()
    animateParticles()
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
      particles.length = 0
    }
  }, [resolvedTheme])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 -z-20 w-full h-full pointer-events-none" />
}
