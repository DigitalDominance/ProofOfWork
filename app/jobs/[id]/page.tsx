"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import {
  ArrowLeft,
  Star,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  CheckCircle,
  MessageSquare,
  Share2,
  Bookmark,
  Flag,
  ExternalLink,
  Shield,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { InteractiveCard } from "@/components/custom/interactive-card"

const fadeIn = (delay = 0, duration = 0.5) => ({
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay, duration, ease: "easeOut" } },
})

// Placeholder job data - in real app this would come from smart contract
const jobData = {
  1: {
    id: 1,
    title: "Senior Smart Contract Developer",
    employer: "BlockchainX Labs",
    employerAddress: "0x1234...5678",
    employerRating: 4.9,
    employerJobsCompleted: 23,
    employerTotalPaid: "156.7",
    payType: "WEEKLY",
    weeklyPay: "3.5",
    durationWeeks: 8,
    totalPay: "28",
    positions: 2,
    positionsFilled: 1,
    createdAt: "2024-01-10",
    deadline: "2024-02-15",
    description: `We're looking for an experienced Solidity developer to help build and audit our DeFi protocol. You'll be working on cutting-edge smart contracts that handle millions in TVL.

**Key Responsibilities:**
- Develop and deploy smart contracts using Solidity
- Conduct security audits and implement best practices
- Collaborate with our frontend team to integrate contracts
- Write comprehensive tests and documentation
- Participate in code reviews and architecture discussions

**Requirements:**
- 3+ years of Solidity development experience
- Deep understanding of EVM and gas optimization
- Experience with DeFi protocols (AMMs, lending, yield farming)
- Familiarity with testing frameworks (Hardhat, Foundry)
- Strong understanding of security best practices

**Nice to Have:**
- Experience with Layer 2 solutions
- Previous audit experience
- Contributions to open source DeFi projects
- Knowledge of formal verification tools`,
    skills: ["Solidity", "Smart Contracts", "DeFi", "Security", "Hardhat", "OpenZeppelin"],
    applicants: 12,
    contractAddress: "0xabcd...efgh",
    fundsLocked: "28",
    requirements: [
      "3+ years Solidity experience",
      "DeFi protocol knowledge",
      "Security audit experience",
      "Available for 8 weeks",
    ],
    benefits: [
      "Work with cutting-edge DeFi technology",
      "Competitive weekly payments in KAS",
      "Flexible remote work",
      "Opportunity for long-term collaboration",
    ],
    timeline: [
      { week: 1, milestone: "Smart contract architecture review" },
      { week: 2, milestone: "Core contract development" },
      { week: 4, milestone: "Security audit and testing" },
      { week: 6, milestone: "Frontend integration support" },
      { week: 8, milestone: "Final deployment and documentation" },
    ],
  },
}

// Placeholder applicant data
const applicantData = [
  {
    id: 1,
    name: "Alex Chen",
    address: "0x9876...5432",
    avatar: "AC",
    rating: 4.8,
    jobsCompleted: 15,
    totalEarned: "89.3",
    skills: ["Solidity", "DeFi", "Security", "Hardhat"],
    appliedDate: "2024-01-12",
    coverLetter:
      "I have 5 years of experience in Solidity development with a focus on DeFi protocols. I've audited over 20 smart contracts and found critical vulnerabilities that saved projects millions. I'm particularly excited about this opportunity because...",
    portfolio: [
      { name: "DEX Protocol Audit", type: "Security Audit", earnings: "8.5 KAS" },
      { name: "Lending Platform", type: "Smart Contract Dev", earnings: "12.3 KAS" },
      { name: "Yield Farming Contract", type: "Smart Contract Dev", earnings: "6.7 KAS" },
    ],
  },
  {
    id: 2,
    name: "Sarah Johnson",
    address: "0x1111...2222",
    avatar: "SJ",
    rating: 4.9,
    jobsCompleted: 22,
    totalEarned: "134.7",
    skills: ["Solidity", "Formal Verification", "DeFi", "Rust"],
    appliedDate: "2024-01-11",
    coverLetter:
      "As a senior blockchain developer with extensive experience in formal verification and smart contract security, I believe I'm the perfect fit for this role. My background includes...",
    portfolio: [
      { name: "Multi-sig Wallet", type: "Smart Contract Dev", earnings: "15.2 KAS" },
      { name: "Cross-chain Bridge", type: "Security Audit", earnings: "18.9 KAS" },
      { name: "DAO Governance", type: "Smart Contract Dev", earnings: "9.8 KAS" },
    ],
  },
]

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const [applicationText, setApplicationText] = useState("")
  const [showApplicants, setShowApplicants] = useState(false)

  // Get job data (in real app, this would fetch from smart contract)
  const job = jobData[jobId as keyof typeof jobData]

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Job Not Found</h1>
        <p className="text-muted-foreground mb-6">The job you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
      </div>
    )
  }

  const handleApply = () => {
    console.log("Applied to job:", job.id, "with text:", applicationText)
    setApplicationText("")
    // In real implementation, this would call smart contract
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={() => router.back()} className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">Job Details</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Job Header */}
            <motion.div variants={fadeIn(0.1)}>
              <InteractiveCard>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground">{job.title}</h1>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://effigy.im/a/${job.employerAddress}.svg`} />
                            <AvatarFallback>{job.employer.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{job.employer}</p>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-muted-foreground">
                                {job.employerRating} • {job.employerJobsCompleted} jobs completed
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Flag className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Key Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <DollarSign className="h-6 w-6 text-accent mx-auto mb-2" />
                      <p className="text-lg font-bold text-foreground">
                        {job.payType === "WEEKLY" ? `${job.weeklyPay} KAS` : `${job.totalPay} KAS`}
                      </p>
                      <p className="text-xs text-muted-foreground">{job.payType === "WEEKLY" ? "per week" : "total"}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Calendar className="h-6 w-6 text-accent mx-auto mb-2" />
                      <p className="text-lg font-bold text-foreground">
                        {job.payType === "WEEKLY" ? `${job.durationWeeks} weeks` : "One-time"}
                      </p>
                      <p className="text-xs text-muted-foreground">duration</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Users className="h-6 w-6 text-accent mx-auto mb-2" />
                      <p className="text-lg font-bold text-foreground">
                        {job.positionsFilled}/{job.positions}
                      </p>
                      <p className="text-xs text-muted-foreground">positions filled</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <TrendingUp className="h-6 w-6 text-accent mx-auto mb-2" />
                      <p className="text-lg font-bold text-foreground">{job.applicants}</p>
                      <p className="text-xs text-muted-foreground">applicants</p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={
                        job.payType === "WEEKLY" ? "border-blue-500 text-blue-500" : "border-purple-500 text-purple-500"
                      }
                    >
                      {job.payType === "WEEKLY" ? "Weekly Payments" : "One-off Payment"}
                    </Badge>
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Funds Locked ({job.fundsLocked} KAS)
                    </Badge>
                    {job.positionsFilled < job.positions && (
                      <Badge variant="outline" className="border-accent text-accent">
                        Open Positions Available
                      </Badge>
                    )}
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>

            {/* Job Description */}
            <motion.div variants={fadeIn(0.2)}>
              <InteractiveCard>
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Job Description</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    <div className="whitespace-pre-line">{job.description}</div>
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>

            {/* Skills Required */}
            <motion.div variants={fadeIn(0.3)}>
              <InteractiveCard>
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Skills Required</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>

            {/* Timeline (for weekly jobs) */}
            {job.payType === "WEEKLY" && (
              <motion.div variants={fadeIn(0.4)}>
                <InteractiveCard>
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-foreground">Project Timeline</h2>
                    <div className="space-y-4">
                      {job.timeline.map((item, index) => (
                        <div key={index} className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-accent">{item.week}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Week {item.week}</p>
                            <p className="text-sm text-muted-foreground">{item.milestone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </InteractiveCard>
              </motion.div>
            )}

            {/* Applicants Section (for employers or public view) */}
            <motion.div variants={fadeIn(0.5)}>
              <InteractiveCard>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">Applicants ({job.applicants})</h2>
                    <Button
                      variant="outline"
                      onClick={() => setShowApplicants(!showApplicants)}
                      className="border-accent/50 text-accent hover:bg-accent/10"
                    >
                      {showApplicants ? "Hide" : "View"} Applicants
                    </Button>
                  </div>

                  {showApplicants && (
                    <div className="space-y-4">
                      {applicantData.map((applicant) => (
                        <div key={applicant.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://effigy.im/a/${applicant.address}.svg`} />
                                <AvatarFallback className="bg-accent/10 text-accent">{applicant.avatar}</AvatarFallback>
                              </Avatar>
                              <div className="space-y-2">
                                <div>
                                  <h3 className="font-medium text-foreground">{applicant.name}</h3>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                      <span>{applicant.rating}</span>
                                    </div>
                                    <span>{applicant.jobsCompleted} jobs completed</span>
                                    <span>{applicant.totalEarned} KAS earned</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {applicant.skills.map((skill) => (
                                    <Badge key={skill} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{applicant.coverLetter}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button size="sm" className="bg-accent hover:bg-accent-hover text-accent-foreground">
                                View Profile
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </InteractiveCard>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Section */}
            <motion.div variants={fadeIn(0.2)}>
              <InteractiveCard>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Apply for this Job</h3>

                  {job.positionsFilled < job.positions ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-accent hover:bg-accent-hover text-accent-foreground">
                          Apply Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                          <DialogTitle>Apply for {job.title}</DialogTitle>
                          <DialogDescription>
                            Submit your application for this position at {job.employer}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="cover-letter">Why are you a good fit for this role?</Label>
                            <Textarea
                              id="cover-letter"
                              placeholder="Describe your relevant experience and why you're interested in this position..."
                              className="min-h-[150px]"
                              value={applicationText}
                              onChange={(e) => setApplicationText(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setApplicationText("")}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="bg-accent hover:bg-accent-hover text-accent-foreground"
                            onClick={handleApply}
                          >
                            Submit Application
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button disabled className="w-full">
                      All Positions Filled
                    </Button>
                  )}

                  <div className="text-xs text-muted-foreground text-center">Applications are processed on-chain</div>
                </div>
              </InteractiveCard>
            </motion.div>

            {/* Job Requirements */}
            <motion.div variants={fadeIn(0.3)}>
              <InteractiveCard>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Requirements</h3>
                  <ul className="space-y-2">
                    {job.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </InteractiveCard>
            </motion.div>

            {/* Benefits */}
            <motion.div variants={fadeIn(0.4)}>
              <InteractiveCard>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">What You'll Get</h3>
                  <ul className="space-y-2">
                    {job.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Star className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </InteractiveCard>
            </motion.div>

            {/* Smart Contract Info */}
            <motion.div variants={fadeIn(0.5)}>
              <InteractiveCard>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Contract Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract Address:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{job.contractAddress}</code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Funds Locked:</span>
                      <span className="font-medium text-foreground">{job.fundsLocked} KAS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium text-foreground">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className="font-medium text-foreground">{new Date(job.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3 text-accent" />
                    <span>Secured by smart contract</span>
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>

            {/* Employer Profile */}
            <motion.div variants={fadeIn(0.6)}>
              <InteractiveCard>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">About the Employer</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://effigy.im/a/${job.employerAddress}.svg`} />
                      <AvatarFallback>{job.employer.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{job.employer}</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-sm text-muted-foreground">{job.employerRating} rating</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{job.employerJobsCompleted}</p>
                      <p className="text-muted-foreground">Jobs completed</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{job.employerTotalPaid} KAS</p>
                      <p className="text-muted-foreground">Total paid out</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent/10">
                    View Full Profile
                  </Button>
                </div>
              </InteractiveCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
