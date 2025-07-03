import { FileText, Lock, Users, CheckCircle, AlertTriangle, MessageSquare, Vote, Gavel } from "lucide-react";

export const instructionSteps = [
  {
    icon: <FileText className="h-8 w-8 text-accent" />,
    title: "Create Your Listing",
    description:
      "Define job requirements, payment terms, and duration. All terms are locked in smart contracts.",
  },
  {
    icon: <Lock className="h-8 w-8 text-accent" />,
    title: "Lock Funds",
    description:
      "Deposit KAS tokens into the job contract. Funds are held securely until work completion.",
  },
  {
    icon: <Users className="h-8 w-8 text-accent" />,
    title: "Review Applicants",
    description:
      "Browse worker profiles, check on-chain reputation scores, and select the best candidates.",
  },
  {
    icon: <CheckCircle className="h-8 w-8 text-accent" />,
    title: "Automatic Payments",
    description:
      "Workers get paid automatically based on your predefined schedule. No manual intervention needed.",
  },
];

export const disputeProcessSteps = [
  {
    icon: <AlertTriangle className="h-8 w-8 text-accent" />,
    title: "Open a Dispute",
    description:
      "Either the employer or worker can open a dispute when there's a disagreement. Opening a dispute freezes remaining funds in the contract.",
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-accent" />,
    title: "Submit Evidence & Messages",
    description:
      "Both parties and jurors can post messages to the dispute thread. This creates a transparent record of all communications and evidence.",
  },
  {
    icon: <Vote className="h-8 w-8 text-accent" />,
    title: "Juror Voting",
    description:
      "Our pre-selected jurors review the evidence and vote on the outcome. Each juror casts a vote either supporting or opposing the dispute initiator.",
  },
  {
    icon: <Gavel className="h-8 w-8 text-accent" />,
    title: "Finalization & Resolution",
    description:
      "Once voting concludes, the dispute is finalized. If more votes support the initiator, they win. Otherwise, the other party prevails.",
  },
]