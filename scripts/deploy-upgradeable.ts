import { ethers, upgrades } from "hardhat";

const EXISTING_CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  resolver: "0xd8B47D970077D6752111dd176Dd0cce558e91445",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying upgradeable system with account:", deployer.address);

  // 1. Deploy UniversalVault (UUPS Proxy)
  console.log("\n1. Deploying UniversalVault (upgradeable)...");
  const UniversalVault = await ethers.getContractFactory("UniversalVault");
  const vault = await upgrades.deployProxy(
    UniversalVault,
    [EXISTING_CONTRACTS.usdt],
    { kind: "uups" }
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("UniversalVault proxy deployed to:", vaultAddress);

  // 2. Deploy LiquidityRouter (UUPS Proxy)
  console.log("\n2. Deploying LiquidityRouter (upgradeable)...");
  const LiquidityRouter = await ethers.getContractFactory("LiquidityRouter");
  const router = await upgrades.deployProxy(
    LiquidityRouter,
    [EXISTING_CONTRACTS.usdt],
    { kind: "uups" }
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("LiquidityRouter proxy deployed to:", routerAddress);

  // 3. Create new condition for XRP market
  console.log("\n3. Creating condition for XRP market...");
  const conditionalTokens = await ethers.getContractAt("ConditionalTokens", EXISTING_CONTRACTS.conditionalTokens);

  const targetPrice = 300000; // $3.00
  const resolutionTime = Math.floor(new Date("2026-02-07T19:00:00Z").getTime() / 1000);
  const isAbove = true;

  const questionId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256", "uint256", "bool", "uint256"],
      ["XRP", targetPrice, resolutionTime, isAbove, Date.now()]
    )
  );

  const prepareTx = await conditionalTokens.prepareCondition(EXISTING_CONTRACTS.resolver, questionId, 2);
  await prepareTx.wait();
  const conditionId = await conditionalTokens.getConditionId(EXISTING_CONTRACTS.resolver, questionId, 2);
  console.log("Condition ID:", conditionId);

  // 4. Deploy FPMM (not upgradeable - per-market contract)
  console.log("\n4. Deploying FPMM...");
  const FPMM = await ethers.getContractFactory("FPMM");
  const fpmm = await FPMM.deploy(
    EXISTING_CONTRACTS.conditionalTokens,
    EXISTING_CONTRACTS.usdt,
    conditionId,
    vaultAddress // fees go to vault
  );
  await fpmm.waitForDeployment();
  const fpmmAddress = await fpmm.getAddress();
  console.log("FPMM deployed to:", fpmmAddress);

  // 5. Configure vault <-> router
  console.log("\n5. Configuring vault and router...");
  let tx = await vault.setRouter(routerAddress);
  await tx.wait();
  console.log("Router set in vault");

  tx = await router.setVault(vaultAddress);
  await tx.wait();
  console.log("Vault set in router");

  // 6. Set router in FPMM
  console.log("\n6. Setting router in FPMM...");
  tx = await fpmm.setRouter(routerAddress);
  await tx.wait();
  console.log("Router set in FPMM");

  // 7. Register FPMM with router
  console.log("\n7. Registering FPMM with router...");
  tx = await router.registerMarket(fpmmAddress);
  await tx.wait();
  console.log("FPMM registered with router");

  // 8. Authorize FPMM in vault for fee collection
  console.log("\n8. Authorizing FPMM for fees...");
  tx = await vault.authorizeMarket(fpmmAddress, true);
  await tx.wait();
  console.log("FPMM authorized");

  // 9. Add initial liquidity
  console.log("\n9. Adding initial liquidity...");
  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
    EXISTING_CONTRACTS.usdt
  );

  const balance = await usdt.balanceOf(deployer.address);
  console.log("USDT0 balance:", ethers.formatUnits(balance, 6));

  // Use smaller amount for testing
  const initialLiquidity = balance > ethers.parseUnits("1", 6)
    ? ethers.parseUnits("1", 6)
    : balance / 2n;

  if (initialLiquidity > 0) {
    tx = await usdt.approve(vaultAddress, initialLiquidity);
    await tx.wait();
    console.log("Approved vault");

    tx = await vault.deposit(initialLiquidity, deployer.address);
    await tx.wait();
    console.log(`Deposited ${ethers.formatUnits(initialLiquidity, 6)} USDT0 to vault -> routed to FPMM`);
  } else {
    console.log("Skipping initial liquidity (insufficient balance)");
  }

  // Summary
  console.log("\n========== DEPLOYMENT COMPLETE ==========");
  console.log("UniversalVault (proxy):", vaultAddress);
  console.log("LiquidityRouter (proxy):", routerAddress);
  console.log("FPMM:", fpmmAddress);
  console.log("Condition ID:", conditionId);
  console.log("USDT0:", EXISTING_CONTRACTS.usdt);
  console.log("ConditionalTokens:", EXISTING_CONTRACTS.conditionalTokens);
  console.log("Resolver:", EXISTING_CONTRACTS.resolver);
  console.log("\n>> Update frontend/src/config/contracts.ts:");
  console.log(`   usdt: '${EXISTING_CONTRACTS.usdt}',`);
  console.log(`   conditionalTokens: '${EXISTING_CONTRACTS.conditionalTokens}',`);
  console.log(`   resolver: '${EXISTING_CONTRACTS.resolver}',`);
  console.log(`   universalVault: '${vaultAddress}',`);
  console.log(`   vault: '${vaultAddress}',`);
  console.log(`   liquidityRouter: '${routerAddress}',`);
  console.log(`   fpmm: '${fpmmAddress}',`);
  console.log("\n>> These contracts are UPGRADEABLE!");
  console.log(">> To upgrade, use: npx hardhat run scripts/upgrade-vault.ts --network coston2");
  console.log("==========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
