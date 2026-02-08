import { ethers } from "hardhat";

// Contract addresses (Coston2)
const CONTRACTS = {
  flareContractRegistry: "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019",
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  blazeSwapRouter: "0x7Ba34bDCA39C8B6082b0D730C3cD8537F927C9ba",
  universalVault: "0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87",
};

// ABI for FlareContractRegistry
const flareRegistryAbi = [
  {
    inputs: [{ name: "_name", type: "string" }],
    name: "getContractAddressByName",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

// ABI for AssetManager
const assetManagerAbi = [
  {
    inputs: [],
    name: "fAsset",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SwapAndDepositWrapper with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "C2FLR");

  // 1. Get FXRP address from FlareContractRegistry
  console.log("\n1. Getting FXRP address from registry...");
  const registry = new ethers.Contract(CONTRACTS.flareContractRegistry, flareRegistryAbi, deployer);
  const assetManagerAddress = await registry.getContractAddressByName("AssetManagerFXRP");
  console.log("AssetManagerFXRP:", assetManagerAddress);

  const assetManager = new ethers.Contract(assetManagerAddress, assetManagerAbi, deployer);
  const fxrpAddress = await assetManager.fAsset();
  console.log("FXRP Token:", fxrpAddress);

  // 2. Deploy SwapAndDepositWrapper
  console.log("\n2. Deploying SwapAndDepositWrapper...");
  const SwapAndDepositWrapper = await ethers.getContractFactory("SwapAndDepositWrapper");
  const wrapper = await SwapAndDepositWrapper.deploy(
    fxrpAddress,
    CONTRACTS.usdt,
    CONTRACTS.blazeSwapRouter,
    CONTRACTS.universalVault
  );
  await wrapper.waitForDeployment();
  const wrapperAddress = await wrapper.getAddress();
  console.log("SwapAndDepositWrapper deployed to:", wrapperAddress);

  // 3. Verify constructor parameters
  console.log("\n3. Verifying deployment...");
  const deployedFxrp = await wrapper.fxrp();
  const deployedUsdt = await wrapper.usdt();
  const deployedRouter = await wrapper.router();
  const deployedVault = await wrapper.vault();

  console.log("FXRP:", deployedFxrp);
  console.log("USDT:", deployedUsdt);
  console.log("Router:", deployedRouter);
  console.log("Vault:", deployedVault);

  // Summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("SwapAndDepositWrapper:", wrapperAddress);
  console.log("");
  console.log("Constructor params:");
  console.log("  FXRP:", fxrpAddress);
  console.log("  USDT:", CONTRACTS.usdt);
  console.log("  BlazeSwap Router:", CONTRACTS.blazeSwapRouter);
  console.log("  UniversalVault:", CONTRACTS.universalVault);
  console.log("");
  console.log(">> Next step: Run register-wrapper-instruction.ts");
  console.log(">> Update WRAPPER_ADDRESS in that script to:", wrapperAddress);
  console.log("=========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
