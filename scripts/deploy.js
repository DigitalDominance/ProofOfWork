// scripts/deploy.js

const hre = require("hardhat");

async function main() {
  // 1) Get the deployer signer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 2) Get contract factory for "JobFactory"
  const Factory = await hre.ethers.getContractFactory("JobFactory");

  // 3) Deploy the contract, passing the deployer's address into its constructor
  const factory = await Factory.deploy(deployer.address);

  // 4) WAIT for the transaction to be mined and the contract to be on-chain
  await factory.waitForDeployment();

  console.log("JobFactory deployed at:", factory.target);
  // In Ethers v6, `factory.target` is the contract address
  // (Equivalent to v5's `factory.address`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
