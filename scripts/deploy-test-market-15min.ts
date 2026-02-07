import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  ftsoRegistry: "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87",
  universalVault: "0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87",
  liquidityRouter: "0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying test market with:", deployer.address);

  // Market config - resolves in 15 minutes
  const symbol = "testXRP";
  const targetPrice = 250000; // $2.50 - should be easy to hit or miss
  const resolutionTime = Math.floor(Date.now() / 1000) + (15 * 60); // 15 minutes
  const isAbove = true;

  console.log("\n=== TEST MARKET CONFIG ===");
  console.log("Symbol:", symbol);
  console.log("Target: above $" + (targetPrice / 100000));
  console.log("Resolution:", new Date(resolutionTime * 1000).toLocaleString());
  console.log("Resolution Unix:", resolutionTime);

  // Check current price
  const ftso = await ethers.getContractAt(
    ["function getCurrentPriceWithDecimals(string) view returns (uint256,uint256,uint256)"],
    CONTRACTS.ftsoRegistry
  );
  const [price, , dec] = await ftso.getCurrentPriceWithDecimals(symbol);
  const currentPrice = Number(price) / Math.pow(10, Number(dec));
  console.log("Current price: $" + currentPrice.toFixed(4));
  console.log("Expected outcome:", currentPrice > targetPrice / 100000 ? "YES wins" : "NO wins");

  // 1. Deploy new FTSOResolver
  console.log("\n1. Deploying FTSOResolver...");
  const FTSOResolver = await ethers.getContractFactory("FTSOResolver");
  const resolver = await FTSOResolver.deploy(CONTRACTS.ftsoRegistry, CONTRACTS.conditionalTokens);
  await resolver.waitForDeployment();
  const resolverAddress = await resolver.getAddress();
  console.log("FTSOResolver:", resolverAddress);

  // 2. Create market in resolver
  console.log("\n2. Creating market...");
  const createTx = await resolver.createMarket(symbol, targetPrice, resolutionTime, isAbove);
  const receipt = await createTx.wait();

  // Get marketId from event
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
  console.log("MarketId:", marketId);
  const conditionId = marketId;

  // 3. Deploy FPMM
  console.log("\n3. Deploying FPMM...");
  const FPMM = await ethers.getContractFactory("FPMM");
  const fpmm = await FPMM.deploy(
    CONTRACTS.conditionalTokens,
    CONTRACTS.usdt,
    conditionId,
    CONTRACTS.universalVault
  );
  await fpmm.waitForDeployment();
  const fpmmAddress = await fpmm.getAddress();
  console.log("FPMM:", fpmmAddress);

  // 4. Set FPMM in resolver
  console.log("\n4. Setting FPMM in resolver...");
  await (await resolver.setFPMM(marketId, fpmmAddress)).wait();

  // 5. Configure FPMM
  console.log("\n5. Configuring FPMM...");
  await (await fpmm.setRouter(CONTRACTS.liquidityRouter)).wait();

  const router = await ethers.getContractAt(
    ["function registerMarket(address)"],
    CONTRACTS.liquidityRouter
  );
  await (await router.registerMarket(fpmmAddress)).wait();

  const vault = await ethers.getContractAt(
    ["function authorizeMarket(address,bool)"],
    CONTRACTS.universalVault
  );
  await (await vault.authorizeMarket(fpmmAddress, true)).wait();
  console.log("FPMM configured!");

  // 6. Add initial liquidity
  console.log("\n6. Adding liquidity...");
  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256)", "function balanceOf(address) view returns (uint256)"],
    CONTRACTS.usdt
  );
  const bal = await usdt.balanceOf(deployer.address);
  const liq = bal > ethers.parseUnits("0.5", 6) ? ethers.parseUnits("0.5", 6) : bal / 2n;
  if (liq > 0n) {
    await (await usdt.approve(fpmmAddress, liq)).wait();
    await (await fpmm.addLiquidity(liq)).wait();
    console.log("Added", ethers.formatUnits(liq, 6), "USDT");
  }

  // 7. Trigger rebalance to distribute vault liquidity to new market
  console.log("\n7. Rebalancing liquidity...");
  const routerFull = await ethers.getContractAt(
    ["function rebalance()", "function getActiveMarkets() view returns (address[])"],
    CONTRACTS.liquidityRouter
  );
  await (await routerFull.rebalance()).wait();
  const activeMarkets = await routerFull.getActiveMarkets();
  console.log("Rebalanced! Active markets:", activeMarkets.length);

  // Check new market liquidity
  const yesRes = await fpmm.yesReserve();
  const noRes = await fpmm.noReserve();
  console.log("New market liquidity: YES=$" + ethers.formatUnits(yesRes, 6) + " NO=$" + ethers.formatUnits(noRes, 6));

  console.log("\n============ DEPLOYMENT COMPLETE ============");
  console.log("FTSOResolver:", resolverAddress);
  console.log("FPMM:", fpmmAddress);
  console.log("MarketId:", marketId);
  console.log("ConditionId:", conditionId);
  console.log("Resolution Time:", resolutionTime);
  console.log("");
  console.log("ADD TO frontend/src/config/contracts.ts:");
  console.log(`
  {
    slug: 'xrp-above-250-test',
    title: 'Will XRP be above $2.50? (TEST - 15min)',
    description: 'TEST MARKET - Resolves in 15 minutes. YES if testXRP > $2.50.',
    icon: '🧪',
    category: 'Price',
    fpmm: '${fpmmAddress}',
    resolver: '${resolverAddress}',
    marketId: '${marketId}',
    conditionId: '${conditionId}',
    resolutionTime: ${resolutionTime},
    symbol: 'testXRP',
    targetPrice: ${targetPrice},
    isAbove: true,
  },
`);
  console.log("==============================================");
}

main().catch(console.error);
