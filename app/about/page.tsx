"use client"
import { Button } from "@/components/ui/button"
import type React from "react"
import Image from "next/image"

import {
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Heart,
  TrendingUp,
  Award,
  Target,
  Sparkles,
  CheckCircle,
  Rocket,
  Building,
  UserCheck,
  FileText,
  Lock,
  Eye,
  Scale,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { InteractiveCard } from "@/components/custom/interactive-card"
import { Balancer } from "react-wrap-balancer"

// Animation variants
const fadeIn = (delay = 0, duration = 0.5) => ({
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay, duration, ease: "easeOut" } },
})

const staggerContainer = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
})

const slideInLeft = (delay = 0) => ({
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { delay, duration: 0.6, ease: "easeOut" } },
})

const slideInRight = (delay = 0) => ({
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { delay, duration: 0.6, ease: "easeOut" } },
})

// Section wrapper component
const SectionWrapper = ({
  children,
  className,
  id,
  padding = "py-12 md:py-16",
}: {
  children: React.ReactNode
  className?: string
  id?: string
  padding?: string
}) => (
  <section id={id} className={`w-full relative ${padding} ${className} overflow-x-hidden`}>
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-background/3 dark:via-black/5 to-transparent opacity-20" />
    <div className="container px-4 md:px-6 relative z-10 overflow-x-hidden min-w-0">{children}</div>
  </section>
)

export default function AboutUsPage() {
  const visionPoints = [
    {
      icon: <Shield className="h-6 w-6 text-accent" />,
      title: "Provable Work",
      description:
        "Every job, every payment, every reputation point is recorded immutably on-chain for complete transparency.",
    },
    {
      icon: <Scale className="h-6 w-6 text-accent" />,
      title: "Fair Disputes",
      description: "Decentralized arbitration ensures fair outcomes without bias or centralized control.",
    },
    {
      icon: <UserCheck className="h-6 w-6 text-accent" />,
      title: "Portable Reputation",
      description: "Build your professional reputation on-chain - it follows you everywhere, forever.",
    },
    {
      icon: <FileText className="h-6 w-6 text-accent" />,
      title: "On-Chain Resumes",
      description: "Your work history, skills, and achievements are permanently verified and accessible.",
    },
  ]

  const teamValues = [
    {
      icon: <Heart className="h-6 w-6 text-accent" />,
      title: "Community First",
      description: "Built by the KASPER community, for the KAS ecosystem. Every decision prioritizes our users.",
    },
    {
      icon: <Sparkles className="h-6 w-6 text-accent" />,
      title: "Innovation",
      description: "Pushing the boundaries of what's possible with blockchain technology and decentralized work.",
    },
    {
      icon: <Target className="h-6 w-6 text-accent" />,
      title: "Transparency",
      description: "Open source, audited smart contracts, and complete visibility into all platform operations.",
    },
    {
      icon: <Rocket className="h-6 w-6 text-accent" />,
      title: "Future-Ready",
      description: "Building the infrastructure for the next generation of work and professional relationships.",
    },
  ]

  const stats = [
    { number: "100%", label: "Decentralized", icon: <Globe className="h-8 w-8 text-accent" /> },
    { number: "0.75%", label: "Platform Fee", icon: <TrendingUp className="h-8 w-8 text-accent" /> },
    { number: "24/7", label: "Automated Payments", icon: <Zap className="h-8 w-8 text-accent" /> },
    { number: "∞", label: "Reputation Permanence", icon: <Award className="h-8 w-8 text-accent" /> },
  ]

  return (
    <div className="flex flex-col items-center overflow-x-hidden min-w-0 w-full">
      {/* Hero Section */}
      <motion.section
        className="w-full min-h-[80vh] flex flex-col justify-center items-center text-center relative overflow-hidden py-16"
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.1, 0.1)}
      >
        <div className="container px-4 md:px-6 relative z-10">
          <motion.div variants={fadeIn(0.1)} className="mb-16">
            <div className="relative w-32 h-32 mx-auto mb-12">
              <Image
                src="/kasperlogo.webp"
                alt="KASPER Logo"
                fill
                className="object-contain rounded-full shadow-2xl shadow-accent/20"
                priority
              />
            </div>
          </motion.div>

          <motion.h1
            variants={fadeIn(0.2)}
            className="font-varien text-4xl font-normal tracking-wider-xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground mb-12"
          >
            About <span className="text-accent">POW</span>
          </motion.h1>

          <motion.p
            variants={fadeIn(0.3)}
            className="mt-12 max-w-4xl mx-auto text-muted-foreground md:text-lg lg:text-xl font-varela leading-relaxed"
          >
            <Balancer>
              Inspired by KASPER community members, created by the KASPER team, for the KAS community. We're building
              the future of work where every job, every payment, and every professional achievement is provably fair and
              permanently recorded on-chain.
            </Balancer>
          </motion.p>

          <motion.div variants={fadeIn(0.4)} className="mt-20 flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              asChild
              size="lg"
              className="font-varien bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40 transition-all duration-300 transform hover:scale-105 group tracking-wider"
            >
              <Link href="/jobs">
                Explore Jobs
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="font-varien shadow-lg hover:shadow-md transition-all duration-300 transform hover:scale-105 group border-accent/50 hover:bg-accent/10 hover:text-accent tracking-wider bg-transparent"
            >
              <Link href="/post-job">
                Post a Job
                <Building className="ml-2 h-5 w-5 group-hover:text-accent transition-colors" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-accent/30 rounded-full animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-accent/20 rounded-full animate-pulse delay-1000" />
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-accent/40 rounded-full animate-pulse delay-500" />
        </div>
      </motion.section>

      {/* Stats Section */}
      <SectionWrapper id="stats" padding="py-8 md:py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer(0.1)}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((stat, index) => (
            <motion.div variants={fadeIn(index * 0.1)} key={stat.label}>
              <InteractiveCard className="text-center p-6">
                <div className="flex justify-center mb-4">{stat.icon}</div>
                <div className="text-3xl font-bold text-accent font-varien mb-2">{stat.number}</div>
                <div className="text-sm text-muted-foreground font-varela">{stat.label}</div>
              </InteractiveCard>
            </motion.div>
          ))}
        </motion.div>
      </SectionWrapper>

      {/* Our Vision */}
      <SectionWrapper id="vision" padding="py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideInLeft(0.1)}
            className="text-center lg:text-left"
          >
            <h2 className="font-varien text-3xl font-normal tracking-wider-xl sm:text-4xl text-foreground mb-6">
              The Future of <span className="text-accent">Work</span>
            </h2>
            <p className="text-muted-foreground mb-8 font-varela text-lg leading-relaxed">
              <Balancer>
                Traditional hiring is broken. Resumes can be faked, references can be bought, and work history can be
                embellished. POW changes everything by putting professional reputation on-chain where it can't be
                manipulated, only earned.
              </Balancer>
            </p>
            <p className="text-muted-foreground mb-8 font-varela text-lg leading-relaxed">
              <Balancer>
                Every job completed, every payment made, every dispute resolved becomes part of an immutable
                professional record. This isn't just a job platform - it's the foundation of a new economy built on
                provable work and verifiable reputation.
              </Balancer>
            </p>
            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <CheckCircle className="h-6 w-6 text-accent shrink-0" />
              <span className="text-foreground font-varela">
                <strong>On-chain hiring is the future</strong> - and POW is ready for it all.
              </span>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideInRight(0.2)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            {visionPoints.map((point, index) => (
              <InteractiveCard key={point.title} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-accent/10 shrink-0">{point.icon}</div>
                  <div>
                    <h3 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                      {point.title}
                    </h3>
                    <p className="text-sm text-muted-foreground font-varela">
                      <Balancer>{point.description}</Balancer>
                    </p>
                  </div>
                </div>
              </InteractiveCard>
            ))}
          </motion.div>
        </div>
      </SectionWrapper>

      {/* Our Story */}
      <SectionWrapper id="story" padding="py-12 md:py-16" className="bg-accent/5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn()}
          className="text-center mb-12"
        >
          <h2 className="font-varien text-3xl font-normal tracking-wider-xl sm:text-4xl text-foreground mb-6">
            Our <span className="text-accent">Story</span>
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground font-varela text-lg leading-relaxed">
            <Balancer>
              Born from the vibrant KASPER community, POW represents the collective vision of builders, creators, and
              innovators who believe in the power of decentralized technology to create a fairer, more transparent world
              of work.
            </Balancer>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideInLeft(0.1)}>
            <InteractiveCard className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-16 h-16">
                  <Image src="/kasperlogo.webp" alt="KASPER Logo" fill className="object-contain rounded-full" />
                </div>
                <div>
                  <h3 className="font-varien text-xl font-normal tracking-wider text-foreground">KASPER Community</h3>
                  <p className="text-sm text-muted-foreground font-varela">The heart of innovation</p>
                </div>
              </div>
              <p className="text-muted-foreground font-varela leading-relaxed mb-4">
                The KASPER community has always been about pushing boundaries and exploring what's possible with
                blockchain technology. When community members expressed the need for a truly decentralized job platform,
                the KASPER team stepped up to make it happen.
              </p>
              <p className="text-muted-foreground font-varela leading-relaxed">
                POW isn't just built on Kaspa's technology - it's built with Kaspa's values: speed, security,
                scalability, and most importantly, community-first development.
              </p>
            </InteractiveCard>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideInRight(0.2)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            {teamValues.map((value, index) => (
              <InteractiveCard key={value.title} className="p-6 text-center">
                <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">{value.icon}</div>
                <h3 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground font-varela">
                  <Balancer>{value.description}</Balancer>
                </p>
              </InteractiveCard>
            ))}
          </motion.div>
        </div>
      </SectionWrapper>

      {/* Technology Section */}
      <SectionWrapper id="technology" padding="py-12 md:py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn()}
          className="text-center mb-12"
        >
          <h2 className="font-varien text-3xl font-normal tracking-wider-xl sm:text-4xl text-foreground mb-6">
            Built on <span className="text-accent">Kaspa</span>
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground font-varela text-lg leading-relaxed">
            <Balancer>
              Leveraging Kaspa's revolutionary BlockDAG technology and Kasplex L2 for lightning-fast, secure, and
              scalable smart contract execution.
            </Balancer>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn(0.1)}>
            <InteractiveCard className="p-8 text-center h-full">
              <div className="p-4 rounded-full bg-accent/10 mb-6 inline-block">
                <Zap className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-varien text-xl font-normal tracking-wider text-foreground mb-4">Lightning Fast</h3>
              <p className="text-muted-foreground font-varela leading-relaxed">
                Kaspa's BlockDAG architecture enables near-instant transaction confirmation, making job applications and
                payments seamless.
              </p>
            </InteractiveCard>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn(0.2)}>
            <InteractiveCard className="p-8 text-center h-full">
              <div className="p-4 rounded-full bg-accent/10 mb-6 inline-block">
                <Lock className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-varien text-xl font-normal tracking-wider text-foreground mb-4">Ultra Secure</h3>
              <p className="text-muted-foreground font-varela leading-relaxed">
                Military-grade cryptography and decentralized consensus ensure your funds and data are always protected.
              </p>
            </InteractiveCard>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn(0.3)}>
            <InteractiveCard className="p-8 text-center h-full">
              <div className="p-4 rounded-full bg-accent/10 mb-6 inline-block">
                <Globe className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-varien text-xl font-normal tracking-wider text-foreground mb-4">Globally Scalable</h3>
              <p className="text-muted-foreground font-varela leading-relaxed">
                Built to handle millions of users and transactions without compromising on speed or decentralization.
              </p>
            </InteractiveCard>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* Call to Action */}
      <SectionWrapper id="cta" padding="py-12 md:py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn()}
          className="text-center"
        >
          <InteractiveCard className="max-w-4xl mx-auto p-12">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <Image src="/kasperlogo.webp" alt="KASPER Logo" fill className="object-contain rounded-full" />
            </div>
            <h2 className="font-varien text-3xl font-normal tracking-wider text-foreground mb-6">
              Join the <span className="text-accent">Revolution</span>
            </h2>
            <p className="text-muted-foreground mb-8 font-varela text-lg max-w-2xl mx-auto leading-relaxed">
              <Balancer>
                Be part of the future where work is provable, payments are guaranteed, and reputation is permanent. The
                decentralized economy starts here, starts now, starts with you.
              </Balancer>
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                asChild
                size="lg"
                className="font-varien bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40 transition-all duration-300 transform hover:scale-105 group tracking-wider"
              >
                <Link href="/jobs">
                  Start Your Journey
                  <Rocket className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="font-varien shadow-lg hover:shadow-md transition-all duration-300 transform hover:scale-105 group border-accent/50 hover:bg-accent/10 hover:text-accent tracking-wider bg-transparent"
              >
                <Link href="/documentation">
                  Learn More
                  <Eye className="ml-2 h-5 w-5 group-hover:text-accent transition-colors" />
                </Link>
              </Button>
            </div>
          </InteractiveCard>
        </motion.div>
      </SectionWrapper>
    </div>
  )
}
