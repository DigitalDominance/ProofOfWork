"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type React from "react"
import { useState } from "react"
import { ArrowRight, CheckCircle, Users, FileText, Eye, MessageSquare, Calendar, Star, Plus, Trash2, Loader2, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { motion } from "framer-motion"
import { InteractiveCard } from "@/components/custom/interactive-card"
import { Balancer } from "react-wrap-balancer"
import { toast } from "sonner"
import { ethers } from "ethers"
import { fetchJobDetails, fetchJobsByEmployerFromEvents, useUserContext } from "@/context/UserContext"
import PROOF_OF_WORK_JOB_ABI from "@/lib/contracts/ProofOfWorkJob.json"
import { instructionSteps } from "@/constants/constants"

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

const SectionWrapper = ({
  children,
  className,
  id,
  padding = "py-16 md:py-20 lg:py-24",
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

export default function PostJobPage() {
  const { wallet, role, contracts, provider, jobDetails, applicants, setApplicants, setEmployerJobs, setJobDetails } =
    useUserContext()

  const [paymentType, setPaymentType] = useState<"weekly" | "oneoff">("weekly")
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "confirming" | "success">("idle")
  const [formData, setFormData] = useState<{
    jobTitle: string
    description: string
    payAmount: string
    duration: string
    positions: string
    tags: string[]
  }>({
    jobTitle: "",
    description: "",
    payAmount: "",
    duration: "",
    positions: "1",
    tags: [],
  })

  const [applicantStates, setApplicantStates] = useState<
    Record<
      string,
      {
        acceptState: "idle" | "processing" | "confirming" | "success"
        declineState: "idle" | "processing" | "confirming" | "success"
      }
    >
  >({})

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
  }

  const resetForm = () => {
    setFormData({
      jobTitle: "",
      description: "",
      payAmount: "",
      duration: "",
      positions: "1",
      tags: [],
    })
    setPaymentType("weekly")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (role !== "employer") {
      toast.error("Only employers can create job listings.", { duration: 3000 })
      return
    }

    if (!contracts?.jobFactory) {
      toast.error("Please connect your wallet first", { duration: 3000 })
      return
    }

    try {
      setSubmitState("submitting")

      const weeklyPayWei = paymentType === "weekly" ? ethers.parseEther(formData.payAmount) : BigInt(0)
      const durationWeeks = BigInt(formData.duration || "0")
      const totalPayWei =
        paymentType === "oneoff"
          ? ethers.parseEther(formData.payAmount)
          : ethers.parseEther(formData.payAmount) * durationWeeks

      const fee = (totalPayWei * BigInt(75)) / BigInt(10000)
      const value = paymentType === "weekly" ? weeklyPayWei * durationWeeks + fee : totalPayWei + fee

      const tx = await contracts.jobFactory.createJob(
        wallet,
        paymentType === "weekly" ? 0 : 1,
        weeklyPayWei,
        durationWeeks,
        totalPayWei,
        formData.jobTitle,
        formData.description,
        formData.positions,
        formData.tags,
        { value },
      )

      setSubmitState("confirming")
      await tx.wait()

      setSubmitState("success")
      toast.success("Job created successfully!")

      // Fetch the updated employer jobs
      const updatedEmployerJobs = await fetchJobsByEmployerFromEvents(contracts.jobFactory, wallet)
      setEmployerJobs(updatedEmployerJobs)

      // Fetch the updated job details
      if (provider) {
        const updatedJobDetails = await fetchJobDetails(updatedEmployerJobs, provider)
        setJobDetails(updatedJobDetails)
      } else {
        console.error("Provider is null. Cannot fetch job details.")
      }

      // Reset form after successful submission
      setTimeout(() => {
        resetForm()
        setSubmitState("idle")
      }, 2000)
    } catch (err: any) {
      console.error("Error creating job:", err)
      setSubmitState("idle")
      toast.error(`Failed to create job: ${err.message || "Unknown error"}`, {
        duration: 5000,
      })
    }
  }

  const updateApplicantStatus = (id: string) => {
    setApplicants((prev) => prev.map((app) => (app.id === id ? { ...app, status: "reviewed" } : app)))
  }

  const getButtonContent = () => {
    switch (submitState) {
      case "submitting":
        return (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Creating Job...
          </>
        )
      case "confirming":
        return (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Confirming Transaction...
          </>
        )
      case "success":
        return (
          <>
            <Check className="mr-2 h-5 w-5" />
            Job Created Successfully!
          </>
        )
      default:
        return (
          <>
            <Plus className="mr-2 h-5 w-5" />
            Create Job Listing
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </>
        )
    }
  }

  const isSubmitting = submitState !== "idle"

  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("")
  const applicationsPerPage = 3

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <motion.section
        className="w-full min-h-[40vh] flex flex-col justify-center items-center text-center relative overflow-hidden py-10"
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.1, 0.1)}
      >
        <div className="container px-4 md:px-6 relative z-10">
          <motion.h1
            variants={fadeIn(0.1)}
            className="font-varien text-[4rem] font-bold tracking-wider sm:text-[3rem] md:text-[3rem] lg:text-[5rem] text-foreground mb-6"
          >
            Post a <span className="text-accent">Job</span>
          </motion.h1>
          <motion.p
            variants={fadeIn(0.2)}
            className="mt-10 max-w-2xl mx-auto text-muted-foreground md:text-lg lg:text-xl"
          >
            <Balancer>
              Hire top talent with guaranteed payments and transparent terms. All job contracts are secured on-chain for
              maximum trust and accountability.
            </Balancer>
          </motion.p>
        </div>
      </motion.section>

      {/* How It Works */}
      <SectionWrapper id="how-it-works" padding="pt-0 md:pt-2 pb-12 md:pb-16">
        <motion.div variants={fadeIn()} className="text-center mb-12">
          <h2 className="font-varien text-3xl font-bold tracking-tighter sm:text-4xl text-foreground">
            How <span className="text-accent">It Works</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            <Balancer>Simple steps to post your job and start hiring with blockchain-powered security.</Balancer>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {instructionSteps.map((step, i) => (
            <motion.div variants={fadeIn(i * 0.1)} key={step.title}>
              <InteractiveCard className="h-full text-center">
                <div className="flex flex-col items-center">
                  <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">{step.icon}</div>
                  <h3 className="font-varien text-lg font-semibold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    <Balancer>{step.description}</Balancer>
                  </p>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>

      {/* Create Listing */}
      <SectionWrapper id="create-listing" padding="py-12 md:py-16">
        <motion.div variants={fadeIn()} className="text-center mb-12">
          <h2 className="font-varien text-3xl font-bold tracking-wider sm:text-4xl text-foreground">
            Create Your <span className="text-accent">Listing</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            <Balancer>
              Fill out the details below to create your job posting and lock funds in the smart contract.
            </Balancer>
          </p>
        </motion.div>

        <motion.div variants={fadeIn(0.2)} className="max-w-2xl mx-auto">
          <InteractiveCard>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="payment-type" className="text-foreground font-varien">
                  Payment Type
                </Label>
                <Select
                  value={paymentType}
                  onValueChange={(v: "weekly" | "oneoff") => setPaymentType(v)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="border-border focus:border-accent">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly Payments</SelectItem>
                    <SelectItem value="oneoff">One-off Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pay Amount */}
              <div className="space-y-2">
                <Label htmlFor="pay-amount" className="text-foreground font-varien">
                  {paymentType === "weekly" ? "Weekly Pay (KAS)" : "Total Pay (KAS)"}
                </Label>
                <div className="relative">
                  <img
                    src="/kaslogo.webp"
                    alt="KAS"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 filter-none"
                    style={{ filter: "none", imageRendering: "crisp-edges" }}
                  />
                  <Input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.payAmount}
                    onChange={(e) => handleInputChange("payAmount", e.target.value)}
                    className="pl-10 border-border focus:border-accent"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Duration */}
              {paymentType === "weekly" && (
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-foreground font-varien">
                    Duration (Weeks)
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      placeholder="8"
                      value={formData.duration}
                      onChange={(e) => handleInputChange("duration", e.target.value)}
                      className="pl-10 border-border focus:border-accent"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="job-title" className="text-foreground font-varien">
                  Job Title
                </Label>
                <Input
                  id="job-title"
                  type="text"
                  placeholder="e.g., Senior React Developer"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  className="border-border focus:border-accent"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground font-varien">
                  Job Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role, requirements, and expectations..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="min-h-[120px] border-border focus:border-accent resize-none"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-foreground font-varien">
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-2 text-xs cursor-pointer font-semibold"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-red-500 hover:text-red-600"
                        disabled={isSubmitting}
                      >
                        ✕
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="tags"
                  type="text"
                  placeholder="Type a tag and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTag(e.currentTarget.value.trim())
                      e.currentTarget.value = ""
                    }
                  }}
                  className="border-border focus:border-accent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Positions */}
              <div className="space-y-2">
                <Label htmlFor="positions" className="text-foreground font-varien">
                  Number of Positions
                </Label>
                <Input
                  id="positions"
                  type="number"
                  min="1"
                  value={formData.positions}
                  onChange={(e) => handleInputChange("positions", e.target.value)}
                  className="border-border focus:border-accent"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className={`w-full transition-all duration-300 transform hover:scale-105 group ${
                  submitState === "success"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40"
                }`}
              >
                {getButtonContent()}
              </Button>

              {submitState === "success" && (
                <div className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
                  Your job has been created and is now live on the blockchain!
                </div>
              )}
            </form>
          </InteractiveCard>
        </motion.div>
      </SectionWrapper>

      {/* Current Listings Section */}
      <SectionWrapper id="current-listings" padding="py-12 md:py-16">
        <motion.div variants={fadeIn()} className="text-center mb-12">
          <h2 className="font-varien text-3xl font-bold tracking-wider sm:text-4xl text-foreground">
            Your Current <span className="text-accent">Listings</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            <Balancer>Manage your active job postings and track applicant interest.</Balancer>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobDetails.length > 0 ? (
            jobDetails.map((listing, i) => (
              <motion.div variants={fadeIn(i * 0.1)} key={listing.address}>
                <InteractiveCard className="h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">{listing.title}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={async () => {
                        try {
                          if (!provider) {
                            toast.error("Provider is not available. Please connect your wallet.");
                            return;
                          }
                    
                          const signer = await provider.getSigner();
                          const contract = new ethers.Contract(listing.address, PROOF_OF_WORK_JOB_ABI, signer);
                    
                          const canCancel = await contract.canCancelJob();
                          if (!canCancel) {
                            toast.error("Job cannot be canceled. Ensure no workers are assigned or payments made.");
                            return;
                          }
                    
                          const tx = await contract.cancelJob();
                          toast.info("Cancelling job...");
                          await tx.wait();
                    
                          toast.success("Job canceled successfully!");
                          
                          // Update the UI by removing the job from the list
                          setEmployerJobs((prevJobs) => prevJobs.filter((job) => job !== listing.address));
                        } catch (err) {
                          console.error("Error canceling job:", err);
                          toast.error("Failed to cancel job.");
                        }
                      }}                      
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment:</span>
                      <div className="flex items-center gap-1">
                        <img
                          src="/kaslogo.webp"
                          alt="KAS"
                          className="h-3 w-3 filter-none"
                          style={{ filter: "none", imageRendering: "crisp-edges" }}
                        />
                        <span className="font-medium text-foreground">{listing.totalPay} KAS</span>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium text-foreground capitalize">{listing.payType}</span>
                    </div>

                    {listing.payType === "weekly" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium text-foreground">{listing.duration}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Positions:</span>
                      <span className="font-medium text-foreground">{listing.positions}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Applicants:</span>
                      <span className="font-medium text-accent">{listing.applicants}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Posted:</span>
                      <span className="font-medium text-foreground">
                        {new Date(listing.postedDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </InteractiveCard>
              </motion.div>
            ))
          ) : (
            <motion.div variants={fadeIn()} key="no-listings" className="col-span-full flex justify-center">
              <InteractiveCard className="max-w-md w-full flex flex-col items-center justify-center text-center py-10">
                <FileText className="h-12 w-12 text-accent mb-4 mx-auto" />
                <h3 className="font-varien text-lg font-semibold text-foreground mb-2">No Listings Found</h3>
                <p className="text-sm text-muted-foreground">Create a listing above to get started.</p>
              </InteractiveCard>
            </motion.div>
          )}
        </div>
      </SectionWrapper>

      {/* Applicants Section */}
      <SectionWrapper id="applicants" padding="py-12 md:py-16 pb-24">
        <motion.div variants={fadeIn()} className="text-center mb-12">
          <h2 className="font-varien tracking-wider text-3xl font-bold sm:text-4xl text-foreground">
            Review <span className="text-accent">Applicants</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            <Balancer>Evaluate candidates based on their on-chain reputation and experience.</Balancer>
          </p>
        </motion.div>

        <div className="space-y-6">
          {applicants.length > 0 ? (
            <>
              {/* Sort applicants by applied date (newest first) and paginate */}
              {(() => {
                const sortedApplicants = [...applicants].sort(
                  (a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime(),
                )
                const totalPages = Math.ceil(sortedApplicants.length / applicationsPerPage)
                const startIndex = (currentPage - 1) * applicationsPerPage
                const endIndex = startIndex + applicationsPerPage
                const currentApplicants = sortedApplicants.slice(startIndex, endIndex)

                return (
                  <>
                    {/* Applications List */}
                    <div className="space-y-6">
                      {currentApplicants.map((applicant, i) => (
                        <motion.div
                          variants={fadeIn(i * 0.1)}
                          key={applicant.id}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: i * 0.1 }}
                        >
                          <InteractiveCard>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage
                                    src={`https://effigy.im/a/${applicant.address}.svg`}
                                    alt={applicant.address}
                                  />
                                  <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                                    {applicant.address.charAt(2)}
                                  </AvatarFallback>
                                </Avatar>

                                <div>
                                  <h3 className="text-lg font-semibold text-foreground">{applicant.name}</h3>
                                  <p className="text-sm text-muted-foreground">Applied for: {applicant.jobTitle}</p>
                                  <div>
                                    {applicant.application.length > 100 ? (
                                      <>
                                        <p className="text-sm text-muted-foreground">
                                          {applicant.showFullApplication
                                            ? applicant.application
                                            : `${applicant.application.slice(0, 100)}...`}
                                        </p>
                                        <a
                                          href="#"
                                          className="text-accent hover:text-accent-hover hover:underline text-sm transition-colors"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            setApplicants((prev) =>
                                              prev.map((a) =>
                                                a.id === applicant.id
                                                  ? {
                                                      ...a,
                                                      showFullApplication: !a.showFullApplication,
                                                    }
                                                  : a,
                                              ),
                                            )
                                          }}
                                        >
                                          {applicant.showFullApplication ? "View Less" : "View More"}
                                        </a>
                                      </>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">{applicant.application}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-sm text-muted-foreground">
                                      {applicant.experience} experience
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                      <span className="text-sm font-medium text-foreground">{applicant.rating}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col md:items-end gap-3">
                                <div className="flex flex-wrap gap-2">
                                  {applicant.tags.map((tag: any) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={applicant.status === "reviewed" ? "default" : "secondary"}
                                    className={
                                      applicant.status === "reviewed" ? "bg-accent text-accent-foreground" : ""
                                    }
                                  >
                                    {applicant.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(applicant.appliedDate).toLocaleDateString()}
                                  </span>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-accent/50 text-accent hover:bg-accent/10"
                                  >
                                    <MessageSquare className="mr-1 h-4 w-4" />
                                    Message
                                  </Button>
                                  {applicant.status !== "reviewed" && (
                                    <>
                                      <Button
                                        size="sm"
                                        disabled={
                                          applicantStates[applicant.id]?.acceptState !== "idle" &&
                                          applicantStates[applicant.id]?.acceptState !== undefined
                                        }
                                        className={`${
                                          applicantStates[applicant.id]?.acceptState === "success"
                                            ? "bg-green-500 hover:bg-green-600 text-white"
                                            : "bg-accent hover:bg-accent-hover text-accent-foreground"
                                        }`}
                                        onClick={async () => {
                                          try {
                                            if (applicant.status === "reviewed") {
                                              toast.info("This application has already been reviewed.")
                                              return
                                            }
                                            if (!provider) {
                                              toast.error("Provider is not available. Please connect your wallet.")
                                              return
                                            }
                                            // Set processing state
                                            setApplicantStates((prev) => ({
                                              ...prev,
                                              [applicant.id]: {
                                                ...prev[applicant.id],
                                                acceptState: "processing",
                                              },
                                            }))
                                            const signer = await provider.getSigner()
                                            const c = new ethers.Contract(
                                              applicant.jobAddress,
                                              PROOF_OF_WORK_JOB_ABI,
                                              signer,
                                            )
                                            const tx = await c.acceptApplication(applicant.address)
                                            // Set confirming state
                                            setApplicantStates((prev) => ({
                                              ...prev,
                                              [applicant.id]: {
                                                ...prev[applicant.id],
                                                acceptState: "confirming",
                                              },
                                            }))
                                            await tx.wait()
                                            // Set success state
                                            setApplicantStates((prev) => ({
                                              ...prev,
                                              [applicant.id]: {
                                                ...prev[applicant.id],
                                                acceptState: "success",
                                              },
                                            }))
                                            toast.success("Application accepted successfully!")
                                            updateApplicantStatus(applicant.id)
                                            // Reset state after 2 seconds
                                            setTimeout(() => {
                                              setApplicantStates((prev) => ({
                                                ...prev,
                                                [applicant.id]: {
                                                  ...prev[applicant.id],
                                                  acceptState: "idle",
                                                },
                                              }))
                                            }, 2000)
                                          } catch (err) {
                                            console.error(err)
                                            setApplicantStates((prev) => ({
                                              ...prev,
                                              [applicant.id]: {
                                                ...prev[applicant.id],
                                                acceptState: "idle",
                                              },
                                            }))
                                            toast.error("Failed to accept application.")
                                          }
                                        }}
                                      >
                                        {(() => {
                                          const state = applicantStates[applicant.id]?.acceptState || "idle"
                                          switch (state) {
                                            case "processing":
                                              return (
                                                <>
                                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  Accepting Application
                                                </>
                                              )
                                            case "confirming":
                                              return (
                                                <>
                                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  Confirming...
                                                </>
                                              )
                                            case "success":
                                              return (
                                                <>
                                                  <Check className="mr-1 h-4 w-4" />
                                                  Application Accepted
                                                </>
                                              )
                                            default:
                                              return (
                                                <>
                                                  <CheckCircle className="mr-1 h-4 w-4" />
                                                  Accept
                                                </>
                                              )
                                          }
                                        })()}
                                      </Button>

                                      <Button
                                        size="sm"
                                        disabled={
                                          applicantStates[applicant.id]?.declineState !== "idle" &&
                                          applicantStates[applicant.id]?.declineState !== undefined
                                        }
                                        className={`${
                                          applicantStates[applicant.id]?.declineState === "success"
                                            ? "bg-gray-500 hover:bg-gray-600 text-white"
                                            : "bg-red-500 hover:bg-red-600 text-white"
                                        }`}
                                        onClick={async () => {
                                          try {
                                            if (applicant.status === "reviewed") {
                                              toast.info("This application has already been reviewed.")
                                              return
                                            }
                                            if (!provider) {
                                              toast.error("Provider is not available. Please connect your wallet.")
                                              return
                                            }
                                            // Set processing state
                                            setApplicantStates((prev) => ({
                                              ...prev,
                                              [applicant.id]: {
                                                ...prev[applicant.id],
                                                declineState: "processing",
                                              },
                                            }))
                                            const signer = await provider.getSigner()
                                            const c = new ethers.Contract(
                                              applicant.jobAddress,
                                              PROOF_OF_WORK_JOB_ABI,
                                              signer,
                                            )
                                            const tx = await c.declineApplication(applicant.address)
                                            // Set confirming state
                                            setApplicantStates((prev) => ({
                                              ...prev,
                                              [applicant.id]: {
                                                ...prev[applicant.id],
                                                declineState: "confirming",
                                              },
                                            }))
                                            await tx.wait()
                                            // Set success state
                                            setApplicantStates((prev) => ({
                                              ...prev,
                                              [applicant.id]: {
                                                ...prev[applicant.id],
                                                declineState: "success",
                                              },
                                            }))
                                            toast.success("Application declined successfully!")
                                            updateApplicantStatus(applicant.id)
                                            // Reset state after 2 seconds
                                            setTimeout(() => {
                                              setApplicantStates((prev) => ({
                                                ...prev,
                                                [applicant.id]: {
                                                  ...prev[applicant.id],
                                                  declineState: "idle",
                                                },
                                              }))
                                            }, 2000)
                                          } catch (err) {
                                            console.error(err)
                                            setApplicantStates((prev) => ({
                                              ...prev,
                                              [applicant.id]: {
                                                ...prev[applicant.id],
                                                declineState: "idle",
                                              },
                                            }))
                                            toast.error("Failed to decline application.")
                                          }
                                        }}
                                      >
                                        {(() => {
                                          const state = applicantStates[applicant.id]?.declineState || "idle"
                                          switch (state) {
                                            case "processing":
                                              return (
                                                <>
                                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  Denying Application
                                                </>
                                              )
                                            case "confirming":
                                              return (
                                                <>
                                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                  Confirming...
                                                </>
                                              )
                                            case "success":
                                              return (
                                                <>
                                                  <Check className="mr-1 h-4 w-4" />
                                                  Application Denied
                                                </>
                                              )
                                            default:
                                              return (
                                                <>
                                                  <Trash2 className="mr-1 h-4 w-4" />
                                                  Decline
                                                </>
                                              )
                                          }
                                        })()}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </InteractiveCard>
                        </motion.div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <motion.div
                        variants={fadeIn(0.3)}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-6 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 rounded-xl border border-accent/20"
                      >
                        {/* Page Info */}
                        <div className="text-sm text-muted-foreground font-varela">
                          Showing <span className="font-semibold text-accent">{startIndex + 1}</span> to{" "}
                          <span className="font-semibold text-accent">
                            {Math.min(endIndex, sortedApplicants.length)}
                          </span>{" "}
                          of <span className="font-semibold text-accent">{sortedApplicants.length}</span> applications
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-2">
                          {/* First Page */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentPage(1)
                              setPageInput("")
                            }}
                            disabled={currentPage === 1}
                            className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>

                          {/* Previous Page */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentPage((prev) => Math.max(1, prev - 1))
                              setPageInput("")
                            }}
                            disabled={currentPage === 1}
                            className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>

                          {/* Page Numbers */}
                          <div className="flex items-center gap-1">
                            {(() => {
                              const pages = []
                              const showPages = 5
                              let startPage = Math.max(1, currentPage - Math.floor(showPages / 2))
                              const endPage = Math.min(totalPages, startPage + showPages - 1)

                              if (endPage - startPage + 1 < showPages) {
                                startPage = Math.max(1, endPage - showPages + 1)
                              }

                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <Button
                                    key={i}
                                    variant={currentPage === i ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      setCurrentPage(i)
                                      setPageInput("")
                                    }}
                                    className={`min-w-[2.5rem] transition-all duration-200 ${
                                      currentPage === i
                                        ? "bg-accent text-accent-foreground shadow-lg scale-105"
                                        : "border-accent/30 hover:bg-accent/10 hover:border-accent/50 hover:scale-105"
                                    }`}
                                  >
                                    {i}
                                  </Button>,
                                )
                              }

                              return pages
                            })()}
                          </div>

                          {/* Next Page */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                              setPageInput("")
                            }}
                            disabled={currentPage === totalPages}
                            className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>

                          {/* Last Page */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentPage(totalPages)
                              setPageInput("")
                            }}
                            disabled={currentPage === totalPages}
                            className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Go to Page Input */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground font-varela">Go to:</span>
                          <Input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const page = Number.parseInt(pageInput)
                                if (page >= 1 && page <= totalPages) {
                                  setCurrentPage(page)
                                  setPageInput("")
                                }
                              }
                            }}
                            placeholder={currentPage.toString()}
                            className="w-16 h-8 text-center border-accent/30 focus:border-accent text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const page = Number.parseInt(pageInput)
                              if (page >= 1 && page <= totalPages) {
                                setCurrentPage(page)
                                setPageInput("")
                              }
                            }}
                            disabled={
                              !pageInput || Number.parseInt(pageInput) < 1 || Number.parseInt(pageInput) > totalPages
                            }
                            className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            Go
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </>
                )
              })()}
            </>
          ) : (
            <motion.div variants={fadeIn()} key="no-applicants" className="col-span-full flex justify-center">
              <InteractiveCard className="max-w-md w-full flex flex-col items-center justify-center text-center py-10">
                <Users className="h-12 w-12 text-accent mb-4 mx-auto" />
                <h3 className="font-varien text-lg font-semibold text-foreground mb-2">No Applicants Found</h3>
                <p className="text-sm text-muted-foreground">No applicants have applied yet.</p>
              </InteractiveCard>
            </motion.div>
          )}
        </div>
      </SectionWrapper>
    </div>
  )
}
