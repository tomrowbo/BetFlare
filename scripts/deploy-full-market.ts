import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  ftsoRegistry: "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87", // Correct Coston2 FTSO
  universalVault: "0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87",
  liquidityRouter: "0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Market config - resolves in 2 days
  const symbol = "testXRP"; // Correct Coston2 symbol
  const targetPrice = 300000; // $3.00
  const resolutionTime = Math.floor(Date.now() / 1000) + (2 * 24 * 60 * 60); // 2 days
  const isAbove = true;

  console.log("\n=== MARKET CONFIG ===");
  console.log("Symbol:", symbol);
  console.log("Target: above $" + (targetPrice / 100000));
  console.log("Resolution:", new Date(resolutionTime * 1000).toLocaleTimeString());

  // Check current price
  const ftso = await ethers.getContractAt(
    ["function getCurrentPriceWithDecimals(string) view returns (uint256,uint256,uint256)"],
    CONTRACTS.ftsoRegistry
  );
  const [price, , dec] = await ftso.getCurrentPriceWithDecimals(symbol);
  console.log("Current price: $" + (Number(price) / Math.pow(10, Number(dec))).toFixed(2));
  console.log("Expected outcome:", Number(price) / Math.pow(10, Number(dec)) > targetPrice / 100000 ? "YES wins" : "NO wins");

  // 1. Deploy new FTSOResolver with correct FTSO registry
  console.log("\n1. Deploying FTSOResolver...");
  const FTSOResolver = await ethers.getContractFactory("FTSOResolver");
  const resolver = await FTSOResolver.deploy(CONTRACTS.ftsoRegistry, CONTRACTS.conditionalTokens);
  await resolver.waitForDeployment();
  const resolverAddress = await resolver.getAddress();
  console.log("FTSOResolver:", resolverAddress);

  // 2. Create market in resolver (returns conditionId)
  console.log("\n2. Creating market...");
  const createTx = await resolver.createMarket(symbol, targetPrice, resolutionTime, isAbove);
  const receipt = await createTx.wait();

  // Get marketId and conditionId from event
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

  // Get conditionId (same as marketId in new design)
  const conditionId = marketId;
  console.log("ConditionId:", conditionId);

  // 3. Deploy FPMM with this conditionId
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
  console.log("FPMM linked to resolver");

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
  console.log("FPMM configured with router and vault");

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
    console.log("Added", ethers.formatUnits(liq, 6), "USDT0");
  }

  console.log("\n============ DEPLOYMENT COMPLETE ============");
  console.log("FTSOResolver:", resolverAddress);
  console.log("FPMM:", fpmmAddress);
  console.log("MarketId:", marketId);
  console.log("");
  console.log("Resolution:", new Date(resolutionTime * 1000).toLocaleTimeString());
  console.log("");
  console.log("AUTOMATIC RESOLUTION:");
  console.log("After the deadline, ANYONE can call resolve():");
  console.log(`  const r = await ethers.getContractAt(["function resolve(bytes32)"], "${resolverAddress}");`);
  console.log(`  await r.resolve("${marketId}");`);
  console.log("");
  console.log("The FTSO oracle determines YES/NO based on real testXRP price!");
  console.log("=============================================");
}

main().catch(console.error);
