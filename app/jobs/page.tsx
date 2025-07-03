"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type React from "react"
import { useEffect, useState, useRef } from "react"
import {
  ArrowRight,
  Search,
  Briefcase,
  Clock,
  Calendar,
  Users,
  Star,
  Filter,
  CheckCircle,
  XCircle,
  Clock3,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Check,
  Send,
  User,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { InteractiveCard } from "@/components/custom/interactive-card"
import { Balancer } from "react-wrap-balancer"
import { ethers } from "ethers"
import PROOF_OF_WORK_JOB_ABI from "@/lib/contracts/ProofOfWorkJob.json"
import DISPUTE_DAO_ABI from "@/lib/contracts/DisputeDAO.json"
import { toast } from "sonner"
import { fetchEmployerDisplayName, useUserContext } from "@/context/UserContext"
import { io, type Socket } from "socket.io-client"

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

export default function JobsPage() {
  const {
    contracts,
    provider,
    role,
    address,
    allJobs,
    jobAddresses,
    myJobs,
    displayName,
    wallet,
    sendP2PMessage,
    fetchP2PMessages,
  } = useUserContext()

  // State for job filters
  const [searchTerm, setSearchTerm] = useState("")
  const [payTypeFilter, setPayTypeFilter] = useState<string>("all")
  const [minPayFilter, setMinPayFilter] = useState<number[]>([0])
  const [showFilters, setShowFilters] = useState(false)
  const [openPositionsFilter, setOpenPositionsFilter] = useState(false) // State for "open positions" switch
  const [highRatedFilter, setHighRatedFilter] = useState(false) // State for "high-rated employers" switch

  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [applicationText, setApplicationText] = useState("")
  const [disputeReason, setDisputeReason] = useState("")
  const [selectedJobForDispute, setSelectedJobForDispute] = useState<(typeof myJobs)[0] | null>(null)
  const [myApplications, setMyApplications] = useState<any[]>([])

  // Messaging states for Browse Jobs
  const [selectedEmployer, setSelectedEmployer] = useState<any | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newChatMessage, setNewChatMessage] = useState("")
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  // Messaging states for Active Jobs
  const [selectedActiveJobEmployer, setSelectedActiveJobEmployer] = useState<any | null>(null)
  const [activeJobChatMessages, setActiveJobChatMessages] = useState<any[]>([])
  const [newActiveJobChatMessage, setNewActiveJobChatMessage] = useState("")
  const [isLoadingActiveJobMessages, setIsLoadingActiveJobMessages] = useState(false)
  const [isSendingActiveJobMessage, setIsSendingActiveJobMessage] = useState(false)

  // Pagination states
  const [browseCurrentPage, setBrowseCurrentPage] = useState(1)
  const [browsePageInput, setBrowsePageInput] = useState("")
  const [myJobsCurrentPage, setMyJobsCurrentPage] = useState(1)
  const [myJobsPageInput, setMyJobsPageInput] = useState("")
  const [applicationsCurrentPage, setApplicationsCurrentPage] = useState(1)
  const [applicationsPageInput, setApplicationsPageInput] = useState("")
  const itemsPerPage = 6

  // Button states
  const [applyState, setApplyState] = useState<"idle" | "processing" | "confirming" | "success">("idle")
  const [withdrawState, setWithdrawState] = useState<"idle" | "processing" | "confirming" | "success">("idle")
  const [disputeState, setDisputeState] = useState<"idle" | "processing" | "confirming" | "success">("idle")

  const socket = useRef<Socket | null>(null)
  const activeJobSocket = useRef<Socket | null>(null)

  // Filter jobs based on search and filters
  const filteredAndSortedJobs =
    allJobs
      ?.filter((job) => {
        // Search term filter
        const matchesSearch =
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.employer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.tags.some((tag: any) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

        // Payment type filter
        const matchesPayType = payTypeFilter === "all" || job.payType === payTypeFilter

        // Minimum pay filter
        const payAmount = job.payType === "WEEKLY" ? Number.parseFloat(job.weeklyPay) : Number.parseFloat(job.totalPay)
        const matchesMinPay = payAmount >= minPayFilter[0]

        // Open positions filter
        const matchesOpenPositions = !openPositionsFilter || job.positionsFilled < job.positions

        // High-rated employers filter
        const matchesHighRated = !highRatedFilter || job.employerRating >= 4.5

        return matchesSearch && matchesPayType && matchesMinPay && matchesOpenPositions && matchesHighRated
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []

  // WebSocket setup for Browse Jobs chat
  useEffect(() => {
    if (selectedEmployer && address) {
      socket.current = io(process.env.NEXT_PUBLIC_API)
      const participants = [address, selectedEmployer.address].sort()
      const room = `chat_${participants.join("_")}`
      socket.current.emit("joinRoom", room)

      socket.current.on("newChatMessage", (message) => {
        setChatMessages((prev) => [...prev, message])
      })

      return () => {
        if (socket.current) {
          socket.current.disconnect()
        }
      }
    }
  }, [selectedEmployer, address])

  // WebSocket setup for Active Jobs chat
  useEffect(() => {
    if (selectedActiveJobEmployer && address) {
      activeJobSocket.current = io(process.env.NEXT_PUBLIC_API)
      const participants = [address, selectedActiveJobEmployer.address].sort()
      const room = `chat_${participants.join("_")}`
      activeJobSocket.current.emit("joinRoom", room)

      activeJobSocket.current.on("newChatMessage", (message) => {
        setActiveJobChatMessages((prev) => [...prev, message])
      })

      return () => {
        if (activeJobSocket.current) {
          activeJobSocket.current.disconnect()
        }
      }
    }
  }, [selectedActiveJobEmployer, address])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messageContainer = document.querySelector(".chat-messages-container")
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    const activeJobMessageContainer = document.querySelector(".active-job-chat-messages-container")
    if (activeJobMessageContainer) {
      activeJobMessageContainer.scrollTop = activeJobMessageContainer.scrollHeight
    }
  }, [activeJobChatMessages])

  // Fetch chat messages for Browse Jobs using the UserContext function
  const fetchChatMessages = async (employerAddress: string) => {
    if (!address || !fetchP2PMessages) return

    setIsLoadingMessages(true)
    try {
      // Use the UserContext function to fetch messages between current user and employer
      const messages = await fetchP2PMessages(employerAddress)
      setChatMessages(messages)
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast.error("Failed to load messages")
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Fetch chat messages for Active Jobs using the UserContext function
  const fetchActiveJobChatMessages = async (employerAddress: string) => {
    if (!address || !fetchP2PMessages) return

    setIsLoadingActiveJobMessages(true)
    try {
      // Use the UserContext function to fetch messages between current user and employer
      const messages = await fetchP2PMessages(employerAddress)
      setActiveJobChatMessages(messages)
    } catch (error) {
      console.error("Error fetching active job messages:", error)
      toast.error("Failed to load messages")
    } finally {
      setIsLoadingActiveJobMessages(false)
    }
  }

  // Send chat message for Browse Jobs
  const handleSendChatMessage = async () => {
    if (!newChatMessage.trim() || !selectedEmployer || !address || !sendP2PMessage) return

    setIsSendingMessage(true)
    try {
      await sendP2PMessage(selectedEmployer.address, newChatMessage.trim())
      // Optimistically add the message to the chat
      const optimisticMessage = {
        sender: address,
        receiver: selectedEmployer.address,
        content: newChatMessage.trim(),
        createdAt: new Date().toISOString(),
      }
      setChatMessages((prev) => [...prev, optimisticMessage])
      setNewChatMessage("")
      toast.success("Message sent successfully!")
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    } finally {
      setIsSendingMessage(false)
    }
  }

  // Send chat message for Active Jobs
  const handleSendActiveJobChatMessage = async () => {
    if (!newActiveJobChatMessage.trim() || !selectedActiveJobEmployer || !address || !sendP2PMessage) return

    setIsSendingActiveJobMessage(true)
    try {
      await sendP2PMessage(selectedActiveJobEmployer.address, newActiveJobChatMessage.trim())
      // Optimistically add the message to the chat
      const optimisticMessage = {
        sender: address,
        recipient: selectedActiveJobEmployer.address,
        content: newActiveJobChatMessage.trim(),
        createdAt: new Date().toISOString(),
      }
      setActiveJobChatMessages((prev) => [...prev, optimisticMessage])
      setNewActiveJobChatMessage("")
      toast.success("Message sent successfully!")
    } catch (error) {
      console.error("Error sending active job message:", error)
      toast.error("Failed to send message")
    } finally {
      setIsSendingActiveJobMessage(false)
    }
  }

  // Handle opening chat for Browse Jobs
  const handleOpenChat = async (job: any) => {
    const employer = {
      address: job.employerAddress,
      name: job.employer,
    }
    setSelectedEmployer(employer)
    await fetchChatMessages(job.employerAddress)
  }

  // Handle opening chat for Active Jobs
  const handleOpenActiveJobChat = async (job: any) => {
    const employer = {
      address: job.employerAddress,
      name: job.employer,
    }
    setSelectedActiveJobEmployer(employer)
    await fetchActiveJobChatMessages(job.employerAddress)
  }

  const handleSubmitApplication = async (jobAddress: string, applicationText: string) => {
    if (!provider || !contracts) {
      toast.error("Please connect your wallet first.")
      return
    }

    try {
      setApplyState("processing")
      const signer = await provider.getSigner()
      const jobContract = new ethers.Contract(jobAddress, PROOF_OF_WORK_JOB_ABI, signer)

      // Call the submitApplication function
      const tx = await jobContract.submitApplication(applicationText)
      setApplyState("confirming")
      await tx.wait()

      setApplyState("success")
      toast.success("Application submitted successfully!")
      setApplicationText("")
      setSelectedJob(null)

      // Reset state after 2 seconds
      setTimeout(() => {
        setApplyState("idle")
      }, 2000)

      // Fetch the updated application details
      const [applicantAddress, application, appliedAt, isActive, status, reviewedAt, wasAccepted] =
        await jobContract.getApplicant(address)

      const isWorker = await jobContract.isWorker(address)

      // Determine the application status
      let applicationStatus = "pending"
      if (isWorker) {
        applicationStatus = "hired" // The applicant is already working
      } else if (status === 1) {
        // REVIEWED
        applicationStatus = wasAccepted ? "hired" : "rejected"
      }

      // Fetch job title and employer for display
      const [jobTitle, employer] = await Promise.all([jobContract.title(), jobContract.employer()])
      const employerName = await fetchEmployerDisplayName(employer)

      const newApplication = {
        jobAddress,
        jobTitle,
        employer: employerName,
        application,
        appliedAt: new Date(Number(appliedAt) * 1000).toLocaleDateString(),
        status: applicationStatus,
      }

      setMyApplications((prev) => [...prev, newApplication])
    } catch (error) {
      console.error("Error submitting application:", error)
      setApplyState("idle")
      toast.error("Failed to submit application. Please try again.")
    }
  }

  // Handle job application
  const handleApply = async () => {
    if (role !== "worker") {
      toast.error("Only workers can apply for jobs.", { duration: 3000 })
      return
    }

    if (!selectedJob) {
      toast.error("Please select a job to apply for.")
      return
    }

    if (!applicationText.trim()) {
      toast.error("Application text cannot be empty.")
      return
    }

    try {
      // Check if the user has already applied for the job
      const jobContract = new ethers.Contract(selectedJob.address, PROOF_OF_WORK_JOB_ABI, provider)
      const hasApplied = await jobContract.hasApplied(address)

      if (hasApplied) {
        toast.info("You have already applied for this job.")
        return
      }

      // Submit the application
      handleSubmitApplication(selectedJob.address, applicationText)
    } catch (error) {
      console.error("Error checking application status:", error)
      toast.error("Failed to check application status.")
    }
  }

  // Handle dispute submission
  const handleDisputeSubmit = async () => {
    if (!provider || !contracts || !selectedJobForDispute) {
      toast.error("Please connect your wallet and select a job to open a dispute.")
      return
    }

    if (!disputeReason.trim()) {
      toast.error("Dispute reason cannot be empty.")
      return
    }

    try {
      setDisputeState("processing")
      const signer = await provider.getSigner()
      const disputeDAOContract = new ethers.Contract(
        selectedJobForDispute.disputeDAOAddress, // Address of the DisputeDAO contract
        DISPUTE_DAO_ABI, // ABI of the DisputeDAO contract
        signer,
      )

      // Call the createDispute function
      const tx = await disputeDAOContract.createDispute(
        selectedJobForDispute.id, // Job address
        disputeReason, // Reason for the dispute
      )

      setDisputeState("confirming")
      await tx.wait()

      setDisputeState("success")
      toast.success("Dispute created successfully!")

      // Reset the dispute form
      setDisputeReason("")
      setSelectedJobForDispute(null)

      // Reset state after 2 seconds
      setTimeout(() => {
        setDisputeState("idle")
      }, 2000)
    } catch (error) {
      console.error("Error submitting dispute:", error)
      setDisputeState("idle")
      const errorMessage = error instanceof Error ? error.message : "Failed to submit dispute."
      toast.error(errorMessage)
    }
  }

  const fetchMyApplications = async (jobAddresses: string[], userAddress: string) => {
    try {
      const applications = []
      for (const jobAddress of jobAddresses) {
        const jobContract = new ethers.Contract(jobAddress, PROOF_OF_WORK_JOB_ABI, provider)

        // Check if the user has applied to this job
        const hasApplied = await jobContract.hasApplied(userAddress)

        if (hasApplied) {
          // Fetch application details
          const [applicantAddress, application, appliedAt, isActive, status, reviewedAt, wasAccepted] =
            await jobContract.getApplicant(userAddress)

          // Check if the user is already a worker
          const isWorker = await jobContract.isWorker(userAddress)

          // Determine the application status
          let applicationStatus = "pending"
          if (isWorker) {
            applicationStatus = "hired" // The applicant is already working
          } else if (status === 1) {
            // REVIEWED
            applicationStatus = wasAccepted ? "hired" : "rejected"
          }

          // Fetch job title and employer for display
          const [jobTitle, employer] = await Promise.all([jobContract.title(), jobContract.employer()])
          const employerName = await fetchEmployerDisplayName(employer)

          applications.push({
            jobAddress,
            jobTitle,
            employer: employerName,
            application,
            appliedAt: new Date(Number(appliedAt) * 1000).toLocaleDateString(),
            status: applicationStatus,
          })
        }
      }

      return applications
    } catch (error) {
      console.error("Error fetching applications:", error)
      return []
    }
  }

  useEffect(() => {
    const fetchApplications = async () => {
      if (contracts?.jobFactory && provider && address) {
        try {
          // Fetch all job addresses
          // const jobAddresses = await fetchAllJobAddresses(contracts.jobFactory);
          // Fetch applications for the current user
          const applications = await fetchMyApplications(jobAddresses, address)
          setMyApplications(applications)
        } catch (error) {
          console.error("Error fetching applications:", error)
        }
      }
    }

    fetchApplications()
  }, [contracts?.jobFactory, provider, address, jobAddresses])

  const handleWithdrawApplication = async (jobAddress: string) => {
    if (!provider || !contracts) {
      toast.error("Please connect your wallet first.")
      return
    }

    try {
      setWithdrawState("processing")
      const signer = await provider.getSigner()
      const jobContract = new ethers.Contract(jobAddress, PROOF_OF_WORK_JOB_ABI, signer)

      // Call the withdrawApplication function
      const tx = await jobContract.withdrawApplication()
      setWithdrawState("confirming")
      await tx.wait()

      setWithdrawState("success")
      toast.success("Application withdrawn successfully!")

      // Remove the application from myApplications
      setMyApplications((prev) => prev.filter((application) => application.jobAddress !== jobAddress))

      // Reset state after 2 seconds
      setTimeout(() => {
        setWithdrawState("idle")
      }, 2000)
    } catch (error) {
      console.error("Error withdrawing application:", error)
      setWithdrawState("idle")
      toast.error("Failed to withdraw application. Please try again.")
    }
  }

  // Chat Message Component for reusability
  const ChatMessageComponent = ({
    messages,
    currentUserAddress,
    otherPartyName,
    otherPartyAddress,
    isLoading,
    containerClass,
  }: {
    messages: any[]
    currentUserAddress: string
    otherPartyName: string
    otherPartyAddress: string
    isLoading: boolean
    containerClass: string
  }) => (
    <div className={`space-y-4 max-h-[400px] overflow-y-auto p-2 ${containerClass}`}>
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="ml-2 text-sm text-muted-foreground font-varela">Loading messages...</span>
        </div>
      ) : messages.length > 0 ? (
        messages.map((message: any, index: number) => {
          // Check if the message is from the current user by comparing wallet addresses
          const isFromMe = message.receiver?.toLowerCase() === otherPartyAddress?.toLowerCase()
          const isFromOtherParty = message.sender?.toLowerCase() === otherPartyAddress?.toLowerCase()

          return (
            <div key={index} className={`flex gap-3 ${isFromMe ? "justify-end" : "justify-start"}`}>
              {!isFromMe && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://effigy.im/a/${message.sender}.svg`} alt={message.sender} />
                  <AvatarFallback>
                    <Briefcase className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  isFromMe
                    ? "bg-green-100 dark:bg-green-900/30 text-foreground border border-green-200 dark:border-green-700"
                    : "bg-red-100 dark:bg-red-900/30 text-foreground border border-red-200 dark:border-red-700"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm font-varela">
                    {isFromMe ? displayName || "You" : otherPartyName}{" "}
                    <Badge
                      variant="outline"
                      className={`text-xs ml-1 font-varela ${
                        isFromMe
                          ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                          : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                      }`}
                    >
                      {isFromMe ? "You" : "Employer"}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground font-varela">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-varela">{message.content}</p>
              </div>
              {isFromMe && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://effigy.im/a/${currentUserAddress}.svg`} alt={currentUserAddress} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )
        })
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-varela">No messages yet. Start the conversation!</p>
        </div>
      )}
    </div>
  )

  // Pagination component
  const PaginationControls = ({
    currentPage,
    setCurrentPage,
    pageInput,
    setPageInput,
    totalItems,
    itemsPerPage,
    itemName,
  }: {
    currentPage: number
    setCurrentPage: (page: number) => void
    pageInput: string
    setPageInput: (input: string) => void
    totalItems: number
    itemsPerPage: number
    itemName: string
  }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems)

    if (totalPages <= 1) return null

    return (
      <motion.div
        variants={fadeIn(0.3)}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-6 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 rounded-xl border border-accent/20"
      >
        {/* Page Info */}
        <div className="text-sm text-muted-foreground font-varela">
          Showing <span className="font-semibold text-accent">{startIndex + 1}</span> to{" "}
          <span className="font-semibold text-accent">{endIndex}</span> of{" "}
          <span className="font-semibold text-accent">{totalItems}</span> {itemName}
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
              setCurrentPage(Math.max(1, currentPage - 1))
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
              setCurrentPage(Math.min(totalPages, currentPage + 1))
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
            disabled={!pageInput || Number.parseInt(pageInput) < 1 || Number.parseInt(pageInput) > totalPages}
            className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Go
          </Button>
        </div>
      </motion.div>
    )
  }

  const getApplyButtonContent = () => {
    switch (applyState) {
      case "processing":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting Application...
          </>
        )
      case "confirming":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming Application...
          </>
        )
      case "success":
        return (
          <>
            <Check className="mr-2 h-4 w-4" />
            Application Submitted!
          </>
        )
      default:
        return "Submit Application"
    }
  }

  const getWithdrawButtonContent = () => {
    switch (withdrawState) {
      case "processing":
        return (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            Withdrawing Application...
          </>
        )
      case "confirming":
        return (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            Confirming Withdrawal...
          </>
        )
      case "success":
        return (
          <>
            <Check className="mr-1 h-4 w-4" />
            Application Withdrawn!
          </>
        )
      default:
        return (
          <>
            <XCircle className="mr-1 h-4 w-4" />
            Withdraw Application
          </>
        )
    }
  }

  const getDisputeButtonContent = () => {
    switch (disputeState) {
      case "processing":
        return (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            Submitting Dispute...
          </>
        )
      case "confirming":
        return (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            Confirming Dispute...
          </>
        )
      case "success":
        return (
          <>
            <Check className="mr-1 h-4 w-4" />
            Dispute Submitted!
          </>
        )
      default:
        return (
          <>
            <AlertTriangle className="mr-1 h-4 w-4" />
            Submit Dispute
          </>
        )
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <motion.section
        className="w-full min-h-[40vh] flex flex-col justify-center items-center text-center relative overflow-hidden py-16"
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.1, 0.1)}
      >
        <div className="container px-4 md:px-6 relative z-10">
          <motion.h1
            variants={fadeIn(0.1)}
            className="font-varien text-4xl font-bold sm:text-5xl md:text-6xl text-foreground mb-12 tracking-wider"
          >
            Find <span className="text-accent">On-Chain</span> Work
          </motion.h1>
          <motion.p
            variants={fadeIn(0.2)}
            className="mt-20 max-w-2xl mx-auto text-muted-foreground md:text-lg lg:text-xl"
          >
            <Balancer>
              Browse opportunities, apply for jobs, and get paid automatically through smart contracts. Build your
              on-chain reputation with every successful project.
            </Balancer>
          </motion.p>
        </div>
      </motion.section>

      {/* Main Content – moved up by reducing top padding */}
      <SectionWrapper id="jobs" padding="pt-0 md:pt-2 pb-12 md:pb-12">
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="font-varien grid grid-cols-3 mb-8">
            <TabsTrigger value="browse" className="text-sm sm:text-base">
              <Briefcase className="mr-2 h-4 w-4" />
              Browse Jobs
            </TabsTrigger>
            <TabsTrigger value="active" className="text-sm sm:text-base">
              <CheckCircle className="mr-2 h-4 w-4" />
              My Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="text-sm sm:text-base">
              <Clock3 className="mr-2 h-4 w-4" />
              Applications
            </TabsTrigger>
          </TabsList>

          {/* Browse Jobs Tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs by title, skills, or employer..."
                    className="pl-10 border-border focus:border-accent font-varela"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="border-accent/50 text-accent hover:bg-accent/10 font-varien bg-transparent"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-lg border border-border bg-card/50"
                >
                  <div className="space-y-2">
                    <Label htmlFor="payment-type" className="text-foreground font-varien">
                      Payment Type
                    </Label>
                    <Select value={payTypeFilter} onValueChange={setPayTypeFilter}>
                      <SelectTrigger className="border-border focus:border-accent">
                        <SelectValue placeholder="All payment types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All payment types</SelectItem>
                        <SelectItem value="WEEKLY">Weekly payments</SelectItem>
                        <SelectItem value="ONE_OFF">One-off payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-varien">Minimum Pay (KAS)</Label>
                    <div className="pt-4">
                      <Slider
                        defaultValue={[0]}
                        max={10}
                        step={0.5}
                        value={minPayFilter}
                        onValueChange={setMinPayFilter}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>0 KAS</span>
                        <span>{minPayFilter[0]} KAS</span>
                        <span>10+ KAS</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-varien">Other Filters</Label>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="open-positions"
                          checked={openPositionsFilter}
                          onCheckedChange={setOpenPositionsFilter}
                        />
                        <Label htmlFor="open-positions">Only show jobs with open positions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="high-rated" checked={highRatedFilter} onCheckedChange={setHighRatedFilter} />
                        <Label htmlFor="high-rated">Only high-rated employers (4.5+)</Label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Job Listings */}
            {(() => {
              const startIndex = (browseCurrentPage - 1) * itemsPerPage
              const endIndex = startIndex + itemsPerPage
              const currentJobs = filteredAndSortedJobs.slice(startIndex, endIndex)

              return (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {currentJobs.length > 0 ? (
                      currentJobs.map((job, i) => (
                        <motion.div
                          key={job.address}
                          variants={fadeIn(i * 0.1)}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: i * 0.1 }}
                        >
                          <InteractiveCard className="h-full flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-varien text-lg font-normal tracking-wider text-foreground">
                                  {job.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm text-muted-foreground font-varela">{job.employer}</span>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                    <span className="text-xs ml-1 font-varela">{job.employerRating}</span>
                                  </div>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  job.payType === "WEEKLY"
                                    ? "border-blue-500 text-blue-500 font-varela"
                                    : "border-purple-500 text-purple-500 font-varela"
                                }
                              >
                                {job.payType === "WEEKLY" ? "Weekly" : "One-off"}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4 line-clamp-3 font-varela">
                              {job.description}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-4">
                              {job.tags.map((tag: any) => (
                                <Badge key={tag} variant="secondary" className="text-xs font-varela">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div className="flex items-center gap-2">
                                <img
                                  src="/kaslogo.webp"
                                  alt="KAS"
                                  className="h-4 w-4 filter-none"
                                  style={{ filter: "none", imageRendering: "crisp-edges" }}
                                />
                                <div>
                                  <p className="font-medium text-foreground font-varela">
                                    {job.payType === "WEEKLY"
                                      ? `${job.weeklyPay} KAS/week`
                                      : `${job.totalPay} KAS total`}
                                  </p>
                                  {job.payType === "WEEKLY" && (
                                    <p className="text-xs text-muted-foreground font-varela">
                                      {job.totalPay} KAS total
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {job.payType === "WEEKLY" ? (
                                  <>
                                    <Calendar className="h-4 w-4 text-accent" />
                                    <div>
                                      <p className="font-medium text-foreground font-varela">
                                        {job.durationWeeks} weeks
                                      </p>
                                      <p className="text-xs text-muted-foreground font-varela">Duration</p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-4 w-4 text-accent" />
                                    <div>
                                      <p className="font-medium text-foreground font-varela">One-time project</p>
                                      <p className="text-xs text-muted-foreground font-varela">
                                        Posted {new Date(job.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-accent" />
                                <div>
                                  <p className="font-medium text-foreground font-varela">
                                    {job.positionsFilled}/{job.positions} filled
                                  </p>
                                  <p className="text-xs text-muted-foreground font-varela">
                                    {job.applicants} applicants
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-auto pt-4 flex gap-3">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    className="flex-1 bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                                    onClick={() => setSelectedJob(job)}
                                  >
                                    Apply Now
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[525px] bg-gradient-to-br from-background via-background/95 to-accent/5 border border-accent/20">
                                  <DialogHeader>
                                    <DialogTitle className="font-varien text-xl tracking-wider">
                                      Apply for {selectedJob?.title}
                                    </DialogTitle>
                                    <DialogDescription className="font-varela">
                                      Submit your application for this position at {selectedJob?.employer}.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="cover-letter" className="font-varien">
                                        Why are you a good fit for this role?
                                      </Label>
                                      <Textarea
                                        id="cover-letter"
                                        placeholder="Describe your relevant experience and why you're interested in this position..."
                                        className="min-h-[150px] border-accent/30 focus:border-accent font-varela"
                                        value={applicationText}
                                        onChange={(e) => setApplicationText(e.target.value)}
                                        disabled={applyState !== "idle"}
                                      />
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setApplicationText("")
                                        setSelectedJob(null)
                                      }}
                                      disabled={applyState !== "idle"}
                                      className="font-varien"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="submit"
                                      disabled={applyState !== "idle"}
                                      className={`font-varien ${
                                        applyState === "success"
                                          ? "bg-green-500 hover:bg-green-600 text-white"
                                          : "bg-accent hover:bg-accent-hover text-accent-foreground"
                                      }`}
                                      onClick={handleApply}
                                    >
                                      {getApplyButtonContent()}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="border-accent/50 text-accent hover:bg-accent/10 font-varien bg-transparent"
                                    onClick={() => handleOpenChat(job)}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="sr-only">Message Employer</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-background via-background/95 to-accent/5 border border-accent/20">
                                  <DialogHeader>
                                    <DialogTitle className="font-varien text-xl tracking-wider">
                                      Message {selectedEmployer?.name}
                                    </DialogTitle>
                                    <DialogDescription className="font-varela">
                                      Send a direct message to the employer about this job opportunity.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="space-y-4">
                                    {/* Messages Container */}
                                    <ChatMessageComponent
                                      messages={chatMessages}
                                      currentUserAddress={address || ""}
                                      otherPartyName={selectedEmployer?.name || ""}
                                      otherPartyAddress={selectedEmployer?.address || ""}
                                      isLoading={isLoadingMessages}
                                      containerClass="chat-messages-container"
                                    />

                                    {/* Message Input */}
                                    <div className="flex gap-2">
                                      <Textarea
                                        placeholder="Type your message here..."
                                        value={newChatMessage}
                                        onChange={(e) => setNewChatMessage(e.target.value)}
                                        className="min-h-[80px] border-accent/30 focus:border-accent font-varela"
                                        disabled={isSendingMessage}
                                      />
                                      <Button
                                        className="self-end bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                                        onClick={handleSendChatMessage}
                                        disabled={!newChatMessage.trim() || isSendingMessage}
                                      >
                                        {isSendingMessage ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Send className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedEmployer(null)
                                        setChatMessages([])
                                        setNewChatMessage("")
                                      }}
                                      className="font-varien"
                                    >
                                      Close
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </InteractiveCard>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-1 lg:col-span-2 text-center py-12">
                        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2 font-varien">No jobs found</h3>
                        <p className="text-muted-foreground font-varela">
                          Try adjusting your search or filters to find more opportunities.
                        </p>
                      </div>
                    )}
                  </div>

                  <PaginationControls
                    currentPage={browseCurrentPage}
                    setCurrentPage={setBrowseCurrentPage}
                    pageInput={browsePageInput}
                    setPageInput={setBrowsePageInput}
                    totalItems={filteredAndSortedJobs.length}
                    itemsPerPage={itemsPerPage}
                    itemName="jobs"
                  />
                </>
              )
            })()}
          </TabsContent>

          {/* My Jobs Tab */}
          <TabsContent value="active" className="space-y-6">
            {(() => {
              const startIndex = (myJobsCurrentPage - 1) * itemsPerPage
              const endIndex = startIndex + itemsPerPage
              const currentMyJobs = myJobs.slice(startIndex, endIndex)

              return (
                <>
                  <div className="grid grid-cols-1 gap-6">
                    {currentMyJobs.length > 0 ? (
                      currentMyJobs.map((job, i) => (
                        <motion.div
                          key={job.id}
                          variants={fadeIn(i * 0.1)}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: i * 0.1 }}
                        >
                          <InteractiveCard>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-varien text-lg font-normal tracking-wider text-foreground">
                                      {job.title}
                                    </h3>
                                    <Badge
                                      className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 font-varela"
                                      variant="outline"
                                    >
                                      Active
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-muted-foreground font-varela">{job.employer}</span>
                                    <div className="flex items-center">
                                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                      <span className="text-xs ml-1 font-varela">{job.employerRating}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src="/kaslogo.webp"
                                      alt="KAS"
                                      className="h-4 w-4 filter-none"
                                      style={{ filter: "none", imageRendering: "crisp-edges" }}
                                    />
                                    <div>
                                      <p className="font-medium text-foreground font-varela">
                                        {job.payType === "WEEKLY"
                                          ? `${job.weeklyPay} KAS/week`
                                          : `${job.totalPay} KAS total`}
                                      </p>
                                      {job.payType === "WEEKLY" && (
                                        <p className="text-xs text-muted-foreground font-varela">
                                          {job.totalPay} KAS total
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-accent" />
                                    <div>
                                      <p className="font-medium text-foreground font-varela">
                                        {new Date(job.startDate).toLocaleDateString()}
                                      </p>
                                      <p className="text-xs text-muted-foreground font-varela">Start date</p>
                                    </div>
                                  </div>

                                  {job.payType === "WEEKLY" && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-accent" />
                                      <div>
                                        <p className="font-medium text-foreground font-varela">
                                          {new Date(job.nextPayoutDate).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-varela">Next payout</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-center md:items-end gap-3">
                                {job.payType === "WEEKLY" && (
                                  <div className="w-full md:w-48">
                                    <div className="flex justify-between text-xs mb-1 font-varela">
                                      <span>Progress</span>
                                      <span>
                                        {job.payoutsMade}/{job.durationWeeks} weeks
                                      </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2.5">
                                      <div
                                        className="bg-accent h-2.5 rounded-full"
                                        style={{ width: `${job.progress}%` }}
                                      ></div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-sm">
                                      <Calendar className="h-4 w-4 text-accent" />
                                      <div>
                                        <p className="font-medium text-foreground font-varela">Next Payment</p>
                                        <p className="text-xs text-muted-foreground font-varela">
                                          {new Date(job.nextPayoutDate).toLocaleDateString()} (Automatic)
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  {job.payType === "ONE_OFF" && (
                                    <Button className="bg-accent hover:bg-accent-hover text-accent-foreground font-varien">
                                      <CheckCircle className="mr-1 h-4 w-4" />
                                      Complete & Claim
                                    </Button>
                                  )}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="border-red-500/50 text-red-500 hover:bg-red-500/10 font-varien bg-transparent"
                                        onClick={() => setSelectedJobForDispute(job)}
                                      >
                                        <AlertTriangle className="mr-1 h-4 w-4" />
                                        Open Dispute
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[525px] bg-gradient-to-br from-background via-background/95 to-accent/5 border border-accent/20">
                                      <DialogHeader>
                                        <DialogTitle className="font-varien text-xl tracking-wider">
                                          Open Dispute for {selectedJobForDispute?.title}
                                        </DialogTitle>
                                        <DialogDescription className="font-varela">
                                          Opening a dispute will create a case in the DisputeDAO for resolution by the
                                          assigned jurors.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                          <Label htmlFor="dispute-reason" className="font-varien">
                                            Initial Statement
                                          </Label>
                                          <Textarea
                                            id="dispute-reason"
                                            placeholder="Describe the issue in detail. This will be your first message in the dispute thread..."
                                            className="min-h-[150px] border-accent/30 focus:border-accent font-varela"
                                            value={disputeReason}
                                            onChange={(e) => setDisputeReason(e.target.value)}
                                            disabled={disputeState !== "idle"}
                                          />
                                        </div>
                                        <div className="text-sm text-muted-foreground font-varela">
                                          <p className="mb-2">
                                            <strong>Important:</strong> Opening a dispute will:
                                          </p>
                                          <ul className="list-disc pl-5 space-y-1">
                                            <li>Create a new dispute record in the DisputeDAO contract</li>
                                            <li>Freeze any remaining funds in the job contract</li>
                                            <li>Allow both parties and jurors to submit evidence and messages</li>
                                            <li>Initiate the voting process by the assigned jurors</li>
                                          </ul>
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          variant="outline"
                                          onClick={() => setDisputeReason("")}
                                          disabled={disputeState !== "idle"}
                                          className="font-varien"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="submit"
                                          disabled={disputeState !== "idle"}
                                          className={`font-varien ${
                                            disputeState === "success"
                                              ? "bg-green-500 hover:bg-green-600 text-white"
                                              : "bg-red-500 hover:bg-red-600 text-white"
                                          }`}
                                          onClick={handleDisputeSubmit}
                                        >
                                          {getDisputeButtonContent()}
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>

                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="border-accent/50 text-accent hover:bg-accent/10 font-varien bg-transparent"
                                        onClick={() => handleOpenActiveJobChat(job)}
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                        <span className="sr-only">Message Employer</span>
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-background via-background/95 to-accent/5 border border-accent/20">
                                      <DialogHeader>
                                        <DialogTitle className="font-varien text-xl tracking-wider">
                                          Message {selectedActiveJobEmployer?.name}
                                        </DialogTitle>
                                        <DialogDescription className="font-varela">
                                          Send a direct message to your employer about this active job.
                                        </DialogDescription>
                                      </DialogHeader>

                                      <div className="space-y-4">
                                        {/* Messages Container */}
                                        <ChatMessageComponent
                                          messages={activeJobChatMessages}
                                          currentUserAddress={address || ""}
                                          otherPartyName={selectedActiveJobEmployer?.name || ""}
                                          otherPartyAddress={selectedActiveJobEmployer?.address || ""}
                                          isLoading={isLoadingActiveJobMessages}
                                          containerClass="active-job-chat-messages-container"
                                        />

                                        {/* Message Input */}
                                        <div className="flex gap-2">
                                          <Textarea
                                            placeholder="Type your message here..."
                                            value={newActiveJobChatMessage}
                                            onChange={(e) => setNewActiveJobChatMessage(e.target.value)}
                                            className="min-h-[80px] border-accent/30 focus:border-accent font-varela"
                                            disabled={isSendingActiveJobMessage}
                                          />
                                          <Button
                                            className="self-end bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                                            onClick={handleSendActiveJobChatMessage}
                                            disabled={!newActiveJobChatMessage.trim() || isSendingActiveJobMessage}
                                          >
                                            {isSendingActiveJobMessage ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Send className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>

                                      <DialogFooter>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedActiveJobEmployer(null)
                                            setActiveJobChatMessages([])
                                            setNewActiveJobChatMessage("")
                                          }}
                                          className="font-varien"
                                        >
                                          Close
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </div>
                          </InteractiveCard>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Briefcase className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2 font-varien">No active jobs</h3>
                        <p className="text-muted-foreground mb-6 font-varela">
                          You don't have any active jobs at the moment.
                        </p>
                        <Button asChild className="bg-accent hover:bg-accent-hover text-accent-foreground font-varien">
                          <Link href="/jobs">
                            Find Jobs
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>

                  <PaginationControls
                    currentPage={myJobsCurrentPage}
                    setCurrentPage={setMyJobsCurrentPage}
                    pageInput={myJobsPageInput}
                    setPageInput={setMyJobsPageInput}
                    totalItems={myJobs.length}
                    itemsPerPage={itemsPerPage}
                    itemName="jobs"
                  />
                </>
              )
            })()}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            {(() => {
              // Sort applications by applied date (newest first)
              const sortedApplications = [...myApplications].sort(
                (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
              )
              const startIndex = (applicationsCurrentPage - 1) * itemsPerPage
              const endIndex = startIndex + itemsPerPage
              const currentApplications = sortedApplications.slice(startIndex, endIndex)

              return (
                <>
                  <div className="grid grid-cols-1 gap-6">
                    {currentApplications.length > 0 ? (
                      currentApplications.map((application, i) => (
                        <motion.div
                          key={application.jobAddress}
                          variants={fadeIn(i * 0.1)}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: i * 0.1 }}
                        >
                          <InteractiveCard>
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-varien text-lg font-normal tracking-wider text-foreground">
                                      {application.jobTitle}
                                    </h3>
                                    <Badge
                                      className={
                                        application.status === "pending"
                                          ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-varela"
                                          : application.status === "hired"
                                            ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 font-varela"
                                            : "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 font-varela"
                                      }
                                      variant="outline"
                                    >
                                      {application.status === "pending"
                                        ? "Pending"
                                        : application.status === "hired"
                                          ? "Hired"
                                          : "Rejected"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground font-varela">{application.employer}</p>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-accent" />
                                  <div>
                                    <p className="font-medium text-foreground font-varela">
                                      Applied on {application.appliedAt}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                  <p className="font-medium text-foreground mb-1 font-varela">Your application:</p>
                                  <p className="line-clamp-2 font-varela">{application.application}</p>
                                </div>

                                {application.status === "rejected" && application.feedback && (
                                  <div className="text-sm border-l-2 border-red-500 pl-3 py-1">
                                    <p className="font-medium text-foreground mb-1 font-varela">Feedback:</p>
                                    <p className="text-muted-foreground font-varela">{application.feedback}</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-start md:items-end gap-3 mt-4 md:mt-0">
                                {application.status === "pending" && (
                                  <Button
                                    variant="outline"
                                    disabled={withdrawState !== "idle"}
                                    className={`font-varien ${
                                      withdrawState === "success"
                                        ? "bg-gray-500 hover:bg-gray-600 text-white"
                                        : "border-red-500/50 text-red-500 hover:bg-red-500/10"
                                    }`}
                                    onClick={() => handleWithdrawApplication(application.jobAddress)}
                                  >
                                    {getWithdrawButtonContent()}
                                  </Button>
                                )}
                                {application.status === "hired" && (
                                  <Button className="bg-accent hover:bg-accent-hover text-accent-foreground font-varien">
                                    <Briefcase className="mr-1 h-4 w-4" />
                                    View Job Details
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  className="border-accent/50 text-accent hover:bg-accent/10 font-varien bg-transparent"
                                >
                                  <MessageSquare className="mr-1 h-4 w-4" />
                                  Message Employer
                                </Button>
                              </div>
                            </div>
                          </InteractiveCard>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Clock3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2 font-varien">No applications</h3>
                        <p className="text-muted-foreground mb-6 font-varela">You haven't applied to any jobs yet.</p>
                        <Button asChild className="bg-accent hover:bg-accent-hover text-accent-foreground font-varien">
                          <Link href="/jobs">
                            Browse Jobs
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>

                  <PaginationControls
                    currentPage={applicationsCurrentPage}
                    setCurrentPage={setApplicationsCurrentPage}
                    pageInput={applicationsPageInput}
                    setPageInput={setApplicationsPageInput}
                    totalItems={sortedApplications.length}
                    itemsPerPage={itemsPerPage}
                    itemName="applications"
                  />
                </>
              )
            })()}
          </TabsContent>
        </Tabs>
      </SectionWrapper>
    </div>
  )
}
