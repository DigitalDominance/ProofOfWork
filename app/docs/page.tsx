"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type React from "react"

import {
  BookOpen,
  Code,
  Zap,
  Users,
  Shield,
  DollarSign,
  ExternalLink,
  Copy,
  Globe,
  Wallet,
  MessageSquare,
  Scale,
  Lock,
  Eye,
  ChevronRight,
  Play,
  Github,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { InteractiveCard } from "@/components/custom/interactive-card"
import { Balancer } from "react-wrap-balancer"
import { toast } from "sonner"

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
  <section id={id} className={`w-full relative ${padding} ${className}`}>
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-background/3 dark:via-black/5 to-transparent opacity-20" />
    <div className="container px-4 md:px-6 relative z-10">{children}</div>
  </section>
)

export default function DocumentationPage() {
  const quickStartSteps = [
    {
      icon: <Wallet className="h-6 w-6 text-accent" />,
      title: "Connect Wallet",
      description: "Connect your MetaMask or compatible EVM wallet to the Kaspa network.",
    },
    {
      icon: <DollarSign className="h-6 w-6 text-accent" />,
      title: "Get KAS Tokens",
      description: "Acquire KAS tokens through our integrated swap widget or supported exchanges.",
    },
    {
      icon: <Users className="h-6 w-6 text-accent" />,
      title: "Choose Your Role",
      description: "Register as an employer to post jobs or as a worker to find opportunities.",
    },
    {
      icon: <Zap className="h-6 w-6 text-accent" />,
      title: "Start Working",
      description: "Post jobs, apply for work, and let smart contracts handle the rest!",
    },
  ]

  const smartContracts = [
    {
      name: "JobFactory",
      address: "0x69B9d9972B31c126143A7785ca23Be09E7df582F",
      description: "Creates and manages job contracts",
      functions: ["createJob", "getJobsByEmployer", "getAllJobs"],
    },
    {
      name: "DisputeDAO",
      address: "0x75f4C820A90eE9d87A2F3282d67d20CcE28876F8",
      description: "Handles dispute resolution and voting",
      functions: ["createDispute", "vote", "resolveDispute"],
    },
  ]

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <motion.section
        className="w-full min-h-[50vh] flex flex-col justify-center items-center text-center relative overflow-hidden py-16"
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.1, 0.1)}
      >
        <div className="container px-4 md:px-6 relative z-10">
          <motion.h1
            variants={fadeIn(0.1)}
            className="font-varien text-4xl font-normal tracking-wider-xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground mb-12"
          >
            <span className="text-accent">Documentation</span>
          </motion.h1>
          <motion.p
            variants={fadeIn(0.2)}
            className="mt-12 max-w-3xl mx-auto text-muted-foreground md:text-lg lg:text-xl font-varela"
          >
            <Balancer>
              Complete guides, references, and smart contract documentation for building on the Proof Of Works
              platform.
            </Balancer>
          </motion.p>
        </div>
      </motion.section>

      {/* Quick Start */}
      <SectionWrapper id="quick-start" padding="py-8 md:py-12">
        <motion.div variants={fadeIn()} className="text-center mb-12">
          <h2 className="font-varien text-3xl font-normal tracking-wider-xl sm:text-4xl text-foreground mb-6">
            Quick <span className="text-accent">Start Guide</span>
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground font-varela">
            <Balancer>Get up and running with POW in just a few simple steps.</Balancer>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {quickStartSteps.map((step, index) => (
            <motion.div variants={fadeIn(index * 0.1)} key={step.title}>
              <InteractiveCard className="h-full text-center">
                <div className="flex flex-col items-center p-6">
                  <div className="p-4 rounded-full bg-accent/10 mb-4">{step.icon}</div>
                  <h3 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground font-varela">
                    <Balancer>{step.description}</Balancer>
                  </p>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </div>

        <motion.div variants={fadeIn(0.4)} className="text-center">
          <Button
            asChild
            size="lg"
            className="font-varien bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40 transition-all duration-300 transform hover:scale-105 group tracking-wider"
          >
            <Link href="/jobs">
              Start Building
              <Play className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>
      </SectionWrapper>

      {/* Documentation Tabs */}
      <SectionWrapper id="docs-content" padding="py-8 md:py-12">
        <Tabs defaultValue="user-guide" className="w-full">
          <TabsList className="grid grid-cols-2 mb-8 font-varien">
            <TabsTrigger value="user-guide" className="text-sm">
              <BookOpen className="mr-2 h-4 w-4" />
              User Guide
            </TabsTrigger>
            <TabsTrigger value="smart-contracts" className="text-sm">
              <Shield className="mr-2 h-4 w-4" />
              Smart Contracts
            </TabsTrigger>
          </TabsList>

          {/* User Guide Tab */}
          <TabsContent value="user-guide" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* For Employers */}
              <InteractiveCard>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-accent/10">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-varien text-xl font-normal tracking-wider text-foreground">For Employers</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                        Creating Your First Job
                      </h4>
                      <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground font-varela">
                        <li>Connect your wallet and ensure you have sufficient KAS</li>
                        <li>Navigate to "Post a Job" and fill out the job details</li>
                        <li>Choose between weekly or one-time payment structure</li>
                        <li>Lock funds in the smart contract (includes 0.75% platform fee)</li>
                        <li>Your job goes live immediately for applications</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                        Managing Applications
                      </h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground font-varela">
                        <li>Review applicant profiles and on-chain reputation</li>
                        <li>Accept or decline applications with feedback</li>
                        <li>Communicate directly with potential hires</li>
                        <li>Track active jobs and payment schedules</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                        Payment & Disputes
                      </h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground font-varela">
                        <li>Payments are automatic based on contract terms</li>
                        <li>Open disputes if work quality issues arise</li>
                        <li>Participate in dispute resolution process</li>
                        <li>Build your employer reputation score</li>
                      </ul>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="w-full mt-6 bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                  >
                    <Link href="/post-job">
                      Post Your First Job
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </InteractiveCard>

              {/* For Workers */}
              <InteractiveCard>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-accent/10">
                      <Zap className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-varien text-xl font-normal tracking-wider text-foreground">For Workers</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                        Finding Work
                      </h4>
                      <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground font-varela">
                        <li>Browse available jobs by category, pay rate, or employer rating</li>
                        <li>Use filters to find opportunities matching your skills</li>
                        <li>Review job requirements and payment terms carefully</li>
                        <li>Submit compelling applications with relevant experience</li>
                        <li>Track application status and employer responses</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                        Working & Getting Paid
                      </h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground font-varela">
                        <li>Communicate with employers through secure messaging</li>
                        <li>Complete work according to agreed specifications</li>
                        <li>Receive automatic payments per contract schedule</li>
                        <li>Build your on-chain reputation with each job</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                        Dispute Resolution
                      </h4>
                      <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground font-varela">
                        <li>Open disputes for payment or scope issues</li>
                        <li>Provide evidence and communicate with jurors</li>
                        <li>Participate in fair, decentralized resolution</li>
                        <li>Maintain professional conduct throughout</li>
                      </ul>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="w-full mt-6 bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                  >
                    <Link href="/jobs">
                      Find Work Opportunities
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </InteractiveCard>
            </div>

            {/* Platform Features */}
            <div className="space-y-6">
              <h3 className="font-varien text-2xl font-normal tracking-wider text-foreground text-center">
                Platform <span className="text-accent">Features</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InteractiveCard>
                  <div className="p-6 text-center">
                    <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                      <Lock className="h-6 w-6 text-accent" />
                    </div>
                    <h4 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">
                      Smart Contract Security
                    </h4>
                    <p className="text-sm text-muted-foreground font-varela">
                      All funds are secured in audited smart contracts with automatic execution and dispute protection.
                    </p>
                  </div>
                </InteractiveCard>

                <InteractiveCard>
                  <div className="p-6 text-center">
                    <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                      <Scale className="h-6 w-6 text-accent" />
                    </div>
                    <h4 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">
                      Fair Dispute System
                    </h4>
                    <p className="text-sm text-muted-foreground font-varela">
                      Decentralized arbitration through qualified jurors ensures fair outcomes for all parties.
                    </p>
                  </div>
                </InteractiveCard>

                <InteractiveCard>
                  <div className="p-6 text-center">
                    <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                      <Eye className="h-6 w-6 text-accent" />
                    </div>
                    <h4 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">
                      Transparent Reputation
                    </h4>
                    <p className="text-sm text-muted-foreground font-varela">
                      Build verifiable, portable reputation scores that follow you across the decentralized web.
                    </p>
                  </div>
                </InteractiveCard>
              </div>
            </div>
          </TabsContent>

          {/* Smart Contracts Tab */}
          <TabsContent value="smart-contracts" className="space-y-8">
            <div className="text-center mb-8">
              <h3 className="font-varien text-2xl font-normal tracking-wider text-foreground mb-4">
                Smart <span className="text-accent">Contracts</span>
              </h3>
              <p className="text-muted-foreground font-varela max-w-2xl mx-auto">
                <Balancer>Deployed smart contracts on Kasplex L2. All contracts are verified and open source.</Balancer>
              </p>
            </div>

            {/* Contract Addresses */}
            <div className="space-y-6">
              {smartContracts.map((contract, index) => (
                <InteractiveCard key={index}>
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                      <h4 className="font-varien text-lg font-normal tracking-wider text-foreground">
                        {contract.name}
                      </h4>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="font-varien bg-transparent text-xs sm:text-sm"
                        >
                          <Link href={`https://frontend.kasplextest.xyz/address/${contract.address}`} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">View on Explorer</span>
                            <span className="sm:hidden">Explorer</span>
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="font-varien bg-transparent text-xs sm:text-sm">
                          <Github className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">Source Code</span>
                          <span className="sm:hidden">Code</span>
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 font-varela">{contract.description}</p>

                    <div className="mb-4">
                      <label className="text-sm font-medium text-foreground font-varien">Contract Address:</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-2 bg-muted rounded text-xs sm:text-sm font-mono font-varela break-all">
                          {contract.address}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 bg-transparent"
                          onClick={() => {
                            navigator.clipboard.writeText(contract.address)
                            toast.success("Address copied!")
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground font-varien">Key Functions:</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {contract.functions.map((func) => (
                          <Badge key={func} variant="secondary" className="font-mono text-xs font-varela">
                            {func}()
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </InteractiveCard>
              ))}
            </div>

            {/* Integration Example */}
            <InteractiveCard>
              <div className="p-6">
                <h4 className="font-varien text-lg font-normal tracking-wider text-foreground mb-4">
                  Integration Example
                </h4>
                <div className="bg-muted/50 rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                    <span className="text-sm font-medium text-foreground font-varien">
                      Connecting to JobFactory Contract
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-sm font-mono text-foreground font-varela">
                      {`import { ethers } from 'ethers';
import JobFactoryABI from './JobFactory.json';

// Connect to Kaspa EVM
const provider = new ethers.JsonRpcProvider('https://rpc.kaspa-evm.io');
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize contract
const jobFactory = new ethers.Contract(
  '0x69B9d9972B31c126143A7785ca23Be09E7df582F', // JobFactory address
  JobFactoryABI,
  signer
);

// Create a new job
const tx = await jobFactory.createJob(
  employerAddress,
  paymentType, // 0 = WEEKLY, 1 = ONE_OFF
  weeklyPayWei,
  durationWeeks,
  totalPayWei,
  jobTitle,
  description,
  positions,
  tags,
  { value: totalPayWei + platformFee }
);

await tx.wait();
console.log('Job created successfully!');`}
                    </code>
                  </pre>
                </div>
              </div>
            </InteractiveCard>
          </TabsContent>
        </Tabs>
      </SectionWrapper>

      {/* Resources */}
      <SectionWrapper id="resources" padding="py-12 md:py-16">
        <motion.div variants={fadeIn()} className="text-center mb-12">
          <h2 className="font-varien text-3xl font-normal tracking-wider-xl sm:text-4xl text-foreground mb-6">
            Additional <span className="text-accent">Resources</span>
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground font-varela">
            <Balancer>Helpful links, tools, and community resources for POW developers and users.</Balancer>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InteractiveCard>
            <div className="p-6 text-center">
              <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">Kaspa Network</h3>
              <p className="text-sm text-muted-foreground mb-4 font-varela">
                Learn more about the Kaspa blockchain that powers our platform.
              </p>
              <Button
                asChild
                variant="outline"
                className="border-accent/50 text-accent hover:bg-accent/10 font-varien bg-transparent"
              >
                <Link href="https://kaspa.org" target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Kaspa.org
                </Link>
              </Button>
            </div>
          </InteractiveCard>

          <InteractiveCard>
            <div className="p-6 text-center">
              <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                <Github className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">GitHub Repository</h3>
              <p className="text-sm text-muted-foreground mb-4 font-varela">
                Access our open-source code, contribute to development, and report issues.
              </p>
              <Button
                asChild
                variant="outline"
                className="border-accent/50 text-accent hover:bg-accent/10 font-varien bg-transparent"
              >
                <Link href="https://github.com/proofofworks" target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on GitHub
                </Link>
              </Button>
            </div>
          </InteractiveCard>

          <InteractiveCard>
            <div className="p-6 text-center">
              <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                <MessageSquare className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">
                Telegram Community
              </h3>
              <p className="text-sm text-muted-foreground mb-4 font-varela">
                Join our community for support, discussions, and development updates.
              </p>
              <Button
                asChild
                variant="outline"
                className="border-accent/50 text-accent hover:bg-accent/10 font-varien bg-transparent"
              >
                <Link href="https://t.me/+WxraM9RZITBlNDhh" target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Join Telegram
                </Link>
              </Button>
            </div>
          </InteractiveCard>
        </div>
      </SectionWrapper>

      {/* Call to Action */}
      <SectionWrapper id="cta" padding="py-12 md:py-16">
        <motion.div variants={fadeIn()} className="text-center">
          <InteractiveCard className="max-w-2xl mx-auto p-8">
            <h2 className="font-varien text-2xl font-normal tracking-wider text-foreground mb-4">
              Ready to <span className="text-accent">Build</span>?
            </h2>
            <p className="text-muted-foreground mb-6 font-varela">
              <Balancer>Start integrating with POW today and join the future of decentralized work.</Balancer>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="font-varien bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40 transition-all duration-300 transform hover:scale-105 group tracking-wider"
              >
                <Link href="/jobs">
                  Start Building
                  <Code className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="font-varien shadow-lg hover:shadow-md transition-all duration-300 transform hover:scale-105 group border-accent/50 hover:bg-accent/10 hover:text-accent tracking-wider bg-transparent"
              >
                <Link href="mailto:developers@proofofworks.io">
                  Get Support
                  <MessageSquare className="ml-2 h-5 w-5 group-hover:text-accent transition-colors" />
                </Link>
              </Button>
            </div>
          </InteractiveCard>
        </motion.div>
      </SectionWrapper>
    </div>
  )
}
