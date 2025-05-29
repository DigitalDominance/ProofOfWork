const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Factory = await ethers.getContractFactory("JobFactory");
  const factory = await Factory.deploy(deployer.address);
  await factory.deployed();
  console.log("JobFactory deployed at:", factory.address);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
