// scripts/deploy.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  // If testing and you want to skip on-chain deploys:
  if (process.env.SKIP_DEPLOY === "true") {
    console.log("⚡ SKIP_DEPLOY is true — skipping contract deployment");
    return;
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Fetch and print ETH balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(
    "Deployer balance (ETH):",
    hre.ethers.utils.formatEther(balance)
  );

  // Use the already deployed DisputeDAO
  const disputeDAOAddress =
    "0x75f4C820A90eE9d87A2F3282d67d20CcE28876F8";

  // Load the JobFactory contract factory
  const Factory = await hre.ethers.getContractFactory("JobFactory");
  console.log(
    "JobFactory interface loaded:",
    Factory.interface.fragments.map((f) => f.name || f.type)
  );

  try {
    // Prepare the deployment transaction
    const deployTx = await Factory.getDeployTransaction(
      deployer.address,
      disputeDAOAddress
    );
    console.log("Raw deploy TX:", deployTx);

    // Estimate gas
    const estimatedGas = await deployer.estimateGas(deployTx);
    console.log("Estimated gas:", estimatedGas.toString());

    // Set gas limit and send
    deployTx.gasLimit = estimatedGas;
    const sentTx = await deployer.sendTransaction(deployTx);
    console.log("Sent raw TX:", sentTx.hash);

    // Wait for confirmation
    const receipt = await sentTx.wait();
    console.log("✅ JobFactory deployed at:", receipt.contractAddress);
  } catch (err) {
    console.error("❌ Error during deployment:", err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Unhandled error:", err);
    process.exit(1);
  });
