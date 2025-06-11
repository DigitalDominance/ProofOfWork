const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance (ETH):", hre.ethers.formatEther(balance));

  // Deploy DisputeDAO
  const DisputeDAOFactory = await hre.ethers.getContractFactory("DisputeDAO");
  const disputeDAO = await DisputeDAOFactory.deploy(deployer.address);
  await disputeDAO.waitForDeployment();
  console.log("✅ DisputeDAO deployed at:", disputeDAO.target);

  // Deploy JobFactory with DisputeDAO address
  const JobFactoryFactory = await hre.ethers.getContractFactory("JobFactory");
  const jobFactory = await JobFactoryFactory.deploy(deployer.address, disputeDAO.target);
  await jobFactory.waitForDeployment();
  console.log("✅ JobFactory deployed at:", jobFactory.target);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Unhandled error:", err);
    process.exit(1);
  });
