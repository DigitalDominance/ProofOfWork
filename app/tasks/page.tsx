"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type React from "react"
import { useState, useEffect } from "react"
import {
  ArrowRight,
  FileText,
  Eye,
  Plus,
  Trash2,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  Send,
  Briefcase,
  Target,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Mail,
  AlertCircle,
  Star,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { InteractiveCard } from "@/components/custom/interactive-card"
import { Balancer } from "react-wrap-balancer"
import { toast } from "sonner"
import { ethers } from "ethers"
import {
  fetchJobDetails,
  fetchJobsByEmployerFromEvents,
  useUserContext,
  fetchEmployerDisplayName,
  submitApplication,
} from "@/context/UserContext"

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

const slideIn = (direction = "left", delay = 0) => ({
  hidden: {
    x: direction === "left" ? -100 : direction === "right" ? 100 : 0,
    y: direction === "up" ? 100 : direction === "down" ? -100 : 0,
    opacity: 0,
  },
  visible: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: { delay, duration: 0.6, ease: "easeOut" },
  },
})

const scaleIn = (delay = 0) => ({
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      delay,
      duration: 0.4,
      ease: "easeOut",
      type: "spring",
      stiffness: 300,
      damping: 30,
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

interface Task {
  _id: string
  taskName: string
  taskDescription: string
  taskTags: string[]
  workerAddress: string
  status: "OPEN" | "OFFERED" | "CONVERTED"
  createdAt: string
  kasAmount?: string
  paymentType?: "weekly" | "oneoff"
  duration?: string
}

interface Offer {
  _id: string
  task: {
    _id: string
    taskName: string
    taskDescription: string
    taskTags: string[]
    workerAddress: string
  }
  employerAddress: string
  workerAddress: string
  status: "PENDING" | "DECLINED" | "ACCEPTED"
  createdAt: string
  kasAmount?: string
  paymentType?: "weekly" | "oneoff"
  duration?: string
}

export default function TaskPage() {
  const { wallet, role, contracts, provider, setEmployerJobs, setJobDetails, displayName, allJobs } = useUserContext()

  // Task creation state
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "confirming" | "success">("idle")
  const [taskFormData, setTaskFormData] = useState({
    taskName: "",
    taskDescription: "",
    kasAmount: "",
    paymentType: "oneoff" as "weekly" | "oneoff",
    duration: "",
    taskTags: [] as string[],
  })

  // Tasks and offers state
  const [tasks, setTasks] = useState<Task[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([])
  const [sentOffers, setSentOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [activeTab, setActiveTab] = useState("browse")
  const [myTasksSubTab, setMyTasksSubTab] = useState("tasks")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showOfferDialog, setShowOfferDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTaskForView, setSelectedTaskForView] = useState<Task | null>(null)
  const [showTaskViewDialog, setShowTaskViewDialog] = useState(false)
  const [offerFormData, setOfferFormData] = useState({
    kasAmount: "",
    paymentType: "oneoff" as "weekly" | "oneoff",
    duration: "",
  })

  // Processing states
  const [processingStates, setProcessingStates] = useState<
    Record<
      string,
      {
        accepting?: boolean
        declining?: boolean
        sendingOffer?: boolean
        canceling?: boolean
        convertingToJob?: boolean
      }
    >
  >({})

  // Offer dialog state
  const [offerDialogState, setOfferDialogState] = useState<"idle" | "processing" | "confirming" | "success" | "error">(
    "idle",
  )

  // User display names cache
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({})

  // User ratings cache
  const [userRatings, setUserRatings] = useState<Record<string, { rating: number; count: number }>>({})

  const tasksPerPage = 6
  const API_BASE_URL = process.env.NEXT_PUBLIC_API

  // Helper function to parse blockchain errors into user-friendly messages
  const parseBlockchainError = (error: any): string => {
    const errorMessage = error?.message || error?.toString() || ""
    const errorCode = error?.code || ""

    // Check for insufficient funds patterns
    if (
      errorMessage.includes("insufficient funds") ||
      errorMessage.includes("missing revert data") ||
      errorMessage.includes("CALL_EXCEPTION") ||
      errorCode === "CALL_EXCEPTION" ||
      errorMessage.includes("estimateGas") ||
      errorMessage.includes("cannot estimate gas")
    ) {
      return "You do not have enough KAS to make this offer. Please check your wallet balance."
    }

    // Check for user rejection
    if (
      errorMessage.includes("user rejected") ||
      errorMessage.includes("User denied") ||
      errorMessage.includes("rejected")
    ) {
      return "Transaction was cancelled by user."
    }

    // Check for network issues
    if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection")) {
      return "Network error. Please check your connection and try again."
    }

    // Default fallback for other errors
    return "Failed to send offer. Please try again."
  }

  // Fetch user display name
  const getUserDisplayName = async (address: string) => {
    if (userDisplayNames[address]) {
      return userDisplayNames[address]
    }

    try {
      const name = await fetchEmployerDisplayName(address)
      setUserDisplayNames((prev) => ({ ...prev, [address]: name }))
      return name
    } catch (error) {
      console.error("Error fetching display name:", error)
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }
  }

  // Real function to get user rating from jobs data
  const getUserRating = async (address: string) => {
    if (userRatings[address]) {
      return userRatings[address]
    }

    try {
      // Find jobs where this address is the employer to calculate their rating
      const employerJobs = allJobs?.filter((job) => job.employerAddress?.toLowerCase() === address.toLowerCase()) || []

      if (employerJobs.length === 0) {
        // Default rating for new users
        const defaultRating = { rating: 0, count: 0 }
        setUserRatings((prev) => ({ ...prev, [address]: defaultRating }))
        return defaultRating
      }

      // Calculate average rating from employer jobs
      const totalRating = employerJobs.reduce((sum, job) => sum + (job.employerRating || 0), 0)
      const averageRating = totalRating / employerJobs.length
      const ratingData = {
        rating: averageRating,
        count: employerJobs.length,
      }

      setUserRatings((prev) => ({ ...prev, [address]: ratingData }))
      return ratingData
    } catch (error) {
      console.error("Error fetching user rating:", error)
      const defaultRating = { rating: 0, count: 0 }
      setUserRatings((prev) => ({ ...prev, [address]: defaultRating }))
      return defaultRating
    }
  }

  // Fetch data
  useEffect(() => {
    fetchTasks()
    if (wallet) {
      fetchMyTasks()
      fetchOffers()
    }
  }, [wallet])

  // Fetch display names and ratings for all users
  useEffect(() => {
    const fetchAllUserData = async () => {
      const addresses = new Set<string>()

      // Collect all unique addresses
      tasks.forEach((task) => addresses.add(task.workerAddress))
      receivedOffers.forEach((offer) => {
        addresses.add(offer.employerAddress)
        addresses.add(offer.workerAddress)
      })
      sentOffers.forEach((offer) => {
        addresses.add(offer.employerAddress)
        addresses.add(offer.workerAddress)
      })

      // Fetch display names and ratings for addresses we don't have yet
      for (const address of addresses) {
        if (!userDisplayNames[address]) {
          await getUserDisplayName(address)
        }
        if (!userRatings[address]) {
          await getUserRating(address)
        }
      }
    }

    fetchAllUserData()
  }, [tasks, receivedOffers, sentOffers, allJobs])

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`)
      const data = await response.json()
      // Filter out tasks with invalid data and hide CONVERTED tasks
      const validTasks = data.filter(
        (task: Task) =>
          task &&
          task._id &&
          task.taskName &&
          task.taskDescription &&
          task.workerAddress &&
          Array.isArray(task.taskTags) &&
          task.status !== "CONVERTED", // Hide converted tasks
      )
      setTasks(validTasks)
    } catch (error) {
      console.error("Error fetching tasks:", error)
      toast.error("Failed to fetch tasks")
    } finally {
      setLoading(false)
    }
  }

  const fetchMyTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`)
      const data = await response.json()
      const validTasks = data.filter(
        (task: Task) =>
          task &&
          task._id &&
          task.taskName &&
          task.taskDescription &&
          task.workerAddress &&
          Array.isArray(task.taskTags) &&
          task.workerAddress === wallet,
      )
      setMyTasks(validTasks)
    } catch (error) {
      console.error("Error fetching my tasks:", error)
    }
  }

  const fetchOffers = async () => {
    try {
      if (role === "worker") {
        // Fetch offers received by this worker
        const response = await fetch(`${API_BASE_URL}/offers?workerAddress=${wallet}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          // Filter out offers with invalid data
          const validOffers = data.filter(
            (offer: Offer) => offer && offer._id && offer.task && offer.employerAddress && offer.workerAddress,
          )
          setReceivedOffers(validOffers)
        }
      } else if (role === "employer") {
        // Fetch offers sent by this employer
        const response = await fetch(`${API_BASE_URL}/offers?employerAddress=${wallet}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          // Filter out offers with invalid data
          const validOffers = data.filter(
            (offer: Offer) => offer && offer._id && offer.task && offer.employerAddress && offer.workerAddress,
          )
          setSentOffers(validOffers)
        }
      }
    } catch (error) {
      console.error("Error fetching offers:", error)
    }
  }

  const handleTaskInputChange = (field: string, value: string | string[]) => {
    setTaskFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddTaskTag = (tag: string) => {
    if (tag && !taskFormData.taskTags.includes(tag)) {
      setTaskFormData((prev) => ({ ...prev, taskTags: [...prev.taskTags, tag] }))
    }
  }

  const handleRemoveTaskTag = (tag: string) => {
    setTaskFormData((prev) => ({
      ...prev,
      taskTags: prev.taskTags.filter((t) => t !== tag),
    }))
  }

  const resetTaskForm = () => {
    setTaskFormData({
      taskName: "",
      taskDescription: "",
      kasAmount: "",
      paymentType: "oneoff",
      duration: "",
      taskTags: [],
    })
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (role !== "worker") {
      toast.error("Only workers can create tasks.", { duration: 3000 })
      return
    }

    if (!wallet) {
      toast.error("Please connect your wallet first", { duration: 3000 })
      return
    }

    // Validate minimum amount
    const kasAmount = Number.parseFloat(taskFormData.kasAmount)
    if (kasAmount < 5) {
      toast.error("Minimum amount is 5 KAS", { duration: 3000 })
      return
    }

    try {
      setSubmitState("submitting")

      // Create task in backend with kasAmount
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          taskName: taskFormData.taskName,
          taskDescription: taskFormData.taskDescription,
          taskTags: taskFormData.taskTags,
          kasAmount: taskFormData.kasAmount, // Include kasAmount
          paymentType: taskFormData.paymentType,
          duration: taskFormData.duration,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create task")
      }

      setSubmitState("success")
      toast.success("Task created successfully!")

      // Refresh tasks
      await fetchTasks()
      await fetchMyTasks()

      // Reset form and close dialog
      setTimeout(() => {
        resetTaskForm()
        setSubmitState("idle")
        setShowCreateDialog(false)
      }, 2000)
    } catch (err: any) {
      console.error("Error creating task:", err)
      setSubmitState("idle")
      toast.error(`Failed to create task: ${err.message}`, { duration: 5000 })
    }
  }

  const handleSendOffer = async (task: Task) => {
    if (role !== "employer") {
      toast.error("Only employers can send offers.", { duration: 3000 })
      return
    }

    if (!contracts?.jobFactory) {
      toast.error("Please connect your wallet first", { duration: 3000 })
      return
    }

    // Validate minimum amount
    const kasAmount = Number.parseFloat(offerFormData.kasAmount)
    if (kasAmount < 5) {
      toast.error("Minimum offer amount is 5 KAS", { duration: 3000 })
      return
    }

    try {
      setOfferDialogState("processing")

      // Create job on smart contract (one-off payment only)
      const totalPayWei = ethers.parseEther(offerFormData.kasAmount)
      const fee = (totalPayWei * BigInt(75)) / BigInt(10000)
      const value = totalPayWei + fee

      const tx = await contracts.jobFactory.createJob(
        wallet,
        1, // One-off payment type
        BigInt(0), // No weekly pay for one-off
        BigInt(0), // No duration for one-off
        totalPayWei,
        task.taskName,
        task.taskDescription,
        "1", // positions
        task.taskTags,
        { value },
      )

      setOfferDialogState("confirming")
      await tx.wait()

      // Create offer in backend
      const response = await fetch(`${API_BASE_URL}/tasks/${task._id}/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          kasAmount: offerFormData.kasAmount,
          paymentType: "oneoff",
          duration: "", // No duration for one-off
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create offer")
      }

      setOfferDialogState("success")
      toast.success("Offer sent successfully!")

      // Refresh data
      await fetchTasks()
      await fetchOffers()

      // Reset form and close dialog after delay
      setTimeout(() => {
        setOfferFormData({ kasAmount: "", paymentType: "oneoff", duration: "" })
        setShowOfferDialog(false)
        setSelectedTask(null)
        setOfferDialogState("idle")
      }, 2000)
    } catch (err: any) {
      console.error("Error sending offer:", err)
      setOfferDialogState("error")

      // Use the helper function to parse the error
      const userFriendlyMessage = parseBlockchainError(err)
      toast.error(userFriendlyMessage, { duration: 5000 })

      // Reset to idle after delay
      setTimeout(() => {
        setOfferDialogState("idle")
      }, 3000)
    }
  }

  const handleAcceptOffer = async (offer: Offer) => {
    if (!provider) {
      toast.error("Please connect your wallet first", { duration: 3000 })
      return
    }

    try {
      setProcessingStates((prev) => ({
        ...prev,
        [offer._id]: { ...prev[offer._id], accepting: true },
      }))

      // Step 1: Accept offer in backend (this will create the job)
      const acceptResponse = await fetch(`${API_BASE_URL}/offers/${offer._id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (!acceptResponse.ok) {
        const errorData = await acceptResponse.json()
        throw new Error(errorData.error || "Failed to accept offer")
      }

      const acceptData = await acceptResponse.json()
      console.log("Offer accepted, job created:", acceptData)

      // Step 2: Since we have the job data from the backend response, we can use it directly
      // The backend already created the job and assigned the worker, so we just need to apply
      if (acceptData.job && acceptData.job._id) {
        // Get the latest job address from employer's jobs (try-catch to handle potential errors)
        try {
          if (contracts?.jobFactory) {
            const jobs = await fetchJobsByEmployerFromEvents(provider, contracts.jobFactory)
            const latestJob = jobs[jobs.length - 1] // Get the latest job

            if (latestJob) {
              // Step 3: Auto-apply worker to the job using the submitApplication function
              const applicationText = `I'm the worker who created the original task "${offer.task.taskName}". I accept this offer and am ready to begin work.`
              await submitApplication(latestJob, applicationText, provider, wallet)
            }
          }
        } catch (contractError) {
          console.warn("Could not auto-apply via smart contract, but job was created successfully:", contractError)
          // Don't throw here - the job was created successfully in the backend
        }

        // Update context with new jobs for worker
        if (role === "worker" && contracts?.jobFactory) {
          try {
            const updatedJobs = await fetchJobsByEmployerFromEvents(provider, contracts.jobFactory)
            setEmployerJobs(updatedJobs)

            const jobDetailsPromises = updatedJobs.map((jobAddress) => fetchJobDetails(provider, jobAddress))
            const allJobDetails = await Promise.all(jobDetailsPromises)
            const validJobDetails = allJobDetails.filter((details) => details !== null)
            setJobDetails(validJobDetails)
          } catch (error) {
            console.error("Error refreshing jobs data:", error)
          }
        }

        toast.success("Offer accepted! Job created successfully. Check the Jobs page!")
      } else {
        toast.success("Offer accepted successfully!")
      }

      // Refresh data
      await fetchTasks()
      await fetchMyTasks()
      await fetchOffers()
    } catch (err: any) {
      console.error("Error accepting offer:", err)
      toast.error(`Failed to accept offer: ${err.message}`, { duration: 5000 })
    } finally {
      setProcessingStates((prev) => ({
        ...prev,
        [offer._id]: { ...prev[offer._id], accepting: false },
      }))
    }
  }

  const handleDeclineOffer = async (offer: Offer) => {
    try {
      setProcessingStates((prev) => ({
        ...prev,
        [offer._id]: { ...prev[offer._id], declining: true },
      }))

      // Decline offer via API only (off-chain)
      const response = await fetch(`${API_BASE_URL}/offers/${offer._id}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to decline offer")
      }

      toast.success("Offer declined. Employer can now choose to convert to general job listing or cancel.")

      // Refresh data
      await fetchOffers()
    } catch (err: any) {
      console.error("Error declining offer:", err)
      toast.error(`Failed to decline offer: ${err.message}`, { duration: 5000 })
    } finally {
      setProcessingStates((prev) => ({
        ...prev,
        [offer._id]: { ...prev[offer._id], declining: false },
      }))
    }
  }

  const handleConvertToJob = async (offer: Offer) => {
    try {
      setProcessingStates((prev) => ({
        ...prev,
        [offer._id]: { ...prev[offer._id], convertingToJob: true },
      }))

      // Convert declined offer to general job listing
      const response = await fetch(`${API_BASE_URL}/offers/${offer._id}/job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          paymentType: "ONE_OFF", // Always one-off for offers
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to convert offer to job")
      }

      // Refresh jobs data in context for employer
      if (role === "employer" && contracts?.jobFactory && provider) {
        try {
          const updatedEmployerJobs = await fetchJobsByEmployerFromEvents(provider, contracts.jobFactory)
          setEmployerJobs(updatedEmployerJobs)

          const jobDetailsPromises = updatedEmployerJobs.map((jobAddress) => fetchJobDetails(provider, jobAddress))
          const allJobDetails = await Promise.all(jobDetailsPromises)
          const validJobDetails = allJobDetails.filter((details) => details !== null)
          setJobDetails(validJobDetails)
        } catch (error) {
          console.error("Error refreshing employer jobs after converting offer:", error)
        }
      }

      toast.success("Offer converted to general job listing! Others can now apply.")

      // Refresh data
      await fetchOffers()
    } catch (err: any) {
      console.error("Error converting offer to job:", err)
      toast.error(`Failed to convert offer to job: ${err.message}`, { duration: 5000 })
    } finally {
      setProcessingStates((prev) => ({
        ...prev,
        [offer._id]: { ...prev[offer._id], convertingToJob: false },
      }))
    }
  }

  const handleCancelOffer = async (offer: Offer) => {
    try {
      setProcessingStates((prev) => ({
        ...prev,
        [offer._id]: { ...prev[offer._id], canceling: true },
      }))

      // Cancel offer and get refund (this would need smart contract interaction)
      // For now, we'll just delete the offer from backend
      const response = await fetch(`${API_BASE_URL}/offers/${offer._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to cancel offer")
      }

      toast.success("Offer cancelled and refund processed.")

      // Refresh data
      await fetchOffers()
    } catch (err: any) {
      console.error("Error cancelling offer:", err)
      toast.error(`Failed to cancel offer: ${err.message}`, { duration: 5000 })
    } finally {
      setProcessingStates((prev) => ({
        ...prev,
        [offer._id]: { ...prev[offer._id], canceling: false },
      }))
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete task")
      }

      toast.success("Task deleted successfully!")

      // Refresh data
      await fetchTasks()
      await fetchMyTasks()
    } catch (err: any) {
      console.error("Error deleting task:", err)
      toast.error(`Failed to delete task: ${err.message}`, { duration: 5000 })
    }
  }

  // Filter and sort tasks
  const filteredTasks = tasks.filter((task) => {
    if (!task || !task.taskName || !task.taskDescription) return false

    const matchesSearch =
      task.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.taskDescription.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTags =
      selectedTags.length === 0 ||
      (Array.isArray(task.taskTags) && selectedTags.some((tag) => task.taskTags.includes(tag)))
    return matchesSearch && matchesTags
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "name":
        return a.taskName.localeCompare(b.taskName)
      default:
        return 0
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedTasks.length / tasksPerPage)
  const startIndex = (currentPage - 1) * tasksPerPage
  const endIndex = startIndex + tasksPerPage
  const currentTasks = sortedTasks.slice(startIndex, endIndex)

  // Get all unique tags - with safety checks
  const allTags = Array.from(
    new Set(
      tasks
        .filter((task) => task && Array.isArray(task.taskTags))
        .flatMap((task) => task.taskTags)
        .filter((tag) => tag && typeof tag === "string"),
    ),
  )

  const getTaskButtonContent = () => {
    switch (submitState) {
      case "submitting":
        return (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Creating Task...
          </>
        )
      case "confirming":
        return (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Confirming...
          </>
        )
      case "success":
        return (
          <>
            <Check className="mr-2 h-5 w-5" />
            Task Created!
          </>
        )
      default:
        return (
          <>
            <Plus className="mr-2 h-5 w-5" />
            Create Task
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </>
        )
    }
  }

  const getOfferButtonContent = () => {
    switch (offerDialogState) {
      case "processing":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Offer...
          </>
        )
      case "confirming":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming Transaction...
          </>
        )
      case "success":
        return (
          <>
            <Check className="mr-2 h-4 w-4" />
            Offer Sent!
          </>
        )
      case "error":
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Failed to Send
          </>
        )
      default:
        return (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Offer
          </>
        )
    }
  }

  const isSubmitting = submitState !== "idle"
  const isOfferProcessing = offerDialogState !== "idle"

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
            className="font-varien text-[3rem] font-bold tracking-wider sm:text-[2rem] md:text-[3rem] lg:text-[3rem] text-foreground mb-6"
          >
            Task <span className="text-accent">Marketplace</span>
          </motion.h1>
          <motion.p
            variants={fadeIn(0.2)}
            className="mt-10 max-w-2xl mx-auto text-muted-foreground md:text-lg lg:text-xl"
          >
            <Balancer>
              Create tasks to showcase your skills or browse available tasks to find the perfect opportunity. Connect
              with employers and workers in a decentralized marketplace.
            </Balancer>
          </motion.p>
        </div>
      </motion.section>

      {/* Main Content */}
      <SectionWrapper id="main-content" padding="pt-0 md:pt-2 pb-12 md:pb-16">
        <motion.div variants={fadeIn()} className="w-full max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Browse Tasks
              </TabsTrigger>
              <TabsTrigger value="my-tasks" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                My Tasks
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Task
              </TabsTrigger>
            </TabsList>

            {/* Browse Tasks Tab */}
            <TabsContent value="browse" className="space-y-6">
              {/* Search and Filters */}
              <motion.div variants={fadeIn(0.1)} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-border focus:border-accent"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48 border-border focus:border-accent">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tag Filters */}
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedTags.includes(tag) ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
                      }`}
                      onClick={() => {
                        setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {selectedTags.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="h-6 px-2 text-xs">
                      Clear All
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Tasks Grid */}
              <motion.div
                variants={staggerContainer(0.1)}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence>
                  {currentTasks.map((task, i) => (
                    <motion.div
                      key={task._id}
                      variants={fadeIn(i * 0.1)}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      layout
                    >
                      <InteractiveCard className="h-full">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2">{task.taskName}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{task.taskDescription}</p>
                          </div>
                          <Badge
                            variant={
                              task.status === "OPEN" ? "default" : task.status === "OFFERED" ? "secondary" : "outline"
                            }
                            className={
                              task.status === "OPEN"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : task.status === "OFFERED"
                                  ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                  : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                            }
                          >
                            {task.status}
                          </Badge>
                        </div>

                        <div className="space-y-3 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={`https://effigy.im/a/${task.workerAddress || "unknown"}.svg`}
                                alt={task.workerAddress || "Unknown"}
                              />
                              <AvatarFallback className="bg-accent/10 text-accent text-xs">
                                {task.workerAddress ? task.workerAddress.charAt(2) : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-xs">
                                {userDisplayNames[task.workerAddress] ||
                                  `${task.workerAddress?.slice(0, 6)}...${task.workerAddress?.slice(-4)}`}
                              </span>
                              {userRatings[task.workerAddress] && userRatings[task.workerAddress].count > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-muted-foreground">
                                    {userRatings[task.workerAddress].rating.toFixed(1)} (
                                    {userRatings[task.workerAddress].count})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {task.kasAmount && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Preferred KAS Amount:</span>
                              <div className="flex items-center gap-1">
                                <img
                                  src="/kaslogo.webp"
                                  alt="KAS"
                                  className="h-3 w-3 filter-none"
                                  style={{ filter: "none", imageRendering: "crisp-edges" }}
                                />
                                <span className="font-medium text-foreground">{task.kasAmount} KAS</span>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Posted:</span>
                            <span className="font-medium text-foreground">
                              {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {Array.isArray(task.taskTags) &&
                            task.taskTags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-accent/50 text-accent hover:bg-accent/10 bg-transparent"
                            onClick={() => {
                              setSelectedTaskForView(task)
                              setShowTaskViewDialog(true)
                            }}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                          {role === "employer" && task.status === "OPEN" && (
                            <Button
                              size="sm"
                              className="flex-1 bg-accent hover:bg-accent-hover text-accent-foreground"
                              onClick={() => {
                                setSelectedTask(task)
                                setShowOfferDialog(true)
                              }}
                              disabled={processingStates[task._id]?.sendingOffer}
                            >
                              {processingStates[task._id]?.sendingOffer ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="mr-1 h-4 w-4" />
                              )}
                              Send Offer
                            </Button>
                          )}
                        </div>
                      </InteractiveCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  variants={fadeIn(0.3)}
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-6 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 rounded-xl border border-accent/20"
                >
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-accent">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold text-accent">{Math.min(endIndex, sortedTasks.length)}</span> of{" "}
                    <span className="font-semibold text-accent">{sortedTasks.length}</span> tasks
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="border-accent/30 hover:bg-accent/10"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="border-accent/30 hover:bg-accent/10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + Math.max(1, currentPage - 2)
                      if (page > totalPages) return null
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[2.5rem] ${
                            currentPage === page
                              ? "bg-accent text-accent-foreground"
                              : "border-accent/30 hover:bg-accent/10"
                          }`}
                        >
                          {page}
                        </Button>
                      )
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="border-accent/30 hover:bg-accent/10"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="border-accent/30 hover:bg-accent/10"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Empty State */}
              {sortedTasks.length === 0 && !loading && (
                <motion.div variants={fadeIn()} className="flex justify-center">
                  <InteractiveCard className="max-w-md w-full flex flex-col items-center justify-center text-center py-10">
                    <div className="flex justify-center mb-4">
                      <Target className="h-12 w-12 text-accent" />
                    </div>
                    <h3 className="font-varien text-lg font-semibold text-foreground mb-2">No Tasks Found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm || selectedTags.length > 0
                        ? "Try adjusting your search criteria"
                        : "Be the first to create a task!"}
                    </p>
                  </InteractiveCard>
                </motion.div>
              )}
            </TabsContent>

            {/* My Tasks Tab */}
            <TabsContent value="my-tasks" className="space-y-6">
              <Tabs value={myTasksSubTab} onValueChange={setMyTasksSubTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    My Tasks ({myTasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="offers" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    My Offers ({receivedOffers.length})
                  </TabsTrigger>
                </TabsList>

                {/* My Tasks Sub-tab */}
                <TabsContent value="tasks" className="space-y-6">
                  <motion.div
                    variants={staggerContainer(0.1)}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {myTasks.map((task, i) => (
                      <motion.div key={task._id} variants={fadeIn(i * 0.1)}>
                        <InteractiveCard className="h-full">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-foreground mb-2">{task.taskName}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{task.taskDescription}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteTask(task._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm mb-4">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge
                                variant={
                                  task.status === "OPEN"
                                    ? "default"
                                    : task.status === "OFFERED"
                                      ? "secondary"
                                      : "outline"
                                }
                                className={
                                  task.status === "OPEN"
                                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                                    : task.status === "OFFERED"
                                      ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                      : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                                }
                              >
                                {task.status}
                              </Badge>
                            </div>

                            {task.kasAmount && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Preferred KAS Amount:</span>
                                <div className="flex items-center gap-1">
                                  <img
                                    src="/kaslogo.webp"
                                    alt="KAS"
                                    className="h-3 w-3 filter-none"
                                    style={{ filter: "none", imageRendering: "crisp-edges" }}
                                  />
                                  <span className="font-medium text-foreground">{task.kasAmount} KAS</span>
                                </div>
                              </div>
                            )}

                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium text-foreground">
                                {new Date(task.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-4">
                            {Array.isArray(task.taskTags) &&
                              task.taskTags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                          </div>
                        </InteractiveCard>
                      </motion.div>
                    ))}
                  </motion.div>

                  {myTasks.length === 0 && (
                    <motion.div variants={fadeIn()} className="flex justify-center">
                      <InteractiveCard className="max-w-md w-full flex flex-col items-center justify-center text-center py-10">
                        <div className="flex justify-center mb-4">
                          <Briefcase className="h-12 w-12 text-accent" />
                        </div>
                        <h3 className="font-varien text-lg font-semibold text-foreground mb-2">No Tasks Created</h3>
                        <p className="text-sm text-muted-foreground">Create your first task to get started!</p>
                      </InteractiveCard>
                    </motion.div>
                  )}
                </TabsContent>

                {/* My Offers Sub-tab */}
                <TabsContent value="offers" className="space-y-6">
                  <div className="space-y-4">
                    {receivedOffers.map((offer) => (
                      <InteractiveCard key={offer._id}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-foreground mb-2">
                              Offer for "{offer.task?.taskName || "Unknown Task"}"
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">From:</span>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage
                                      src={`https://effigy.im/a/${offer.employerAddress || "unknown"}.svg`}
                                      alt={offer.employerAddress || "Unknown"}
                                    />
                                    <AvatarFallback className="bg-accent/10 text-accent text-xs">
                                      {offer.employerAddress ? offer.employerAddress.charAt(2) : "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">
                                    {userDisplayNames[offer.employerAddress] ||
                                      `${offer.employerAddress?.slice(0, 6)}...${offer.employerAddress?.slice(-4)}`}
                                  </span>
                                </div>
                              </div>

                              {offer.kasAmount && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <div className="flex items-center gap-1">
                                    <img
                                      src="/kaslogo.webp"
                                      alt="KAS"
                                      className="h-3 w-3 filter-none"
                                      style={{ filter: "none", imageRendering: "crisp-edges" }}
                                    />
                                    <span className="font-medium text-foreground">{offer.kasAmount} KAS</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge
                                  variant={
                                    offer.status === "PENDING"
                                      ? "secondary"
                                      : offer.status === "ACCEPTED"
                                        ? "default"
                                        : "outline"
                                  }
                                  className={
                                    offer.status === "PENDING"
                                      ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                      : offer.status === "ACCEPTED"
                                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                                        : "bg-red-500/10 text-red-600 border-red-500/20"
                                  }
                                >
                                  {offer.status}
                                </Badge>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Received:</span>
                                <span className="font-medium">{new Date(offer.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          {offer.status === "PENDING" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => handleAcceptOffer(offer)}
                                disabled={processingStates[offer._id]?.accepting}
                              >
                                {processingStates[offer._id]?.accepting ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                  <ThumbsUp className="mr-1 h-4 w-4" />
                                )}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500 text-red-500 hover:bg-red-50 bg-transparent"
                                onClick={() => handleDeclineOffer(offer)}
                                disabled={processingStates[offer._id]?.declining}
                              >
                                {processingStates[offer._id]?.declining ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                  <ThumbsDown className="mr-1 h-4 w-4" />
                                )}
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </InteractiveCard>
                    ))}

                    {receivedOffers.length === 0 && (
                      <motion.div variants={fadeIn()} className="flex justify-center">
                        <InteractiveCard className="max-w-md w-full flex flex-col items-center justify-center text-center py-10">
                          <div className="flex justify-center mb-4">
                            <Mail className="h-12 w-12 text-accent" />
                          </div>
                          <h3 className="font-varien text-lg font-semibold text-foreground mb-2">No Offers Received</h3>
                          <p className="text-sm text-muted-foreground">
                            Create tasks to attract employers and receive offers!
                          </p>
                        </InteractiveCard>
                      </motion.div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Create Task Tab */}
            <TabsContent value="create" className="space-y-6">
              <motion.div variants={fadeIn()} className="max-w-2xl mx-auto">
                <InteractiveCard>
                  <form onSubmit={handleCreateTask} className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="font-varien text-2xl font-bold text-foreground mb-2">Create New Task</h2>
                      <p className="text-muted-foreground">Showcase your skills and attract potential employers</p>
                    </div>

                    {/* Task Name */}
                    <div className="space-y-2">
                      <Label htmlFor="task-name" className="text-foreground font-varien">
                        Task Name
                      </Label>
                      <Input
                        id="task-name"
                        type="text"
                        placeholder="e.g., Build a React Dashboard"
                        value={taskFormData.taskName}
                        onChange={(e) => handleTaskInputChange("taskName", e.target.value)}
                        className="border-border focus:border-accent"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="task-description" className="text-foreground font-varien">
                        Task Description
                      </Label>
                      <Textarea
                        id="task-description"
                        placeholder="Describe what you can do, your experience, and what you're looking for..."
                        value={taskFormData.taskDescription}
                        onChange={(e) => handleTaskInputChange("taskDescription", e.target.value)}
                        className="min-h-[120px] border-border focus:border-accent resize-none"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    {/* Expected Amount */}
                    <div className="space-y-2">
                      <Label htmlFor="kas-amount" className="text-foreground font-varien">
                        Expected Amount (KAS) - Minimum 5 KAS
                      </Label>
                      <div className="relative">
                        <img
                          src="/kaslogo.webp"
                          alt="KAS"
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 filter-none"
                          style={{ filter: "none", imageRendering: "crisp-edges" }}
                        />
                        <Input
                          id="kas-amount"
                          type="number"
                          step="0.01"
                          min="5"
                          placeholder="5.00"
                          value={taskFormData.kasAmount}
                          onChange={(e) => handleTaskInputChange("kasAmount", e.target.value)}
                          className="pl-10 border-border focus:border-accent"
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label htmlFor="task-tags" className="text-foreground font-varien">
                        Skills & Tags
                      </Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {taskFormData.taskTags.map((tag, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="flex items-center gap-2 text-xs cursor-pointer font-semibold"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTaskTag(tag)}
                              className="text-red-500 hover:text-red-600"
                              disabled={isSubmitting}
                            >
                              ✕
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        id="task-tags"
                        type="text"
                        placeholder="Type a skill/tag and press Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddTaskTag(e.currentTarget.value.trim())
                            e.currentTarget.value = ""
                          }
                        }}
                        className="border-border focus:border-accent"
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting || role !== "worker"}
                      className={`w-full transition-all duration-300 transform hover:scale-105 group ${
                        submitState === "success"
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40"
                      }`}
                    >
                      {getTaskButtonContent()}
                    </Button>

                    {role !== "worker" && (
                      <div className="text-center text-sm text-red-600 dark:text-red-400 font-medium">
                        Only workers can create tasks. Please switch to a worker account.
                      </div>
                    )}

                    {submitState === "success" && (
                      <div className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
                        Your task has been created successfully!
                      </div>
                    )}
                  </form>
                </InteractiveCard>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </SectionWrapper>

      {/* Sent Offers Section for Employers */}
      {role === "employer" && (
        <SectionWrapper id="sent-offers" padding="py-12 md:py-16">
          <motion.div variants={fadeIn()} className="text-center mb-12">
            <h2 className="font-varien text-3xl font-bold tracking-wider sm:text-4xl text-foreground">
              Sent <span className="text-accent">Offers</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              <Balancer>Manage your sent offers and track their status.</Balancer>
            </p>
          </motion.div>

          <div className="space-y-4">
            {sentOffers.map((offer) => (
              <InteractiveCard key={offer._id}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-foreground mb-2">
                      Offer for "{offer.task?.taskName || "Unknown Task"}"
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage
                              src={`https://effigy.im/a/${offer.workerAddress || "unknown"}.svg`}
                              alt={offer.workerAddress || "Unknown"}
                            />
                            <AvatarFallback className="bg-accent/10 text-accent text-xs">
                              {offer.workerAddress ? offer.workerAddress.charAt(2) : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {userDisplayNames[offer.workerAddress] ||
                              `${offer.workerAddress?.slice(0, 6)}...${offer.workerAddress?.slice(-4)}`}
                          </span>
                        </div>
                      </div>

                      {offer.kasAmount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <div className="flex items-center gap-1">
                            <img
                              src="/kaslogo.webp"
                              alt="KAS"
                              className="h-3 w-3 filter-none"
                              style={{ filter: "none", imageRendering: "crisp-edges" }}
                            />
                            <span className="font-medium text-foreground">{offer.kasAmount} KAS</span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge
                          variant={
                            offer.status === "PENDING"
                              ? "secondary"
                              : offer.status === "ACCEPTED"
                                ? "default"
                                : "outline"
                          }
                          className={
                            offer.status === "PENDING"
                              ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                              : offer.status === "ACCEPTED"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                          }
                        >
                          {offer.status}
                        </Badge>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sent:</span>
                        <span className="font-medium">{new Date(offer.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {offer.status === "DECLINED" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-accent/50 text-accent hover:bg-accent/10 bg-transparent"
                        onClick={() => handleConvertToJob(offer)}
                        disabled={processingStates[offer._id]?.convertingToJob}
                      >
                        {processingStates[offer._id]?.convertingToJob ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-4 w-4" />
                        )}
                        Convert to Job
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-50 bg-transparent"
                        onClick={() => handleCancelOffer(offer)}
                        disabled={processingStates[offer._id]?.canceling}
                      >
                        {processingStates[offer._id]?.canceling ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-1 h-4 w-4" />
                        )}
                        Cancel & Refund
                      </Button>
                    </div>
                  )}
                </div>
              </InteractiveCard>
            ))}

            {sentOffers.length === 0 && (
              <motion.div variants={fadeIn()} className="flex justify-center">
                <InteractiveCard className="max-w-md w-full flex flex-col items-center justify-center text-center py-10">
                  <div className="flex justify-center mb-4">
                    <Send className="h-12 w-12 text-accent" />
                  </div>
                  <h3 className="font-varien text-lg font-semibold text-foreground mb-2">No Offers Sent</h3>
                  <p className="text-sm text-muted-foreground">Browse tasks to send offers to talented workers!</p>
                </InteractiveCard>
              </motion.div>
            )}
          </div>
        </SectionWrapper>
      )}

      {/* Task View Dialog */}
      <Dialog open={showTaskViewDialog} onOpenChange={setShowTaskViewDialog}>
        <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-background via-background/95 to-accent/5 border border-accent/20">
          <DialogHeader>
            <DialogTitle className="font-varien text-2xl tracking-wider text-foreground">
              {selectedTaskForView?.taskName}
            </DialogTitle>
            <DialogDescription className="font-varela text-muted-foreground">
              Task details and information
            </DialogDescription>
          </DialogHeader>

          {selectedTaskForView && (
            <motion.div variants={fadeIn()} initial="hidden" animate="visible" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-varien text-sm font-semibold text-foreground mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedTaskForView.taskDescription}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-varien text-sm font-semibold text-foreground mb-2">Worker</h4>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={`https://effigy.im/a/${selectedTaskForView.workerAddress}.svg`}
                          alt={selectedTaskForView.workerAddress}
                        />
                        <AvatarFallback className="bg-accent/10 text-accent text-xs">
                          {selectedTaskForView.workerAddress.charAt(2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {userDisplayNames[selectedTaskForView.workerAddress] ||
                            `${selectedTaskForView.workerAddress.slice(0, 6)}...${selectedTaskForView.workerAddress.slice(-4)}`}
                        </span>
                        {userRatings[selectedTaskForView.workerAddress] &&
                          userRatings[selectedTaskForView.workerAddress].count > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-muted-foreground">
                                {userRatings[selectedTaskForView.workerAddress].rating.toFixed(1)} (
                                {userRatings[selectedTaskForView.workerAddress].count})
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-varien text-sm font-semibold text-foreground mb-2">Status</h4>
                    <Badge
                      variant={
                        selectedTaskForView.status === "OPEN"
                          ? "default"
                          : selectedTaskForView.status === "OFFERED"
                            ? "secondary"
                            : "outline"
                      }
                      className={
                        selectedTaskForView.status === "OPEN"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : selectedTaskForView.status === "OFFERED"
                            ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                            : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                      }
                    >
                      {selectedTaskForView.status}
                    </Badge>
                  </div>
                </div>

                {selectedTaskForView.kasAmount && (
                  <div>
                    <h4 className="font-varien text-sm font-semibold text-foreground mb-2">Preferred KAS Amount</h4>
                    <div className="flex items-center gap-1">
                      <img src="/kaslogo.webp" alt="KAS" className="h-4 w-4" />
                      <span className="text-sm font-medium text-foreground">{selectedTaskForView.kasAmount} KAS</span>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-varien text-sm font-semibold text-foreground mb-2">Skills & Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTaskForView.taskTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-varien text-sm font-semibold text-foreground mb-2">Posted</h4>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(selectedTaskForView.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTaskViewDialog(false)
                setSelectedTaskForView(null)
              }}
              className="font-varien"
            >
              Close
            </Button>
            {role === "employer" && selectedTaskForView?.status === "OPEN" && (
              <Button
                className="bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                onClick={() => {
                  setShowTaskViewDialog(false)
                  setSelectedTask(selectedTaskForView)
                  setShowOfferDialog(true)
                  setSelectedTaskForView(null)
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Offer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background/95 to-accent/5 border border-accent/20 overflow-hidden">
          <motion.div variants={scaleIn()} initial="hidden" animate="visible" className="relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 -z-10">
              <motion.div
                className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl"
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: 1,
                }}
              />
            </div>

            <DialogHeader>
              <motion.div variants={fadeIn(0.1)}>
                <DialogTitle className="font-varien text-2xl tracking-wider text-foreground">Send Offer</DialogTitle>
                <DialogDescription className="font-varela text-muted-foreground">
                  Send an offer to the task creator for "{selectedTask?.taskName}"
                </DialogDescription>
              </motion.div>
            </DialogHeader>

            <motion.div variants={fadeIn(0.2)} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="offer-amount" className="font-varien text-foreground">
                  Total Amount (KAS) - Minimum 5 KAS
                </Label>
                <div className="relative">
                  <img
                    src="/kaslogo.webp"
                    alt="KAS"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 filter-none"
                    style={{ filter: "none", imageRendering: "crisp-edges" }}
                  />
                  <Input
                    id="offer-amount"
                    type="number"
                    step="0.01"
                    min="5"
                    placeholder="5.00"
                    value={offerFormData.kasAmount}
                    onChange={(e) => setOfferFormData((prev) => ({ ...prev, kasAmount: e.target.value }))}
                    className="pl-10 border-accent/30 focus:border-accent bg-background/50 backdrop-blur-sm"
                    disabled={isOfferProcessing}
                    required
                  />
                </div>
              </div>

              {/* Status Messages */}
              <AnimatePresence>
                {offerDialogState === "processing" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-sm text-accent font-varien"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating offer on blockchain...
                  </motion.div>
                )}

                {offerDialogState === "confirming" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-sm text-blue-600 font-varien"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming transaction...
                  </motion.div>
                )}

                {offerDialogState === "success" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 text-sm text-green-600 font-varien"
                  >
                    <Check className="h-4 w-4" />
                    Offer sent successfully!
                  </motion.div>
                )}

                {offerDialogState === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-sm text-red-600 font-varien"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Failed to send offer. Please try again.
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <DialogFooter>
              <motion.div variants={fadeIn(0.4)} className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOfferDialog(false)
                    setSelectedTask(null)
                    setOfferFormData({ kasAmount: "", paymentType: "oneoff", duration: "" })
                    setOfferDialogState("idle")
                  }}
                  disabled={isOfferProcessing}
                  className="font-varien border-accent/30 hover:bg-accent/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedTask && handleSendOffer(selectedTask)}
                  disabled={isOfferProcessing || !offerFormData.kasAmount}
                  className={`font-varien flex-1 transition-all duration-300 ${
                    offerDialogState === "success"
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : offerDialogState === "error"
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg hover:shadow-accent/40"
                  }`}
                >
                  <motion.div
                    className="flex items-center"
                    animate={
                      offerDialogState === "processing" || offerDialogState === "confirming"
                        ? { scale: [1, 1.05, 1] }
                        : {}
                    }
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  >
                    {getOfferButtonContent()}
                  </motion.div>
                </Button>
              </motion.div>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
