const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1) Deploy the StandardLicense1155 (no constructor args)
  const Standard = await hre.ethers.getContractFactory("StandardLicense1155");
  const standard = await Standard.deploy();
  await standard.deployed();
  console.log("✅ StandardLicense1155 deployed at:", standard.address);

  // 2) Deploy the ExclusiveLicense721 (name & symbol required)
  const Exclusive = await hre.ethers.getContractFactory("ExclusiveLicense721");
  const exclusive = await Exclusive.deploy("MyAssetExclusive", "ASSETX");
  await exclusive.deployed();
  console.log("✅ ExclusiveLicense721 deployed at:", exclusive.address);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Deployment error:", err);
    process.exit(1);
  });
