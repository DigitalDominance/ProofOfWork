const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance (ETH):", hre.ethers.formatEther(balance));

  // Deploy DisputeDAO first
  const DisputeDAOFactory = await hre.ethers.getContractFactory("DisputeDAO");
  const disputeDAO = await DisputeDAOFactory.deploy(deployer.address);
  await disputeDAO.waitForDeployment();
  console.log("✅ DisputeDAO deployed at:", await disputeDAO.getAddress());

  // Deploy JobFactory with deployer as admin
  const Factory = await hre.ethers.getContractFactory("JobFactory");
  const jobFactory = await Factory.deploy(deployer.address);
  await jobFactory.waitForDeployment();
  console.log("✅ JobFactory deployed at:", await jobFactory.getAddress());
}

main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exitCode = 1;
});
