import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  ftsoRegistry: "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87",
  universalVault: "0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87",
  liquidityRouter: "0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac",
};

// From previous deployment
const resolverAddress = "0x59E69c6A68FBACDF5328f2fF1CEC2C3327675a16";
const marketId = "0x4c2f3df859b5099a66a10fb06a861c97045435baaba219f1f93a0644dd2e2c58";
const conditionId = marketId;
const resolutionTime = 1770476985;
const targetPrice = 150000;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Continuing deployment with:", deployer.address);
  console.log("Resolver:", resolverAddress);
  console.log("MarketId:", marketId);

  const resolver = await ethers.getContractAt("FTSOResolver", resolverAddress);

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

  // 7. Trigger rebalance
  console.log("\n7. Rebalancing liquidity...");
  const routerFull = await ethers.getContractAt(
    ["function rebalance()", "function getActiveMarkets() view returns (address[])"],
    CONTRACTS.liquidityRouter
  );
  await (await routerFull.rebalance()).wait();
  const activeMarkets = await routerFull.getActiveMarkets();
  console.log("Rebalanced! Active markets:", activeMarkets.length);

  const yesRes = await fpmm.yesReserve();
  const noRes = await fpmm.noReserve();
  console.log("Market liquidity: YES=$" + ethers.formatUnits(yesRes, 6) + " NO=$" + ethers.formatUnits(noRes, 6));

  console.log("\n============ DEPLOYMENT COMPLETE ============");
  console.log("FTSOResolver:", resolverAddress);
  console.log("FPMM:", fpmmAddress);
  console.log("MarketId:", marketId);
  console.log("Resolution Time:", resolutionTime);
  console.log("");
  console.log("ADD TO frontend/src/config/contracts.ts:");
  console.log(`
  {
    slug: 'xrp-above-150-30min',
    title: 'Will XRP be above $1.50 in 30 minutes?',
    description: 'Market resolves YES if testXRP price is above $1.50 at resolution time.',
    icon: '⏱️',
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
}

main().catch(console.error);
