"use client"

import type React from "react"
// Removed useEffect and initializeWeb3Modal import
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { wagmiConfig } from "@/lib/web3modal-config"

const queryClient = new QueryClient()

export function Web3Provider({ children, initialState }: { children: React.ReactNode; initialState?: any }) {
  // Removed the useEffect for initializeWeb3Modal
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
