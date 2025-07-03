"use client"
import { Button } from "@/components/ui/button"
import type React from "react"
import { useState } from "react"

import { ArrowRight, Shield, Scale, FileText, AlertTriangle, CheckCircle, Users, Lock, Gavel, Clock, DollarSign, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import Link from "next/link"
import { motion } from "framer-motion"
import { InteractiveCard } from "@/components/custom/interactive-card"
import { Balancer } from "react-wrap-balancer"

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

const CollapsibleSection = ({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <InteractiveCard className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-accent/5 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-accent/10">{icon}</div>
          <h3 className="font-varien text-lg font-normal tracking-wider text-foreground">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5 text-accent" /> : <ChevronDown className="h-5 w-5 text-accent" />}
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 pb-6"
        >
          <div className="prose prose-sm max-w-none text-muted-foreground font-varela">{children}</div>
        </motion.div>
      )}
    </InteractiveCard>
  )
}

export default function TermsOfServicePage() {
  const keyHighlights = [
    {
      icon: <Shield className="h-6 w-6 text-accent" />,
      title: "Blockchain Security",
      description: "All transactions and agreements are secured by smart contracts on the Kaspa blockchain.",
    },
    {
      icon: <Scale className="h-6 w-6 text-accent" />,
      title: "Fair Dispute Resolution",
      description: "Decentralized arbitration through our DisputeDAO ensures impartial conflict resolution.",
    },
    {
      icon: <Lock className="h-6 w-6 text-accent" />,
      title: "Fund Protection",
      description: "Employer funds are locked in smart contracts until job completion or dispute resolution.",
    },
    {
      icon: <Users className="h-6 w-6 text-accent" />,
      title: "Reputation System",
      description: "Build your on-chain reputation through successful job completions and fair dealings.",
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
            Terms of <span className="text-accent">Service</span>
          </motion.h1>
          <motion.p
            variants={fadeIn(0.2)}
            className="mt-12 max-w-3xl mx-auto text-muted-foreground md:text-lg lg:text-xl font-varela"
          >
            <Balancer>
              Welcome to Proof Of Works (POW), the decentralized job platform built on Kaspa's blockchain. These terms
              govern your use of our platform and smart contract services.
            </Balancer>
          </motion.p>
        </div>
      </motion.section>

      {/* Key Highlights */}
      <SectionWrapper id="highlights" padding="py-8 md:py-12">
        <motion.div variants={fadeIn()} className="text-center mb-12">
          <h2 className="font-varien text-3xl font-normal tracking-wider-xl sm:text-4xl text-foreground mb-6">
            Key <span className="text-accent">Highlights</span>
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground font-varela">
            <Balancer>Understanding your rights and responsibilities on our decentralized platform.</Balancer>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {keyHighlights.map((highlight, index) => (
            <motion.div variants={fadeIn(index * 0.1)} key={highlight.title}>
              <InteractiveCard className="h-full">
                <div className="flex items-start gap-4 p-6">
                  <div className="p-3 rounded-full bg-accent/10 shrink-0">{highlight.icon}</div>
                  <div>
                    <h3 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">
                      {highlight.title}
                    </h3>
                    <p className="text-sm text-muted-foreground font-varela">
                      <Balancer>{highlight.description}</Balancer>
                    </p>
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>

      {/* Terms Content */}
      <SectionWrapper id="terms-content" padding="py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <CollapsibleSection title="1. Acceptance of Terms" icon={<CheckCircle className="h-5 w-5 text-accent" />}>
            <p className="mb-4">
              By accessing or using Proof Of Works (POW), you agree to be bound by these Terms of Service and all
              applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from
              using or accessing this platform.
            </p>
            <p className="mb-4">
              These terms apply to all users of the platform, including but not limited to employers, workers, jurors,
              and visitors. Your use of POW constitutes acceptance of these terms.
            </p>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon
              posting. Your continued use of the platform after changes are posted constitutes acceptance of the
              modified terms.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="2. Platform Description" icon={<FileText className="h-5 w-5 text-accent" />}>
            <p className="mb-4">
              Proof Of Works is a decentralized job platform built on the Kaspa blockchain that facilitates:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Job posting and application processes</li>
              <li>Smart contract-based payment systems</li>
              <li>Automated weekly or one-time payments</li>
              <li>Decentralized dispute resolution through DisputeDAO</li>
              <li>On-chain reputation tracking</li>
              <li>Peer-to-peer messaging between users</li>
            </ul>
            <p>
              All transactions and agreements are executed through smart contracts on the Kaspa EVM layer, ensuring
              transparency and immutability.
            </p>
          </CollapsibleSection>

          <CollapsibleSection
            title="3. User Roles and Responsibilities"
            icon={<Users className="h-5 w-5 text-accent" />}
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-3">Employers</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Must provide accurate job descriptions and requirements</li>
                  <li>Required to lock sufficient KAS funds before job activation</li>
                  <li>Responsible for timely review of applications</li>
                  <li>Must communicate professionally with workers</li>
                  <li>Cannot withdraw locked funds once a worker is assigned</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-3">Workers</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Must provide truthful information in applications</li>
                  <li>Required to complete assigned work as specified</li>
                  <li>Must maintain professional communication</li>
                  <li>Responsible for meeting agreed-upon deadlines</li>
                  <li>Can withdraw applications before acceptance</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-3">Jurors</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Must review disputes impartially and thoroughly</li>
                  <li>Required to vote based on evidence presented</li>
                  <li>Must maintain confidentiality of dispute details</li>
                  <li>Cannot have conflicts of interest in disputes</li>
                </ul>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="4. Smart Contract Terms" icon={<Lock className="h-5 w-5 text-accent" />}>
            <p className="mb-4">All job agreements are governed by smart contracts deployed on the Kaspa blockchain:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <strong>Fund Locking:</strong> Employers must lock the full payment amount plus platform fees before job
                activation
              </li>
              <li>
                <strong>Automatic Payments:</strong> Weekly payments are released automatically based on contract terms
              </li>
              <li>
                <strong>Immutable Terms:</strong> Job terms cannot be changed once the contract is deployed
              </li>
              <li>
                <strong>Dispute Freezing:</strong> Funds are frozen during active disputes until resolution
              </li>
              <li>
                <strong>Platform Fees:</strong> A 0.75% fee is charged on all job contracts
              </li>
            </ul>
            <p>
              Smart contracts are immutable and execute automatically. Users are responsible for understanding contract
              terms before engagement.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="5. Dispute Resolution" icon={<Gavel className="h-5 w-5 text-accent" />}>
            <p className="mb-4">Disputes are resolved through our decentralized DisputeDAO system:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Either party may open a dispute for legitimate grievances</li>
              <li>Pre-selected jurors review evidence and vote on outcomes</li>
              <li>Majority vote determines the final resolution</li>
              <li>Dispute outcomes are final and automatically executed</li>
              <li>Frivolous disputes may result in reputation penalties</li>
            </ul>
            <p className="mb-4">
              <strong>Dispute Process:</strong>
            </p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Dispute creation with initial statement</li>
              <li>Evidence submission period (7 days)</li>
              <li>Juror review and discussion</li>
              <li>Voting period (3 days)</li>
              <li>Automatic execution of majority decision</li>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection
            title="6. Platform Fees and Payments"
            icon={<DollarSign className="h-5 w-5 text-accent" />}
          >
            <p className="mb-4">POW charges the following fees for platform services:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <strong>Job Creation Fee:</strong> 0.75% of total job value, paid by employer
              </li>
              <li>
                <strong>No Worker Fees:</strong> Workers receive 100% of agreed payment
              </li>
              <li>
                <strong>Gas Fees:</strong> Users pay blockchain transaction fees separately
              </li>
              <li>
                <strong>Dispute Fees:</strong> No additional fees for legitimate disputes
              </li>
            </ul>
            <p>
              All payments are processed in KAS (Kaspa) cryptocurrency. Users are responsible for acquiring KAS through
              supported exchanges or swap services.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="7. Prohibited Activities" icon={<AlertTriangle className="h-5 w-5 text-accent" />}>
            <p className="mb-4">The following activities are strictly prohibited on POW:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Posting illegal, fraudulent, or misleading job listings</li>
              <li>Attempting to circumvent smart contract security measures</li>
              <li>Harassment, discrimination, or unprofessional conduct</li>
              <li>Creating fake accounts or manipulating reputation scores</li>
              <li>Spamming, phishing, or other malicious activities</li>
              <li>Violating intellectual property rights</li>
              <li>Money laundering or other financial crimes</li>
            </ul>
            <p>Violations may result in account suspension, reputation penalties, or legal action as appropriate.</p>
          </CollapsibleSection>

          <CollapsibleSection title="8. Intellectual Property" icon={<Eye className="h-5 w-5 text-accent" />}>
            <p className="mb-4">Intellectual property rights on POW are governed as follows:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>POW platform code and design are proprietary to POW developers</li>
              <li>Users retain rights to their original work and content</li>
              <li>Job deliverables belong to the hiring employer unless otherwise specified</li>
              <li>Users grant POW limited rights to display their content for platform operation</li>
              <li>Smart contract code is open source and auditable</li>
            </ul>
            <p>Users must respect intellectual property rights and may not use POW for copyright infringement.</p>
          </CollapsibleSection>

          <CollapsibleSection title="9. Disclaimers and Limitations" icon={<Shield className="h-5 w-5 text-accent" />}>
            <p className="mb-4">
              <strong>Platform Disclaimers:</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>POW is provided "as is" without warranties of any kind</li>
              <li>We do not guarantee platform availability or performance</li>
              <li>Blockchain transactions are irreversible once confirmed</li>
              <li>Users are responsible for their own wallet security</li>
              <li>We do not control or guarantee user behavior or work quality</li>
            </ul>
            <p className="mb-4">
              <strong>Limitation of Liability:</strong>
            </p>
            <p>
              POW's liability is limited to the maximum extent permitted by law. We are not liable for indirect,
              incidental, or consequential damages arising from platform use.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="10. Privacy and Data Protection" icon={<Lock className="h-5 w-5 text-accent" />}>
            <p className="mb-4">Your privacy is important to us. This section summarizes key privacy practices:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>We collect minimal personal information necessary for platform operation</li>
              <li>Blockchain transactions are public and immutable</li>
              <li>We do not sell or share personal data with third parties</li>
              <li>Users control their own wallet addresses and private keys</li>
              <li>Communication data is encrypted and stored securely</li>
            </ul>
            <p>For complete privacy details, please review our separate Privacy Policy.</p>
          </CollapsibleSection>

          <CollapsibleSection title="11. Termination" icon={<Clock className="h-5 w-5 text-accent" />}>
            <p className="mb-4">Account termination may occur under the following circumstances:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Voluntary account closure by user</li>
              <li>Violation of these Terms of Service</li>
              <li>Fraudulent or illegal activity</li>
              <li>Extended period of inactivity</li>
            </ul>
            <p className="mb-4">Upon termination:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Active job contracts continue until completion or dispute resolution</li>
              <li>Locked funds remain in smart contracts as per original terms</li>
              <li>Reputation scores remain on-chain permanently</li>
              <li>Access to new platform features is revoked</li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection
            title="12. Governing Law and Jurisdiction"
            icon={<Scale className="h-5 w-5 text-accent" />}
          >
            <p className="mb-4">These Terms of Service are governed by:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>The laws of the jurisdiction where POW is incorporated</li>
              <li>International blockchain and cryptocurrency regulations</li>
              <li>Smart contract code as deployed on the Kaspa blockchain</li>
            </ul>
            <p className="mb-4">Disputes arising from these terms will be resolved through:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Platform's internal DisputeDAO system (for platform-related disputes)</li>
              <li>Binding arbitration (for legal disputes)</li>
              <li>Appropriate courts of jurisdiction as a last resort</li>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection title="13. Contact Information" icon={<Users className="h-5 w-5 text-accent" />}>
            <p className="mb-4">For questions about these Terms of Service, please contact us:</p>
            <div className="bg-accent/5 p-4 rounded-lg border border-accent/20">
              <p className="mb-2">
                <strong>Email:</strong> legal@proofofworks.io
              </p>
              <p className="mb-2">
                <strong>Support:</strong> support@proofofworks.io
              </p>
              <p className="mb-2">
                <strong>Discord:</strong> discord.gg/proofofworks
              </p>
              <p>
                <strong>GitHub:</strong> github.com/proofofworks
              </p>
            </div>
            <p className="mt-4 text-sm">We aim to respond to all inquiries within 48 hours during business days.</p>
          </CollapsibleSection>
        </div>
      </SectionWrapper>

      {/* Call to Action */}
      <SectionWrapper id="cta" padding="py-12 md:py-16">
        <motion.div variants={fadeIn()} className="text-center">
          <InteractiveCard className="max-w-2xl mx-auto p-8">
            <h2 className="font-varien text-2xl font-normal tracking-wider text-foreground mb-4">
              Ready to Get <span className="text-accent">Started</span>?
            </h2>
            <p className="text-muted-foreground mb-6 font-varela">
              <Balancer>By using POW, you agree to these terms and join our decentralized work ecosystem.</Balancer>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="font-varien bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40 transition-all duration-300 transform hover:scale-105 group tracking-wider"
              >
                <Link href="/jobs">
                  Find Work
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
                  <Users className="ml-2 h-5 w-5 group-hover:text-accent transition-colors" />
                </Link>
              </Button>
            </div>
          </InteractiveCard>
        </motion.div>
      </SectionWrapper>

      {/* Document Information */}
      <SectionWrapper id="document-info" padding="py-8">
        <motion.div variants={fadeIn()} className="text-center">
          <InteractiveCard className="max-w-md mx-auto p-6">
            <div className="text-sm text-muted-foreground font-varela space-y-2">
              <p>
                <strong>Last Updated:</strong> 6/26/2025
              </p>
              <p>
                <strong>Effective Date:</strong> 6/26/2025
              </p>
            </div>
          </InteractiveCard>
        </motion.div>
      </SectionWrapper>
    </div>
  )
}
