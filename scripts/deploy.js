const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance (ETH):", hre.ethers.formatEther(balance));

  const disputeDAOAddress = "0x75f4C820A90eE9d87A2F3282d67d20CcE28876F8"; // pre-deployed DAO

  const Factory = await hre.ethers.getContractFactory("JobFactory");
  console.log("JobFactory interface loaded:", Factory.interface.fragments.map(f => f.name || f.type));

  try {
    const deployTx = await Factory.getDeployTransaction(deployer.address, disputeDAOAddress);
    console.log("Raw deploy TX:", deployTx);

    const estimatedGas = await deployer.estimateGas(deployTx);
    console.log("Estimated gas:", estimatedGas.toString());

    deployTx.gasLimit = estimatedGas;

    const sentTx = await deployer.sendTransaction(deployTx);
    console.log("Sent raw TX:", sentTx.hash);

    const receipt = await sentTx.wait();
    console.log("✅ JobFactory deployed at:", receipt.contractAddress);
  } catch (err) {
    console.error("❌ Error during deployment:", err);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Unhandled error:", err);
    process.exit(1);
  });
