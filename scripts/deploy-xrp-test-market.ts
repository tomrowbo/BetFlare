import { ethers } from "hardhat";

// Existing contract addresses
const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  resolver: "0xd8B47D970077D6752111dd176Dd0cce558e91445",
  universalVault: "0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87",
  liquidityRouter: "0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying XRP test market with account:", deployer.address);

  // Feb 7th, 2026 00:15 UK time (GMT/UTC)
  const resolutionTime = Math.floor(new Date("2026-02-07T00:15:00Z").getTime() / 1000);
  const targetPrice = 300000; // $3.00 (5 decimals)
  const isAbove = true;

  console.log("\nMarket Details:");
  console.log("- Target: XRP above $3.00");
  console.log("- Resolution:", new Date(resolutionTime * 1000).toISOString());
  console.log("- Resolution (local):", new Date(resolutionTime * 1000).toLocaleString());

  // 1. Create condition in ConditionalTokens
  console.log("\n1. Creating condition...");
  const conditionalTokens = await ethers.getContractAt("ConditionalTokens", CONTRACTS.conditionalTokens);

  const questionId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256", "uint256", "bool", "uint256"],
      ["XRP", targetPrice, resolutionTime, isAbove, Date.now()]
    )
  );

  const prepareTx = await conditionalTokens.prepareCondition(CONTRACTS.resolver, questionId, 2);
  await prepareTx.wait();
  const conditionId = await conditionalTokens.getConditionId(CONTRACTS.resolver, questionId, 2);
  console.log("Condition ID:", conditionId);

  // 2. Deploy new FPMM
  console.log("\n2. Deploying FPMM...");
  const FPMM = await ethers.getContractFactory("FPMM");
  const fpmm = await FPMM.deploy(
    CONTRACTS.conditionalTokens,
    CONTRACTS.usdt,
    conditionId,
    CONTRACTS.universalVault // fees go to vault
  );
  await fpmm.waitForDeployment();
  const fpmmAddress = await fpmm.getAddress();
  console.log("FPMM deployed to:", fpmmAddress);

  // 3. Register market with resolver
  console.log("\n3. Registering with FTSOResolver...");
  const resolver = await ethers.getContractAt(
    [
      "function createMarket(string,uint256,uint256,bool,address) returns (bytes32)",
      "function markets(bytes32) view returns (bytes32,bytes32,string,uint256,uint256,bool,bool,address)"
    ],
    CONTRACTS.resolver
  );

  const createMarketTx = await resolver.createMarket(
    "XRP",
    targetPrice,
    resolutionTime,
    isAbove,
    fpmmAddress
  );
  const receipt = await createMarketTx.wait();
  console.log("Market registered with resolver");

  // Get market ID from event
  const iface = new ethers.Interface([
    "event MarketCreated(bytes32 indexed marketId, string symbol, uint256 targetPrice, uint256 resolutionTime, bool isAbove)"
  ]);
  let marketId = "";
  for (const log of receipt?.logs || []) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === "MarketCreated") {
        marketId = parsed.args.marketId;
        break;
      }
    } catch {}
  }
  console.log("Market ID:", marketId);

  // 4. Configure FPMM with router
  console.log("\n4. Setting router in FPMM...");
  let tx = await fpmm.setRouter(CONTRACTS.liquidityRouter);
  await tx.wait();
  console.log("Router set in FPMM");

  // 5. Register FPMM with router
  console.log("\n5. Registering FPMM with router...");
  const router = await ethers.getContractAt(
    ["function registerMarket(address)", "function setVault(address)"],
    CONTRACTS.liquidityRouter
  );
  tx = await router.registerMarket(fpmmAddress);
  await tx.wait();
  console.log("FPMM registered with router");

  // 6. Authorize FPMM in vault
  console.log("\n6. Authorizing FPMM for fees...");
  const vault = await ethers.getContractAt(
    ["function authorizeMarket(address,bool)"],
    CONTRACTS.universalVault
  );
  tx = await vault.authorizeMarket(fpmmAddress, true);
  await tx.wait();
  console.log("FPMM authorized");

  // 7. Add initial liquidity
  console.log("\n7. Adding initial liquidity...");
  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
    CONTRACTS.usdt
  );

  const balance = await usdt.balanceOf(deployer.address);
  console.log("USDT0 balance:", ethers.formatUnits(balance, 6));

  const initialLiquidity = balance > ethers.parseUnits("0.5", 6)
    ? ethers.parseUnits("0.5", 6)
    : balance / 2n;

  if (initialLiquidity > 0) {
    tx = await usdt.approve(fpmmAddress, initialLiquidity);
    await tx.wait();
    tx = await fpmm.addLiquidity(initialLiquidity);
    await tx.wait();
    console.log(`Added ${ethers.formatUnits(initialLiquidity, 6)} USDT0 liquidity to FPMM`);
  }

  // Summary
  console.log("\n========== XRP TEST MARKET DEPLOYED ==========");
  console.log("FPMM:", fpmmAddress);
  console.log("Market ID:", marketId);
  console.log("Condition ID:", conditionId);
  console.log("Target: XRP > $3.00");
  console.log("Resolution: Feb 7, 2026 00:15 UTC (UK time)");
  console.log("\n>> Update frontend/src/config/contracts.ts:");
  console.log(`   fpmm: '${fpmmAddress}',`);
  console.log("\n>> To resolve after 00:15:");
  console.log(`   npx hardhat run scripts/resolve-market.ts --network coston2`);
  console.log("================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
