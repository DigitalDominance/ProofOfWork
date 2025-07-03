import { useState } from "react";
import { ethers } from "ethers";
import { useUserContext } from "../context/UserContext";
import { toast } from "sonner";

export const useDisputeControl = () => {
    const { contracts, provider } = useUserContext(); // Get contracts and provider from UserContext
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createDispute = async (jobAddress: string, reason: string) => {
        const disputeDAOContract = contracts?.disputeDAO; // Get the disputeDAO contract from UserContext

        if (!disputeDAOContract || !provider) {
            setError("DisputeDAO contract or provider is not available.");
            toast.error("DisputeDAO contract or provider is not available.");
            return null;
        }

        if (!reason.trim()) {
            setError("Reason cannot be empty.");
            toast.error("Reason cannot be empty.");
            return null;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Call the createDispute function
            const txPromise = disputeDAOContract.createDispute(
                jobAddress, // Job address
                reason // Reason for the dispute
            );

            // Use toast.promise to handle the transaction
            toast.promise(
                txPromise,
                {
                    loading: "Submitting dispute...",
                    success: "Dispute submitted successfully!",
                    error: "Failed to submit dispute.",
                }
            );

            // Wait for the transaction to be mined
            const tx = await txPromise;
            await tx.wait();

            // Show a success toast message after the transaction is confirmed
            toast.success("Dispute created successfully!");
        } catch (err: any) {
            console.error("Error creating dispute:", err);
            setError(err.message || "An unknown error occurred.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Vote Function
    const vote = async (disputeId: number, vote: string): Promise<void> => {
        const disputeDAOContract = contracts?.disputeDAO;

        if (!disputeDAOContract || !provider) {
            setError("DisputeDAO contract or provider is not available.");
            toast.error("DisputeDAO contract or provider is not available.");
            return;
        }

        if (vote !== "worker" && vote !== "employer") {
            setError("Invalid vote. Must be 'worker' or 'employer'.");
            toast.error("Invalid vote. Must be 'worker' or 'employer'.");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const support = vote === "worker"; // `true` for worker, `false` for employer
            const txPromise = disputeDAOContract.vote(disputeId, support);

            toast.promise(
                txPromise,
                {
                    loading: `Casting your vote for ${vote}...`,
                    success: `Vote for ${vote} submitted successfully!`,
                    error: `Failed to submit vote for ${vote}.`,
                }
            );

            const tx = await txPromise;
            await tx.wait();

            toast.success(`You voted for ${vote} successfully!`);
        } catch (err: any) {
            console.error("Error voting on dispute:", err);
            setError(err.message || "An unknown error occurred.");
            toast.error(err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createDispute,
        vote,
        isLoading,
        error,
    };
};