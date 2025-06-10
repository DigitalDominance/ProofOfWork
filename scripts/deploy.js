const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("JobFactory");
  console.log("Contract factory loaded:", Factory.interface.fragments.map(f => f.name || f.type));

  const factory = await Factory.deploy(deployer.address);
  const tx = factory.deploymentTransaction();
  console.log("Deployment TX hash:", tx.hash);

  await factory.waitForDeployment();
  console.log("JobFactory deployed at:", factory.target);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Deployment error:", err);
    process.exit(1);
  });
