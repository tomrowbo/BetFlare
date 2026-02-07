import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  resolver: "0x61c422DF498D1035809AC643273Ac70dbd1c2A96", // NEW fixed resolver
  universalVault: "0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87",
  liquidityRouter: "0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying test market v2 with account:", deployer.address);

  // Resolution in 5 minutes
  const resolutionTime = Math.floor(Date.now() / 1000) + 300;
  const targetPrice = 200000; // $2.00 (below current ~$1.47, so YES should lose)
  const isAbove = true;

  console.log("\nMarket Details:");
  console.log("- Symbol: testXRP (Coston2 FTSO)");
  console.log("- Target: testXRP above $2.00");
  console.log("- Current testXRP: ~$1.47");
  console.log("- Expected outcome: NO wins (price is below target)");
  console.log("- Resolution:", new Date(resolutionTime * 1000).toISOString());

  // 1. Create market in resolver FIRST (pass address(0) as fpmm placeholder)
  console.log("\n1. Creating market in resolver...");
  const resolver = await ethers.getContractAt(
    [
      "function createMarket(string,uint256,uint256,bool,address) returns (bytes32)",
      "function getMarket(bytes32) view returns (string,uint256,uint256,bool,bool,bytes32)"
    ],
    CONTRACTS.resolver
  );

  const tx = await resolver.createMarket(
    "testXRP", // Correct symbol for Coston2!
    targetPrice,
    resolutionTime,
    isAbove,
    ethers.ZeroAddress // Placeholder - will deploy FPMM with condition after
  );
  const receipt = await tx.wait();
  console.log("Market created in resolver");

  // Get market ID and condition ID from event
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

  // Get condition ID from resolver
  const [,,,,,conditionId] = await resolver.getMarket(marketId);
  console.log("Condition ID:", conditionId);

  // 2. Deploy FPMM with the correct condition ID
  console.log("\n2. Deploying FPMM with correct condition...");
  const FPMM = await ethers.getContractFactory("FPMM");
  const fpmm2 = await FPMM.deploy(
    CONTRACTS.conditionalTokens,
    CONTRACTS.usdt,
    conditionId,
    CONTRACTS.universalVault
  );
  await fpmm2.waitForDeployment();
  const fpmm2Address = await fpmm2.getAddress();
  console.log("FPMM deployed to:", fpmm2Address);

  // 3. Configure FPMM with router
  console.log("\n3. Setting router in FPMM...");
  let configTx = await fpmm2.setRouter(CONTRACTS.liquidityRouter);
  await configTx.wait();

  // 4. Register with router
  console.log("\n4. Registering FPMM with router...");
  const router = await ethers.getContractAt(
    ["function registerMarket(address)"],
    CONTRACTS.liquidityRouter
  );
  configTx = await router.registerMarket(fpmm2Address);
  await configTx.wait();

  // 5. Authorize FPMM in vault
  console.log("\n5. Authorizing FPMM for fees...");
  const vault = await ethers.getContractAt(
    ["function authorizeMarket(address,bool)"],
    CONTRACTS.universalVault
  );
  configTx = await vault.authorizeMarket(fpmm2Address, true);
  await configTx.wait();

  // 6. Add initial liquidity
  console.log("\n6. Adding initial liquidity...");
  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
    CONTRACTS.usdt
  );
  const balance = await usdt.balanceOf(deployer.address);
  console.log("USDT0 balance:", ethers.formatUnits(balance, 6));

  const liquidity = balance > ethers.parseUnits("0.1", 6) ? ethers.parseUnits("0.1", 6) : balance / 2n;
  if (liquidity > 0n) {
    configTx = await usdt.approve(fpmm2Address, liquidity);
    await configTx.wait();
    configTx = await fpmm2.addLiquidity(liquidity);
    await configTx.wait();
    console.log(`Added ${ethers.formatUnits(liquidity, 6)} USDT0 liquidity`);
  }

  console.log("\n========== TEST MARKET V2 DEPLOYED ==========");
  console.log("FPMM:", fpmm2Address);
  console.log("Market ID:", marketId);
  console.log("Condition ID:", conditionId);
  console.log("Resolver:", CONTRACTS.resolver);
  console.log("Symbol: testXRP");
  console.log("Target: above $2.00");
  console.log("Current price: ~$1.47 (NO should win)");
  console.log("Resolution in:", "5 minutes");
  console.log("\n>> Update frontend contracts.ts with:");
  console.log(`   fpmmTestV2: '${fpmm2Address}',`);
  console.log(`   resolverV2: '${CONTRACTS.resolver}',`);
  console.log("================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
