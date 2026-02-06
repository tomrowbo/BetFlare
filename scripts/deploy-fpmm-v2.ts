import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  vault: "0xd542B1ab9DD7065CC66ded19CE3dA42d41d8B15C",
  resolver: "0xd8B47D970077D6752111dd176Dd0cce558e91445",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying FPMM v2 (with meta-tx) using account:", deployer.address);

  // 1. Create new condition
  console.log("\n1. Creating new condition...");
  const conditionalTokens = await ethers.getContractAt("ConditionalTokens", CONTRACTS.conditionalTokens);

  const targetPrice = 300000; // $3.00
  // Resolution: Feb 7, 2026 at 19:00 UTC
  const resolutionTime = Math.floor(new Date("2026-02-07T19:00:00Z").getTime() / 1000);
  const isAbove = true;

  const questionId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256", "uint256", "bool", "uint256"],
      ["XRP", targetPrice, resolutionTime, isAbove, Date.now()]
    )
  );

  console.log("Question ID:", questionId);

  const prepareTx = await conditionalTokens.prepareCondition(CONTRACTS.resolver, questionId, 2);
  await prepareTx.wait();
  console.log("Condition prepared!");

  const conditionId = await conditionalTokens.getConditionId(CONTRACTS.resolver, questionId, 2);
  console.log("Condition ID:", conditionId);

  // 2. Deploy new FPMM with EIP-712 support
  console.log("\n2. Deploying FPMM v2 (with gasless trading)...");
  const FPMM = await ethers.getContractFactory("FPMM");
  const fpmm = await FPMM.deploy(
    CONTRACTS.conditionalTokens,
    CONTRACTS.usdt,
    conditionId,
    CONTRACTS.vault
  );
  await fpmm.waitForDeployment();
  const fpmmAddress = await fpmm.getAddress();
  console.log("FPMM v2 deployed to:", fpmmAddress);

  // 3. Authorize FPMM in Vault
  console.log("\n3. Authorizing FPMM in Vault...");
  const vault = await ethers.getContractAt("Vault", CONTRACTS.vault);
  const authTx = await vault.authorizeMarket(fpmmAddress, true);
  await authTx.wait();
  console.log("FPMM authorized!");

  // 4. Add initial liquidity
  console.log("\n4. Adding initial liquidity...");
  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
    CONTRACTS.usdt
  );

  const balance = await usdt.balanceOf(deployer.address);
  console.log("USDT0 balance:", ethers.formatUnits(balance, 6));

  const initialLiquidity = ethers.parseUnits("10", 6); // 10 USDT0

  const approveTx = await usdt.approve(fpmmAddress, initialLiquidity);
  await approveTx.wait();
  console.log("Approved!");

  const liquidityTx = await fpmm.addLiquidity(initialLiquidity);
  await liquidityTx.wait();
  console.log("Liquidity added!");

  // Summary
  console.log("\n========== FPMM V2 DEPLOYED ==========");
  console.log("FPMM Address:", fpmmAddress);
  console.log("Condition ID:", conditionId);
  console.log("Features: EIP-712 gasless trading");
  console.log("Target Price: $3.00");
  console.log("Resolution:", new Date(resolutionTime * 1000).toISOString());
  console.log("Initial Liquidity: 10 USDT0");
  console.log("\n>> Update frontend/src/config/contracts.ts:");
  console.log(`   fpmm: '${fpmmAddress}',`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
