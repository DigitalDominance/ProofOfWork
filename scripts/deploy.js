// scripts/deploy-licenses.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(
    "Deployer balance (ETH):",
    hre.ethers.formatEther(balance)
  );

  // 1. Deploy StandardLicense1155
  const Standard = await hre.ethers.getContractFactory("StandardLicense1155");
  console.log(
    "Deploying StandardLicense1155..."
  );
  // Pass an initial base URI—can be empty or e.g. "ipfs://<CID>/{id}.json"
  const standard = await Standard.deploy("https://example.com/metadata/{id}.json");
  await standard.deployed();
  console.log(
    "✅ StandardLicense1155 deployed at:",
    standard.address
  );

  // 2. Deploy ExclusiveLicense721
  const Exclusive = await hre.ethers.getContractFactory("ExclusiveLicense721");
  console.log(
    "Deploying ExclusiveLicense721..."
  );
  // Supply your desired name and symbol
  const exclusive = await Exclusive.deploy("POWExclusiveAssets", "POWEXC");
  await exclusive.deployed();
  console.log(
    "✅ ExclusiveLicense721 deployed at:",
    exclusive.address
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment error:", err);
    process.exit(1);
  });
