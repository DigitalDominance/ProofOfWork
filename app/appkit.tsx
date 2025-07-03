"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, arbitrum } from "@reown/appkit/networks";

// 1. Get projectId at https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID; // "YOUR_PROJECT_ID";

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in .env")
}

const kaspaEVMTestnet = {
    id: 167012, // 167012,
    name: "Kasplex Network Testnet", // "KaspaClassic Mainnet", // "Kasplex Network Testnet",
    nativeCurrency: { name: "Bridged Kas", symbol: "KAS", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.kasplextest.xyz" /*"https://rpc.kasplextest.xyz"*/] },
      public: { http: ["https://rpc.kasplextest.xyz"] },
    },
    blockExplorers: {
      default: { name: "Kasplex L2 Explorer", url: "https://frontend.kasplextest.xyz" },
    },
    testnet: true,
}

// 2. Create a metadata object
const metadata = {
  name: "Kasplex Network Testnet",
  description: "Kasplex Network Testnet",
  url: "https://www.proofofworks.com", // origin must match your domain & subdomain
  icons: ["https://www.proofofworks.com/"],
};

// 3. Create the AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  metadata,
  networks: [kaspaEVMTestnet],
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

export function AppKitProvider({children}: { children: React.ReactNode }) {
  return (
    <>{children}</> //make sure you have configured the <appkit-button> inside
  );
}
