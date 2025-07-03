"use client"
import { Button } from "@/components/ui/button"
import type React from "react"
import { useState, useEffect, useRef } from "react"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
  ArrowRight,
  Shield,
  Users,
  Scale,
  Calendar,
  MessageSquare,
  AlertTriangle,
  FileText,
  Vote,
  Clock,
  Gavel,
  Lock,
  Send,
  ThumbsUp,
  ThumbsDown,
  User,
  Briefcase,
  Info,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { InteractiveCard } from "@/components/custom/interactive-card"
import { Balancer } from "react-wrap-balancer"
import { toast } from "sonner"
import { fetchEmployerDisplayName, useUserContext } from "@/context/UserContext"
import { useDisputeControl } from "@/hooks/useDisputeControl"
import { io, Socket } from "socket.io-client";
import { disputeProcessSteps } from "@/constants/constants"

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



export default function DisputesPage() {
  const { wallet, displayName, contracts, myDisputes, myJobs, disputes, setDisputes, sendMessage, provider, setMyDisputes/*, refreshDisputes*/ } = useUserContext()

  const { createDispute, vote } = useDisputeControl()
  const [disputeReason, setDisputeReason] = useState("")
  const [selectedJob, setSelectedJob] = useState("")
  const [activeTab, setActiveTab] = useState("my-disputes")
  const [selectedDispute, setSelectedDispute] = useState<(typeof myDisputes)[0] | null>(null)
  const [selectedJuryDispute, setSelectedJuryDispute] = useState<(typeof disputes)[0] | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [howDisputesWorkOpen, setHowDisputesWorkOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [votingStates, setVotingStates] = useState<Record<number, { isVoting: boolean; isConfirming: boolean }>>({})

  const [isJuror, setIsJuror] = useState(false);
  const [toastDisplayed, setToastDisplayed] = useState(false);
  
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    const checkJurorStatus = async () => {
      if (!contracts?.disputeDAO || !wallet || !provider) return;

      try {
        const jurorStatus = await contracts.disputeDAO.isJuror(wallet);
        setIsJuror(jurorStatus);
      } catch (error) {
        console.error("Error checking juror status:", error);
      }
    };

    checkJurorStatus();
  }, [contracts?.disputeDAO, wallet, provider]);  

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messageContainer = document.querySelector(".messages-container")
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight
    }
  }, [selectedDispute?.messages, selectedJuryDispute?.messages])

  // Check if user has already voted on a dispute
  const hasVotedOnDispute = (disputeId: number) => {
    const votedDisputes = JSON.parse(sessionStorage.getItem("votedDisputes") || "[]")
    return votedDisputes.includes(disputeId)
  }

  // Mark dispute as voted in session storage
  const markDisputeAsVoted = (disputeId: number) => {
    const votedDisputes = JSON.parse(sessionStorage.getItem("votedDisputes") || "[]")
    if (!votedDisputes.includes(disputeId)) {
      votedDisputes.push(disputeId)
      sessionStorage.setItem("votedDisputes", JSON.stringify(votedDisputes))
    }
  }

  // Handle dispute submission
  const handleDisputeSubmit = async () => {
    if (!contracts) {
      toast.error("Please connect your wallet first", {
        duration: 3000,
      })
      return
    }
    // console.log("Dispute submitted for job:", selectedJob, "with reason:", disputeReason)
    try {
      await createDispute(selectedJob, disputeReason)
    } catch (error) {
      console.error("Error creating dispute:", error)
      toast.error("Failed to create dispute. Please try again.", {
        duration: 3000,
      })
    }
    // Reset dispute form
    setDisputeReason("")
    setSelectedJob("")
  }

  // Handle jury vote with confirmation
  const handleJuryVote = async (disputeId: number, voteType: string) => {
    // Check if already voted
    if (hasVotedOnDispute(disputeId)) {
      toast.error("You have already voted on this dispute", {
        duration: 3000,
      })
      return
    }

    // Set voting state
    setVotingStates((prev) => ({
      ...prev,
      [disputeId]: { isVoting: true, isConfirming: false },
    }))

    try {
      // Start confirmation process
      setVotingStates((prev) => ({
        ...prev,
        [disputeId]: { isVoting: true, isConfirming: true },
      }))

      // Call the vote function
      await vote(disputeId, voteType)

      // Mark as voted in session storage only after successful confirmation
      markDisputeAsVoted(disputeId)

      toast.success(`Vote submitted successfully for ${voteType}`, {
        duration: 3000,
      })

      // Reset voting state
      setVotingStates((prev) => ({
        ...prev,
        [disputeId]: { isVoting: false, isConfirming: false },
      }))
    } catch (error) {
      console.error("Error voting:", error)
      toast.error("Failed to submit vote. Please try again.", {
        duration: 3000,
      })

      // Reset voting state on error
      setVotingStates((prev) => ({
        ...prev,
        [disputeId]: { isVoting: false, isConfirming: false },
      }))
    }
  }

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const disputeId = selectedDispute?.id.toString() || selectedJuryDispute?.id.toString() || ""

    // Clear the input immediately
    const messageToSend = newMessage
    setNewMessage("")
    setIsRefreshing(true)

    try {
      // Send the message
      sendMessage(disputeId, messageToSend)

      toast.success("Message sent successfully!", {
        duration: 2000,
      })
    } catch (error) {
      console.error("Error sending message:", error)

      // Restore the message in the input
      setNewMessage(messageToSend)

      toast.error("Failed to send message. Please try again.", {
        duration: 3000,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // WebSocket setup for real-time chat
  useEffect(() => {
    socket.current = io(process.env.NEXT_PUBLIC_SOCKET_API);

    // Join the dispute room when a dispute is selected
    const disputeId = selectedDispute?.id || selectedJuryDispute?.id;
    if (disputeId) {
      socket.current.emit("joinRoom", disputeId);
    }

    socket.current.on("newMessage", async (msg) => {
      const { disputeId, ...message } = msg;

      console.log('Socket New Message', msg)

      if(msg.sender !== wallet.toLowerCase()) {
        const { employer, assignedWorkers } = myDisputes.find((d) => d.id === disputeId) || {};
        const resolvedMessage = {
          sender: message.sender,
          senderName: await fetchEmployerDisplayName(message.sender),
          role:
            msg.sender === employer.address.toLowerCase()
              ? "employer"
              : assignedWorkers.find((assigend: any) => message.sender === assigend.toLowerCase())
                ? "worker"
                : "juror",
          content: message.content,
          timestamp: new Date(message.createdAt).toLocaleString(),
        }
        // Update messages in myDisputes
        setMyDisputes((prev) =>
          prev.map((dispute) =>
            dispute.id === disputeId
              ? { ...dispute, messages: [...(dispute.messages || []), resolvedMessage] }
              : dispute
          )
        );

        setDisputes((prev) =>
          prev.map((dispute) =>
            dispute.id === disputeId
              ? { ...dispute, messages: [...(dispute.messages || []), resolvedMessage] }
              : dispute
          )
        );
      }
    });

    return () => {
      // socket.off("newMessage");
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [selectedDispute?.id, selectedJuryDispute?.id]);  

  // Update selected disputes when main dispute data changes
  useEffect(() => {
    if (selectedDispute && myDisputes) {
      const updatedDispute = myDisputes.find((d) => d.id === selectedDispute.id)
      if (updatedDispute) {
        setSelectedDispute(updatedDispute)
      }
    }
  }, [myDisputes, selectedDispute])

  useEffect(() => {
    if (selectedJuryDispute && disputes) {
      const updatedDispute = disputes.find((d) => d.id === selectedJuryDispute.id)
      if (updatedDispute) {
        setSelectedJuryDispute(updatedDispute)
      }
    }
  }, [disputes, selectedJuryDispute?.id])

  // Get current messages from the selected dispute
  const getCurrentMessages = () => {
    if (selectedDispute) {
      return selectedDispute.messages || []
    }
    if (selectedJuryDispute) {
      return selectedJuryDispute.messages || []
    }
    return []
  }

  const currentMessages = getCurrentMessages()

  const handleTabChange = (tab: string) => {
    if (tab === "jury-duty" && !isJuror) {
      if (!toastDisplayed) {
        setToastDisplayed(true); // Mark the toast as displayed
        toast.error("You are not authorized to access Jury Duty.");
      }
      return;
    }
    setToastDisplayed(false); // Reset the flag when switching to a valid tab
    setActiveTab(tab);
  };


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
            className="font-varien text-[3rem] font-bold tracking-wider sm:text-[2rem] md:text-[2rem] lg:text-[4rem] text-foreground mb-6"
          >
            Dispute <span className="text-accent">Resolution</span>
          </motion.h1>
          <motion.p
            variants={fadeIn(0.2)}
            className="mt-20 max-w-2xl mx-auto text-muted-foreground md:text-lg lg:text-xl"
          >
            <Balancer>
              Fair and transparent conflict resolution through our decentralized DisputeDAO. Our pre-selected jurors
              ensure all parties are treated fairly when disagreements arise.
            </Balancer>
          </motion.p>
        </div>
      </motion.section>

      {/* Action Buttons Section */}
      <SectionWrapper id="actions" padding="py-8 md:py-12">
        <motion.div variants={fadeIn(0.7)} className="text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent-hover text-accent-foreground font-varien">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Open a New Dispute
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle className=" font-varien">Open a New Dispute</DialogTitle>
                  <DialogDescription className="font-varela">
                    Opening a dispute will create a case in the DisputeDAO for resolution by the assigned jurors.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="job-select" className="font-varien">
                      Select Job
                    </Label>
                    <Select value={selectedJob} onValueChange={setSelectedJob}>
                      <SelectTrigger className="border-border focus:border-accent">
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent className="font-varela">
                        {myJobs?.map((job) => {
                          return (
                            <SelectItem key={job.id} value={job.id}>
                              {job.title} - {job.employer}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dispute-reason" className="font-varien">
                      Initial Statement
                    </Label>
                    <Textarea
                      id="dispute-reason"
                      placeholder="Describe the issue in detail. This will be your first message in the dispute thread..."
                      className="min-h-[150px]"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
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
                  <Button variant="outline" onClick={() => setDisputeReason("")} className="font-varien">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                    onClick={handleDisputeSubmit}
                    disabled={!selectedJob || !disputeReason}
                  >
                    <AlertTriangle className="mr-1 h-4 w-4" />
                    Submit Dispute
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={howDisputesWorkOpen} onOpenChange={setHowDisputesWorkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-varien border-accent/30 hover:bg-accent/10">
                  <Info className="mr-2 h-4 w-4" />
                  How Disputes Work
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-varien text-2xl tracking-wider text-center">
                    How <span className="text-accent">Disputes Work</span>
                  </DialogTitle>
                  <DialogDescription className="text-center font-varela">
                    <Balancer>
                      Our DisputeDAO ensures fair outcomes through transparent voting by qualified jurors who review
                      evidence from both parties.
                    </Balancer>
                  </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {disputeProcessSteps.map((step, index) => (
                      <motion.div variants={fadeIn(index * 0.1)} key={step.title} initial="hidden" animate="visible">
                        <InteractiveCard className="h-full text-center">
                          <div className="flex flex-col items-center">
                            <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">{step.icon}</div>
                            <h3 className="font-varien text-lg font-normal tracking-wider mb-2 text-foreground">
                              {step.title}
                            </h3>
                            <p className="text-sm text-muted-foreground font-varela">
                              <Balancer>{step.description}</Balancer>
                            </p>
                          </div>
                        </InteractiveCard>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div variants={fadeIn(0.4)} initial="hidden" animate="visible">
                      <InteractiveCard className="h-full">
                        <div className="flex flex-col items-center text-center p-4">
                          <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                            <Users className="h-8 w-8 text-accent" />
                          </div>
                          <h3 className="font-varien text-lg font-normal tracking-wider mb-2 text-foreground">
                            Pre-Selected Jurors
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            <Balancer>
                              Our DisputeDAO Beta V1 has two pre-selected jurors who review all disputes. This is purely
                              for testing purposes and will be changed at mainnet launch.
                            </Balancer>
                          </p>
                        </div>
                      </InteractiveCard>
                    </motion.div>

                    <motion.div variants={fadeIn(0.5)} initial="hidden" animate="visible">
                      <InteractiveCard className="h-full">
                        <div className="flex flex-col items-center text-center p-4">
                          <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                            <Scale className="h-8 w-8 text-accent" />
                          </div>
                          <h3 className="font-varien text-lg font-normal tracking-wider mb-2 text-foreground">
                            Fair Outcomes
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            <Balancer>
                              Jurors review evidence from both parties and vote independently. The majority decision
                              determines the outcome, which is executed automatically by the smart contract.
                            </Balancer>
                          </p>
                        </div>
                      </InteractiveCard>
                    </motion.div>

                    <motion.div variants={fadeIn(0.6)} initial="hidden" animate="visible">
                      <InteractiveCard className="h-full">
                        <div className="flex flex-col items-center text-center p-4">
                          <div className="p-3 rounded-full bg-accent/10 mb-4 inline-block">
                            <Lock className="h-8 w-8 text-accent" />
                          </div>
                          <h3 className="font-varien text-lg font-normal tracking-wider mb-2 text-foreground">
                            Secure Funds
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            <Balancer>
                              When a dispute is opened, remaining funds in the contract are frozen until resolution.
                              This ensures that funds are distributed according to the jury's decision.
                            </Balancer>
                          </p>
                        </div>
                      </InteractiveCard>
                    </motion.div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>
      </SectionWrapper>

      {/* Disputes Tabs */}
      <SectionWrapper id="disputes" padding="py-8 md:py-12">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="my-disputes" className="text-sm sm:text-base font-varien">
              <Shield className="mr-2 h-4 w-4" />
              My Disputes
            </TabsTrigger>
            <TabsTrigger value="jury-duty" className="text-sm sm:text-base font-varien">
              <Gavel className="mr-2 h-4 w-4" />
              Jury Duty
            </TabsTrigger>
          </TabsList>

          {/* My Disputes Tab */}
          <TabsContent value="my-disputes" className="space-y-6">
            {selectedDispute ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setSelectedDispute(null)} className="font-varien">
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                    Back to Disputes
                  </Button>
                  <Badge
                    className={
                      selectedDispute.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-varela"
                        : selectedDispute.status === "resolved" && selectedDispute.resolution === "in_favor_of_worker"
                          ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/3 font-varela0"
                          : "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 font-varela"
                    }
                    variant="outline"
                  >
                    {selectedDispute.status === "pending"
                      ? "Dispute Pending"
                      : selectedDispute.resolution === "in_favor_of_worker"
                        ? "Resolved in Your Favor"
                        : "Resolved Against You"}
                  </Badge>
                </div>

                <InteractiveCard>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-varien font-normal tracking-wider text-foreground">
                        {selectedDispute.jobTitle}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-accent" />
                        <span className="text-sm text-muted-foreground font-varela">
                          Opened on {new Date(selectedDispute.openedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://effigy.im/a/${selectedDispute.employer.address}.svg`} />
                          <AvatarFallback>
                            <Briefcase className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground font-varela">{selectedDispute.employer.name}</p>
                          <p className="text-xs text-muted-foreground font-varela">Employer</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://effigy.im/a/${selectedDispute.worker.address}.svg`} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground font-varela">{selectedDispute.worker.name}</p>
                          <p className="text-xs text-muted-foreground font-varela">Worker</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-varien text-lg font-normal tracking-wider text-foreground">Dispute Reason</h3>
                      <p className="text-sm text-muted-foreground font-varela">{selectedDispute.reason}</p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-varien text-lg font-normal tracking-wider text-foreground">Voting Status</h3>
                      <div className="flex items-center gap-4 font-varela">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4 text-green-500" />
                          <span>{selectedDispute.votes.for} votes for initiator</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsDown className="h-4 w-4 text-red-500" />
                          <span>{selectedDispute.votes.against} votes against</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-varien text-lg font-normal tracking-wider text-foreground">Messages</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setIsRefreshing(true)
                            try {
                              // if (refreshDisputes) {
                              //   await refreshDisputes()
                              // }
                            } catch (error) {
                              console.error("Manual refresh failed:", error)
                            } finally {
                              setIsRefreshing(false)
                            }
                          }}
                          disabled={isRefreshing}
                          className="text-xs"
                        >
                          {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
                        </Button>
                      </div>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto p-2 messages-container">
                        {currentMessages.map((message: any, index: number) => {
                          const isJuror = message.role === "juror"
                          const isWorker = message.role === "worker"
                          const isEmployer = message.role === "employer"

                          return (
                            <div key={index} className={`flex gap-3 ${isJuror ? "justify-end" : "justify-start"}`}>
                              {!isJuror && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={`https://effigy.im/a/${message.sender}.svg`} />
                                  <AvatarFallback>
                                    {isEmployer ? <Briefcase className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  isJuror
                                    ? "bg-purple-100 dark:bg-purple-900/30 text-foreground border border-purple-200 dark:border-purple-700"
                                    : isWorker
                                      ? "bg-green-100 dark:bg-green-900/30 text-foreground border border-green-200 dark:border-green-700"
                                      : "bg-red-100 dark:bg-red-900/30 text-foreground border border-red-200 dark:border-red-700"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-sm font-varela">
                                    {message.senderName}{" "}
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ml-1 font-varela ${
                                        isJuror
                                          ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                          : isWorker
                                            ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                                            : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                                      }`}
                                    >
                                      {isJuror ? "Juror" : isWorker ? "Worker" : "Employer"}
                                    </Badge>
                                  </span>
                                  <span className="text-xs text-muted-foreground font-varela">{message.timestamp}</span>
                                </div>
                                <p className="text-sm">{message.content}</p>
                              </div>
                              {isJuror && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={`https://effigy.im/a/${message.sender}.svg`} />
                                  <AvatarFallback>
                                    <Gavel className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {selectedDispute.status === "pending" && (
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Type your message here..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="min-h-[80px] font-varela"
                          />
                          <Button
                            className="self-end bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || isRefreshing}
                          >
                            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* <div className="space-y-2">
                      <h3 className="font-varien text-lg font-normal tracking-wider text-foreground">Timeline</h3>
                      <div className="space-y-2">
                        {selectedDispute.timeline.map((item, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                              <span className="text-xs font-medium text-accent font-varela">{index + 1}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground font-varela">
                                {new Date(item.date).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.event}{" "}
                                <Badge variant="outline" className="text-xs ml-1 font-varela">
                                  {item.actor}
                                </Badge>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div> */}
                  </div>
                </InteractiveCard>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {myDisputes.length > 0 ? (
                  myDisputes.map((dispute) => (
                    <motion.div key={dispute.id} variants={fadeIn(0.1)}>
                      <InteractiveCard onClick={() => setSelectedDispute(dispute)}>
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{dispute.jobTitle}</h3>
                                <Badge
                                  className={
                                    dispute.status === "pending"
                                      ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-varela"
                                      : dispute.status === "resolved" && dispute.resolution === "in_favor_of_worker"
                                        ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 font-varela"
                                        : "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 font-varela"
                                  }
                                  variant="outline"
                                >
                                  {dispute.status === "pending"
                                    ? "Dispute Pending"
                                    : dispute.resolution === "in_favor_of_worker"
                                      ? "Resolved in Your Favor"
                                      : "Resolved Against You"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground font-varela">{dispute.employer.name}</p>
                            </div>

                            <div className="flex items-center gap-2 text-sm font-varela">
                              <Calendar className="h-4 w-4 text-accent" />
                              <div>
                                <p className="font-medium text-foreground">
                                  Opened on {new Date(dispute.openedDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium text-foreground mb-1">Reason for dispute:</p>
                              <p>{dispute.reason}</p>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="h-4 w-4 text-green-500" />
                                <span>{dispute.votes.for} votes for</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ThumbsDown className="h-4 w-4 text-red-500" />
                                <span>{dispute.votes.against} votes against</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4 text-accent" />
                                <span>{dispute.messages.length} messages</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-start md:items-end gap-3 mt-4 md:mt-0">
                            <Button className="bg-accent hover:bg-accent-hover text-accent-foreground">
                              <Shield className="mr-1 h-4 w-4" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </InteractiveCard>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Shield className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No disputes yet</h3>
                    <p className="text-muted-foreground mb-6">
                      You haven't opened any disputes. We hope it stays that way! If you encounter issues with a job,
                      you can open a dispute for fair resolution.
                    </p>
                    <Button asChild className="bg-accent hover:bg-accent-hover text-accent-foreground">
                      <Link href="/jobs">
                        View Active Jobs
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Jury Duty Tab */}
          <TabsContent value="jury-duty" className="space-y-6">
            {selectedJuryDispute ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setSelectedJuryDispute(null)}>
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                    Back to Jury Duty
                  </Button>
                  {/* <Badge
                    className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 font-varela"
                    variant="outline"
                  >
                    {selectedJuryDispute.disputeType}
                  </Badge> */}
                </div>

                <InteractiveCard>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground font-varela">
                        {selectedJuryDispute.jobTitle}
                      </h2>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-accent" />
                          <span className="text-sm text-muted-foreground font-varela">
                            Opened on {new Date(selectedJuryDispute.openedDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-accent" />
                          <span className="text-sm text-muted-foreground font-varela">
                            Voting ends on {new Date(selectedJuryDispute.votingEnds).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://effigy.im/a/${selectedJuryDispute.employer.address}.svg`} />
                          <AvatarFallback>
                            <Briefcase className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground font-varela">{selectedJuryDispute.employer.name}</p>
                          <p className="text-xs text-muted-foreground font-varela">Employer</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://effigy.im/a/${selectedJuryDispute.worker.address}.svg`} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground font-varela">{selectedJuryDispute.worker.name}</p>
                          <p className="text-xs text-muted-foreground font-varela">Worker</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-md font-semibold text-foreground font-varela">Dispute Summary</h3>
                      <p className="text-sm text-muted-foreground font-varela">{selectedJuryDispute.description}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-md font-semibold text-foreground">Messages</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setIsRefreshing(true)
                            try {
                              // if (refreshDisputes) {
                              //   await refreshDisputes()
                              // }
                            } catch (error) {
                              console.error("Manual refresh failed:", error)
                            } finally {
                              setIsRefreshing(false)
                            }
                          }}
                          disabled={isRefreshing}
                          className="text-xs"
                        >
                          {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
                        </Button>
                      </div>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto p-2 messages-container">
                        {currentMessages.map((message: any, index: number) => {
                          const isJuror = message.role === "juror"
                          const isWorker = message.role === "worker"
                          const isEmployer = message.role === "employer"

                          return (
                            <div key={index} className={`flex gap-3 ${isJuror ? "justify-end" : "justify-start"}`}>
                              {!isJuror && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={`https://effigy.im/a/${message.sender}.svg`} />
                                  <AvatarFallback>
                                    {isEmployer ? <Briefcase className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  isJuror
                                    ? "bg-purple-100 dark:bg-purple-900/30 text-foreground border border-purple-200 dark:border-purple-700"
                                    : isWorker
                                      ? "bg-green-100 dark:bg-green-900/30 text-foreground border border-green-200 dark:border-green-700"
                                      : "bg-red-100 dark:bg-red-900/30 text-foreground border border-red-200 dark:border-red-700"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-sm font-varela">
                                    {message.senderName}{" "}
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ml-1 font-varela ${
                                        isJuror
                                          ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                          : isWorker
                                            ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                                            : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                                      }`}
                                    >
                                      {isJuror ? "Juror" : isWorker ? "Worker" : "Employer"}
                                    </Badge>
                                  </span>
                                  <span className="text-xs text-muted-foreground font-varela">{message.timestamp}</span>
                                </div>
                                <p className="text-sm">{message.content}</p>
                              </div>
                              {isJuror && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={`https://effigy.im/a/${message.sender}.svg`} />
                                  <AvatarFallback>
                                    <Gavel className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Add your juror comment here..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <Button
                          className="self-end bg-accent hover:bg-accent-hover text-accent-foreground font-varien"
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isRefreshing}
                        >
                          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {!selectedJuryDispute.yourVote && !hasVotedOnDispute(selectedJuryDispute.id) && (
                      <div className="space-y-2">
                        <h3 className="text-md font-semibold text-foreground">Cast Your Vote</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          As a juror, your vote will help determine the outcome of this dispute. Please review all
                          evidence carefully before voting.
                        </p>
                        {votingStates[selectedJuryDispute.id]?.isVoting ? (
                          <Button disabled className="w-full bg-accent/50 text-accent-foreground font-varien">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {votingStates[selectedJuryDispute.id]?.isConfirming
                              ? "Confirming Your Vote..."
                              : "Processing Vote..."}
                          </Button>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-varien text-xs sm:text-sm px-2 sm:px-4"
                              onClick={() => handleJuryVote(selectedJuryDispute.id, "worker")}
                            >
                              <ThumbsUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Vote for Worker</span>
                              <span className="sm:hidden">Worker</span>
                            </Button>
                            <Button
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-varien text-xs sm:text-sm px-2 sm:px-4"
                              onClick={() => handleJuryVote(selectedJuryDispute.id, "employer")}
                            >
                              <ThumbsDown className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Vote for Employer</span>
                              <span className="sm:hidden">Employer</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {(selectedJuryDispute.yourVote || hasVotedOnDispute(selectedJuryDispute.id)) && (
                      <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                        <h3 className="text-md font-semibold text-foreground mb-2">Your Vote</h3>
                        <div className="flex items-center gap-2">
                          {selectedJuryDispute.yourVote === "worker" || hasVotedOnDispute(selectedJuryDispute.id) ? (
                            <>
                              <ThumbsUp className="h-5 w-5 text-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                You voted in favor of the worker
                              </span>
                            </>
                          ) : (
                            <>
                              <ThumbsDown className="h-5 w-5 text-red-500" />
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                You voted in favor of the employer
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </InteractiveCard>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {disputes.length > 0 ? (
                  disputes.map((dispute) => (
                    <motion.div key={dispute.id} variants={fadeIn(0.1)}>
                      <InteractiveCard onClick={() => setSelectedJuryDispute(dispute)}>
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{dispute.jobTitle}</h3>
                                {/* <Badge
                                  className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 font-varela"
                                  variant="outline"
                                >
                                  {dispute.disputeType}
                                </Badge> */}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-accent" />
                                <div>
                                  <p className="font-medium text-foreground font-varela">
                                    Opened: {new Date(dispute.openedDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-accent" />
                                <div>
                                  <p className="font-medium text-foreground font-varela">
                                    Voting ends: {new Date(dispute.votingEnds).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium text-foreground mb-1">Dispute summary:</p>
                              <p className="line-clamp-2 font-varela">{dispute.description}</p>
                            </div>

                            {dispute.yourVote && (
                              <div className="text-sm">
                                <p className="font-medium text-foreground mb-1">Your vote:</p>
                                <Badge
                                  className={
                                    dispute.yourVote === "worker"
                                      ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 font-varela"
                                      : "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 font-varela"
                                  }
                                  variant="outline"
                                >
                                  {dispute.yourVote === "worker" ? "In favor of worker" : "In favor of employer"}
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-start md:items-end gap-3 mt-4 md:mt-0">
                            <Button className="bg-accent hover:bg-accent-hover text-accent-foreground">
                              <FileText className="mr-1 h-4 w-4" />
                              Review Case
                            </Button>

                            {!dispute.yourVote && !hasVotedOnDispute(dispute.id) && (
                              <>
                                {votingStates[dispute.id]?.isVoting ? (
                                  <Button disabled className="w-full bg-accent/50 text-accent-foreground font-varien">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {votingStates[dispute.id]?.isConfirming
                                      ? "Confirming Your Vote..."
                                      : "Processing Vote..."}
                                  </Button>
                                ) : (
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                      variant="outline"
                                      className="border-green-500/50 text-green-500 hover:bg-green-500/10 font-varien text-xs sm:text-sm px-2 sm:px-3"
                                      onClick={() => handleJuryVote(dispute.id, "worker")}
                                    >
                                      <ThumbsUp className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                                      <span className="hidden sm:inline">Vote for Worker</span>
                                      <span className="sm:hidden">Worker</span>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="border-red-500/50 text-red-500 hover:bg-red-500/10 font-varien text-xs sm:text-sm px-2 sm:px-3"
                                      onClick={() => handleJuryVote(dispute.id, "employer")}
                                    >
                                      <ThumbsDown className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                                      <span className="hidden sm:inline">Vote for Employer</span>
                                      <span className="sm:hidden">Employer</span>
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </InteractiveCard>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Gavel className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No jury duty assignments</h3>
                    <p className="text-muted-foreground mb-6">
                      You don't have any active jury duty assignments. Jury members are selected from the pre-defined
                      juror list in the DisputeDAO contract.
                    </p>
                    <Button asChild className="bg-accent hover:bg-accent-hover text-accent-foreground font-varien">
                      <Link href="/dao">
                        Learn About DAO Participation
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SectionWrapper>
    </div>
  )
}
