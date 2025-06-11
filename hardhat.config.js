// hardhat.config.js

require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");        // ← added Hardhat-Verify plugin

/**
 * Make sure to create a `.env` file in your project root, containing:
 *
 *   KASPA_TESTNET_RPC=<your Kaspa testnet RPC URL>
 *   PRIVATE_KEY=<0x... your deployer private key ...>
 *   BLOCKSCOUT_API_KEY=<any-non-empty-string, e.g. "abc">
 *
 * (If you already have KASPA_TESTNET_RPC and PRIVATE_KEY in `.env`, just add BLOCKSCOUT_API_KEY.)
 */
const { KASPA_TESTNET_RPC, PRIVATE_KEY, BLOCKSCOUT_API_KEY } = process.env;

// Basic sanity checks—fail early if someone forgot to set these:
if (!KASPA_TESTNET_RPC) {
  throw new Error("❌  Please set KASPA_TESTNET_RPC in your .env");
}
if (!PRIVATE_KEY) {
  throw new Error("❌  Please set PRIVATE_KEY in your .env");
}
if (!BLOCKSCOUT_API_KEY) {
  throw new Error("❌  Please set BLOCKSCOUT_API_KEY (any non-empty value) in your .env");
}

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 50
      }
    }
  },   // ← same as your old config

  networks: {
    kaspaTestnet: {
      url: KASPA_TESTNET_RPC,
      chainId: 167012,              // ← same as before
      accounts: [PRIVATE_KEY],      // ← same as before
    },
    // (You can add other networks here if needed, e.g. mainnet later…)
  },

  // ──────────  VERIFY PLUGIN CONFIGURATION  ──────────

  etherscan: {
    // We add an entry for your `kaspaTestnet` under `apiKey`. BlockScout doesn’t require a “real” key,
    // but Hardhat expects a non‐empty string here.
    apiKey: {
      kaspaTestnet: BLOCKSCOUT_API_KEY,
    },

    // The `customChains` array tells Hardhat exactly:
    //   • “When I say `--network kaspaTestnet`, use this chainId & these Explorer URLs.”
    customChains: [
      {
        network: "kaspaTestnet",     // ← must exactly match the network name above
        chainId: 167012,             // ← same chainId as above
        urls: {
          // ──── REPLACE these two URLs with your actual Kaspa EVM BlockScout endpoints ────
          apiURL:   "https://frontend.kasplextest.xyz/api",
          browserURL:"https://frontend.kasplextest.xyz",
        },
      },
    ],
  },

  // If you prefer to disable Sourcify (optional):
  sourcify: {
    enabled: false,
  },
};
