const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance (ETH):", ethers.utils.formatEther(balance));

    const factoryFactory = await ethers.getContractFactory("JobFactory");
    const disputeDAOAddress = "0x75f4C820A90eE9d87A2F3282d67d20CcE28876F8";
    const factory = await factoryFactory.deploy(deployer.address, disputeDAOAddress);
    await factory.deployed();
    console.log("✅ JobFactory deployed at:", factory.address);
}

main().catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exitCode = 1;
});
