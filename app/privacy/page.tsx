"use client"
import { Button } from "@/components/ui/button"
import type React from "react"
import { useState } from "react"

import {
  ArrowRight,
  Shield,
  Eye,
  Lock,
  Database,
  Users,
  Globe,
  AlertTriangle,
  Settings,
  Mail,
  ChevronDown,
  ChevronUp,
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

export default function PrivacyPolicyPage() {
  const privacyPrinciples = [
    {
      icon: <Lock className="h-6 w-6 text-accent" />,
      title: "Data Minimization",
      description: "We collect only the essential information needed for platform functionality.",
    },
    {
      icon: <Shield className="h-6 w-6 text-accent" />,
      title: "Blockchain Transparency",
      description: "On-chain data is public by design, ensuring complete transparency of transactions.",
    },
    {
      icon: <Eye className="h-6 w-6 text-accent" />,
      title: "User Control",
      description: "You maintain control over your wallet, private keys, and personal information.",
    },
    {
      icon: <Database className="h-6 w-6 text-accent" />,
      title: "Secure Storage",
      description: "All off-chain data is encrypted and stored using industry-standard security practices.",
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
            Privacy <span className="text-accent">Policy</span>
          </motion.h1>
          <motion.p
            variants={fadeIn(0.2)}
            className="mt-12 max-w-3xl mx-auto text-muted-foreground md:text-lg lg:text-xl font-varela"
          >
            <Balancer>
              Your privacy matters to us. Learn how we collect, use, and protect your information while maintaining the
              transparency benefits of blockchain technology.
            </Balancer>
          </motion.p>
        </div>
      </motion.section>

      {/* Privacy Principles */}
      <SectionWrapper id="principles" padding="py-8 md:py-12">
        <motion.div variants={fadeIn()} className="text-center mb-12">
          <h2 className="font-varien text-3xl font-normal tracking-wider-xl sm:text-4xl text-foreground mb-6">
            Our Privacy <span className="text-accent">Principles</span>
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground font-varela">
            <Balancer>
              We believe in transparent data practices that respect your privacy while leveraging blockchain benefits.
            </Balancer>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {privacyPrinciples.map((principle, index) => (
            <motion.div variants={fadeIn(index * 0.1)} key={principle.title}>
              <InteractiveCard className="h-full">
                <div className="flex items-start gap-4 p-6">
                  <div className="p-3 rounded-full bg-accent/10 shrink-0">{principle.icon}</div>
                  <div>
                    <h3 className="font-varien text-lg font-normal tracking-wider text-foreground mb-2">
                      {principle.title}
                    </h3>
                    <p className="text-sm text-muted-foreground font-varela">
                      <Balancer>{principle.description}</Balancer>
                    </p>
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>

      {/* Privacy Policy Content */}
      <SectionWrapper id="policy-content" padding="py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <CollapsibleSection title="1. Information We Collect" icon={<Database className="h-5 w-5 text-accent" />}>
            <div className="space-y-6">
              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-3">
                  On-Chain Information (Public)
                </h4>
                <p className="mb-3">
                  The following information is stored on the Kaspa blockchain and is publicly accessible:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Wallet addresses and transaction history</li>
                  <li>Job contract details (titles, descriptions, payment amounts)</li>
                  <li>Application submissions and acceptances</li>
                  <li>Dispute records and resolutions</li>
                  <li>Reputation scores and work history</li>
                  <li>Smart contract interactions and timestamps</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-3">
                  Off-Chain Information (Private)
                </h4>
                <p className="mb-3">We collect minimal off-chain information for platform functionality:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Display names and profile information (optional)</li>
                  <li>Email addresses for notifications (optional)</li>
                  <li>Private messages between users</li>
                  <li>Platform usage analytics (anonymized)</li>
                  <li>Technical logs for debugging and security</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-3">
                  Automatically Collected Information
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>IP addresses and browser information</li>
                  <li>Device identifiers and operating system</li>
                  <li>Platform usage patterns and preferences</li>
                  <li>Error logs and performance metrics</li>
                </ul>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="2. How We Use Your Information"
            icon={<Settings className="h-5 w-5 text-accent" />}
          >
            <p className="mb-4">We use collected information for the following purposes:</p>
            <div className="space-y-4">
              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Platform Operation
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Facilitating job postings and applications</li>
                  <li>Processing smart contract transactions</li>
                  <li>Enabling communication between users</li>
                  <li>Maintaining reputation systems</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Security and Fraud Prevention
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Detecting and preventing fraudulent activities</li>
                  <li>Monitoring for platform abuse</li>
                  <li>Securing user accounts and data</li>
                  <li>Investigating disputes and violations</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Platform Improvement
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Analyzing usage patterns to improve features</li>
                  <li>Optimizing platform performance</li>
                  <li>Developing new functionality</li>
                  <li>Conducting research and analytics</li>
                </ul>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="3. Information Sharing and Disclosure"
            icon={<Globe className="h-5 w-5 text-accent" />}
          >
            <p className="mb-4">We share information in the following limited circumstances:</p>
            <div className="space-y-4">
              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Public Blockchain Data
                </h4>
                <p className="mb-2">
                  All on-chain information is publicly accessible by design of blockchain technology. This includes:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Transaction records and smart contract interactions</li>
                  <li>Job details and application outcomes</li>
                  <li>Reputation scores and work history</li>
                  <li>Dispute records and resolutions</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Service Providers
                </h4>
                <p className="mb-2">
                  We may share limited information with trusted service providers who assist in platform operation:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Cloud hosting and infrastructure providers</li>
                  <li>Analytics and monitoring services</li>
                  <li>Communication and notification services</li>
                  <li>Security and fraud prevention tools</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Legal Requirements
                </h4>
                <p className="mb-2">We may disclose information when required by law or to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Comply with legal processes and government requests</li>
                  <li>Enforce our Terms of Service</li>
                  <li>Protect the rights and safety of users</li>
                  <li>Investigate fraud or security issues</li>
                </ul>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="4. Data Security" icon={<Shield className="h-5 w-5 text-accent" />}>
            <p className="mb-4">We implement comprehensive security measures to protect your information:</p>
            <div className="space-y-4">
              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Technical Safeguards
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>End-to-end encryption for private communications</li>
                  <li>Secure HTTPS connections for all platform interactions</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Multi-factor authentication options</li>
                  <li>Automated threat detection and response</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Operational Security
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Limited access to personal data on need-to-know basis</li>
                  <li>Regular employee security training</li>
                  <li>Incident response procedures</li>
                  <li>Data backup and recovery systems</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Blockchain Security
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Smart contracts audited by security professionals</li>
                  <li>Immutable transaction records</li>
                  <li>Decentralized data storage</li>
                  <li>Cryptographic proof of all transactions</li>
                </ul>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="5. Your Privacy Rights" icon={<Users className="h-5 w-5 text-accent" />}>
            <p className="mb-4">You have the following rights regarding your personal information:</p>
            <div className="space-y-4">
              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Access and Portability
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Request copies of your personal data</li>
                  <li>Export your data in machine-readable formats</li>
                  <li>View all on-chain data through blockchain explorers</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Correction and Updates
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Update your profile information and preferences</li>
                  <li>Correct inaccurate personal data</li>
                  <li>Modify communication preferences</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Deletion and Restriction
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Request deletion of off-chain personal data</li>
                  <li>Restrict processing of your information</li>
                  <li>Opt out of non-essential communications</li>
                </ul>
                <p className="mt-2 text-sm bg-accent/10 p-3 rounded border border-accent/20">
                  <strong>Note:</strong> On-chain data cannot be deleted due to the immutable nature of blockchain
                  technology.
                </p>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Exercising Your Rights
                </h4>
                <p className="mb-2">To exercise these rights, contact us at privacy@proofofworks.io with:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Your wallet address for verification</li>
                  <li>Specific request details</li>
                  <li>Preferred response method</li>
                </ul>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="6. Cookies and Tracking" icon={<Eye className="h-5 w-5 text-accent" />}>
            <p className="mb-4">We use cookies and similar technologies to enhance your platform experience:</p>
            <div className="space-y-4">
              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Essential Cookies
                </h4>
                <p className="mb-2">Required for basic platform functionality:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Authentication and session management</li>
                  <li>Security and fraud prevention</li>
                  <li>Platform preferences and settings</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Analytics Cookies
                </h4>
                <p className="mb-2">Help us understand platform usage (can be disabled):</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Page views and user interactions</li>
                  <li>Performance metrics and error tracking</li>
                  <li>Feature usage and adoption rates</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Managing Cookies
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Configure preferences in your browser settings</li>
                  <li>Use our cookie preference center</li>
                  <li>Opt out of non-essential tracking</li>
                </ul>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="7. International Data Transfers" icon={<Globe className="h-5 w-5 text-accent" />}>
            <p className="mb-4">POW operates globally, and your information may be transferred internationally:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Blockchain data is distributed across global nodes</li>
              <li>Off-chain data may be stored in secure data centers worldwide</li>
              <li>We ensure adequate protection through contractual safeguards</li>
              <li>Transfers comply with applicable data protection laws</li>
            </ul>
            <p className="bg-accent/10 p-4 rounded border border-accent/20">
              <strong>EU Users:</strong> We provide appropriate safeguards for data transfers outside the EU, including
              Standard Contractual Clauses and adequacy decisions where applicable.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="8. Data Retention" icon={<Database className="h-5 w-5 text-accent" />}>
            <p className="mb-4">
              We retain information for different periods based on data type and legal requirements:
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">On-Chain Data</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Permanently stored on the blockchain</li>
                  <li>Cannot be deleted or modified</li>
                  <li>Publicly accessible indefinitely</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">
                  Off-Chain Data
                </h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Profile information: Until account deletion</li>
                  <li>Private messages: 2 years after last activity</li>
                  <li>Analytics data: 2 years (anonymized after 6 months)</li>
                  <li>Security logs: 1 year</li>
                </ul>
              </div>

              <div>
                <h4 className="font-varien text-base font-normal tracking-wider text-foreground mb-2">Legal Hold</h4>
                <p>
                  We may retain data longer when required for legal proceedings, regulatory compliance, or legitimate
                  business purposes.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="9. Children's Privacy" icon={<AlertTriangle className="h-5 w-5 text-accent" />}>
            <p className="mb-4">POW is not intended for use by individuals under 18 years of age:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>We do not knowingly collect information from minors</li>
              <li>Users must be 18+ to create accounts or use platform services</li>
              <li>Parents should monitor their children's internet usage</li>
              <li>We will delete any information from minors upon discovery</li>
            </ul>
            <p className="bg-accent/10 p-4 rounded border border-accent/20">
              If you believe a minor has provided information to us, please contact us immediately at
              privacy@proofofworks.io so we can take appropriate action.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="10. Privacy Policy Updates" icon={<Settings className="h-5 w-5 text-accent" />}>
            <p className="mb-4">We may update this Privacy Policy periodically to reflect:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Changes in our data practices</li>
              <li>New platform features or services</li>
              <li>Legal or regulatory requirements</li>
              <li>Industry best practices</li>
            </ul>
            <p className="mb-4">
              <strong>Notification of Changes:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Updated policy posted on our platform</li>
              <li>Email notification for material changes (if provided)</li>
              <li>Platform notification upon next login</li>
              <li>30-day notice period for significant changes</li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="11. Contact Information" icon={<Mail className="h-5 w-5 text-accent" />}>
            <p className="mb-4">For privacy-related questions, concerns, or requests, please contact us:</p>
            <div className="bg-accent/5 p-4 rounded-lg border border-accent/20 mb-4">
              <p className="mb-2">
                <strong>Privacy Officer:</strong> privacy@proofofworks.io
              </p>
              <p className="mb-2">
                <strong>General Support:</strong> support@proofofworks.io
              </p>
              <p className="mb-2">
                <strong>Data Protection Officer:</strong> dpo@proofofworks.io
              </p>
              <p>
                <strong>Mailing Address:</strong> [Company Address]
              </p>
            </div>
            <p className="mb-4">
              <strong>Response Times:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>General inquiries: 48 hours</li>
              <li>Data access requests: 30 days</li>
              <li>Urgent privacy concerns: 24 hours</li>
              <li>Legal requests: As required by law</li>
            </ul>
          </CollapsibleSection>
        </div>
      </SectionWrapper>

      {/* Call to Action */}
      <SectionWrapper id="cta" padding="py-12 md:py-16">
        <motion.div variants={fadeIn()} className="text-center">
          <InteractiveCard className="max-w-2xl mx-auto p-8">
            <h2 className="font-varien text-2xl font-normal tracking-wider text-foreground mb-4">
              Questions About Your <span className="text-accent">Privacy</span>?
            </h2>
            <p className="text-muted-foreground mb-6 font-varela">
              <Balancer>
                We're committed to transparency and protecting your privacy. Contact us with any questions or concerns.
              </Balancer>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="font-varien bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40 transition-all duration-300 transform hover:scale-105 group tracking-wider"
              >
                <Link href="mailto:privacy@proofofworks.io">
                  Contact Privacy Team
                  <Mail className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="font-varien shadow-lg hover:shadow-md transition-all duration-300 transform hover:scale-105 group border-accent/50 hover:bg-accent/10 hover:text-accent tracking-wider bg-transparent"
              >
                <Link href="/terms">
                  View Terms of Service
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
