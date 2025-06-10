```js
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");

const { KASPA_TESTNET_RPC, PRIVATE_KEY, BLOCKSCOUT_API_KEY } = process.env;

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
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },

  networks: {
    kaspaTestnet: {
      url: KASPA_TESTNET_RPC,
      chainId: 167012,
      accounts: [PRIVATE_KEY]
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
          apiURL:    "https://frontend.kasplextest.xyz/api",
          browserURL:"https://frontend.kasplextest.xyz"
        }
      }
    ]
  },

  sourcify: {
    enabled: false
  }
};
```
