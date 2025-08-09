// scripts/deploy.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  // Optional: skip deploys on certain dyno boots
  if ((process.env.SKIP_DEPLOY || "false").toLowerCase() === "true") {
    console.log("⚡ SKIP_DEPLOY is true — skipping contract deployment");
    return;
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Print balance (ethers v6 uses BigInt)
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance (ETH):", hre.ethers.formatEther(balance));

  const owner = process.env.OWNER || deployer.address;
  const feeSink = process.env.FEE_SINK;
  const bondTokenAddr = process.env.BOND_TOKEN;
  const redeemFeeBps = Number(process.env.REDEEM_FEE_BPS || 100);

  if (!feeSink) throw new Error("FEE_SINK missing");
  if (!bondTokenAddr) throw new Error("BOND_TOKEN missing");

  // Resolve creation fee in raw units (default: 100 * 10^decimals(BOND_TOKEN))
  let creationFee;
  if (process.env.CREATION_FEE_UNITS) {
    creationFee = BigInt(process.env.CREATION_FEE_UNITS);
  } else {
    const erc20MetaAbi = [ "function decimals() view returns (uint8)" ];
    const bond = new hre.ethers.Contract(bondTokenAddr, erc20MetaAbi, hre.ethers.provider);
    const dec = await bond.decimals();
    creationFee = hre.ethers.parseUnits("100", dec);
  }

  console.log("Owner:", owner);
  console.log("Fee sink:", feeSink);
  console.log("Bond token:", bondTokenAddr);
  console.log("Creation fee (raw units):", creationFee.toString());
  console.log("Redeem fee bps:", redeemFeeBps);

  async function deployFactory(name, args) {
    const Fac = await hre.ethers.getContractFactory(name);
    console.log(`${name} interface loaded:`, Fac.interface.fragments.map(f => f.name || f.type));

    // Prepare raw deploy TX similar to your working pattern
    const deployTx = await Fac.getDeployTransaction(...args);
    console.log(`[DEPLOY] Raw ${name} TX:`, deployTx);

    // Estimate gas and set explicit gasLimit
    const estimatedGas = await deployer.estimateGas(deployTx);
    console.log(`[DEPLOY] Estimated gas for ${name}:`, estimatedGas.toString());
    deployTx.gasLimit = estimatedGas;

    // Broadcast
    const sentTx = await deployer.sendTransaction(deployTx);
    console.log(`[DEPLOY] Sent ${name} TX:`, sentTx.hash);

    // Wait for confirmation
    const receipt = await sentTx.wait();
    console.log(`✅ ${name} deployed at:`, receipt.contractAddress);
    return receipt.contractAddress;
  }

  const ctor = [owner, feeSink, bondTokenAddr, creationFee, redeemFeeBps];
  await deployFactory("BinaryFactory", ctor);
  await deployFactory("CategoricalFactory", ctor);
  await deployFactory("ScalarFactory", ctor);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Unhandled error:", err);
    process.exit(1);
  });
