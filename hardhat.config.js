require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.17",
  networks: {
    kaspaTestnet: {
      url: process.env.KASPA_TESTNET_RPC,
      chainId: 12211,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
