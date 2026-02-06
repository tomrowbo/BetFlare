import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  fpmm: "0x5D8FC54d9D4e3D24331b0378CC3e6F11487255F6",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Universal Vault system with account:", deployer.address);

  // 1. Deploy UniversalVault
  console.log("\n1. Deploying UniversalVault...");
  const UniversalVault = await ethers.getContractFactory("UniversalVault");
  const vault = await UniversalVault.deploy(CONTRACTS.usdt);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("UniversalVault deployed to:", vaultAddress);

  // 2. Deploy LiquidityRouter
  console.log("\n2. Deploying LiquidityRouter...");
  const LiquidityRouter = await ethers.getContractFactory("LiquidityRouter");
  const router = await LiquidityRouter.deploy(CONTRACTS.usdt);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("LiquidityRouter deployed to:", routerAddress);

  // 3. Configure contracts
  console.log("\n3. Configuring contracts...");

  // Set router in vault
  const setRouterTx = await vault.setRouter(routerAddress);
  await setRouterTx.wait();
  console.log("Router set in vault");

  // Set vault in router
  const setVaultTx = await router.setVault(vaultAddress);
  await setVaultTx.wait();
  console.log("Vault set in router");

  // 4. Register existing FPMM market
  console.log("\n4. Registering existing FPMM market...");
  const registerTx = await router.registerMarket(CONTRACTS.fpmm);
  await registerTx.wait();
  console.log("FPMM registered with router");

  // 5. Authorize FPMM to send fees to vault
  console.log("\n5. Authorizing FPMM for fee collection...");
  const authTx = await vault.authorizeMarket(CONTRACTS.fpmm, true);
  await authTx.wait();
  console.log("FPMM authorized");

  // Summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("UniversalVault:", vaultAddress);
  console.log("LiquidityRouter:", routerAddress);
  console.log("USDT0:", CONTRACTS.usdt);
  console.log("Registered FPMM:", CONTRACTS.fpmm);
  console.log("\n>> Update frontend/src/config/contracts.ts:");
  console.log(`   universalVault: '${vaultAddress}',`);
  console.log(`   liquidityRouter: '${routerAddress}',`);
  console.log("=========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
