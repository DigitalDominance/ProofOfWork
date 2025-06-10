require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");

const { KASPA_TESTNET_RPC, PRIVATE_KEY, BLOCKSCOUT_API_KEY } = process.env;
if (!KASPA_TESTNET_RPC || !PRIVATE_KEY || !BLOCKSCOUT_API_KEY) {
  throw new Error("❌ Please set KASPA_TESTNET_RPC, PRIVATE_KEY and BLOCKSCOUT_API_KEY in your .env");
}

module.exports = {
  solidity: "0.8.17",
  defaultNetwork: "kaspaTestnet",
  networks: {
    kaspaTestnet: {
      url: KASPA_TESTNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 167012
    }
  },
  etherscan: {
    apiKey: {
      kaspaTestnet: BLOCKSCOUT_API_KEY
    },
    customChains: [
      {
        network: "kaspaTestnet",
        chainId: 167012,
        urls: {
          apiURL: "https://frontend.kasplextest.xyz/api",
          browserURL: "https://frontend.kasplextest.xyz"
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  }
};
