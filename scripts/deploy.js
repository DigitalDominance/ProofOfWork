const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance (ETH):", hre.ethers.formatEther(balance));

  const Factory = await hre.ethers.getContractFactory("JobFactory");
  console.log("Contract factory loaded:", Factory.interface.fragments.map(f => f.name || f.type));

  try {
    const deployTx = Factory.getDeployTransaction(deployer.address);
    const estimatedGas = await deployer.estimateGas(deployTx);
    console.log("Estimated gas:", estimatedGas.toString());

    const factory = await Factory.deploy(deployer.address);
    const tx = factory.deploymentTransaction();
    console.log("Deployment TX hash:", tx.hash);

    await factory.waitForDeployment();
    console.log("JobFactory deployed at:", factory.target);
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
