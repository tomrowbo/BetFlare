import { ethers } from "hardhat";

const RESOLVER = "0xd8B47D970077D6752111dd176Dd0cce558e91445";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Resolving market with account:", deployer.address);

  const resolver = await ethers.getContractAt(
    [
      "function resolve(bytes32) external",
      "function getAllMarketIds() view returns (bytes32[])",
      "function getMarket(bytes32) view returns (string,uint256,uint256,bool,bool,bytes32)",
      "function getCurrentPrice(string) view returns (uint256,uint256)"
    ],
    RESOLVER
  );

  // Get all markets
  const marketIds = await resolver.getAllMarketIds();
  console.log(`\nFound ${marketIds.length} markets\n`);

  // Get current XRP price
  try {
    const [price, timestamp] = await resolver.getCurrentPrice("XRP");
    console.log(`Current XRP Price: $${Number(price) / 100000} (from ${new Date(Number(timestamp) * 1000).toISOString()})\n`);
  } catch (e) {
    console.log("Could not fetch current XRP price\n");
  }

  // Show all markets and their status
  for (const marketId of marketIds) {
    const [symbol, targetPrice, resolutionTime, isAbove, resolved, conditionId] = await resolver.getMarket(marketId);

    console.log(`Market: ${marketId}`);
    console.log(`  Symbol: ${symbol}`);
    console.log(`  Target: ${isAbove ? "above" : "below"} $${Number(targetPrice) / 100000}`);
    console.log(`  Resolution Time: ${new Date(Number(resolutionTime) * 1000).toISOString()}`);
    console.log(`  Resolved: ${resolved}`);
    console.log(`  Condition ID: ${conditionId}`);

    const now = Math.floor(Date.now() / 1000);
    if (!resolved && now >= Number(resolutionTime)) {
      console.log(`  Status: READY TO RESOLVE`);

      console.log(`\n  Resolving...`);
      try {
        const tx = await resolver.resolve(marketId);
        await tx.wait();
        console.log(`  ✅ Market resolved!`);
      } catch (e: any) {
        console.log(`  ❌ Failed to resolve: ${e.message}`);
      }
    } else if (resolved) {
      console.log(`  Status: ALREADY RESOLVED`);
    } else {
      const timeLeft = Number(resolutionTime) - now;
      const hours = Math.floor(timeLeft / 3600);
      const mins = Math.floor((timeLeft % 3600) / 60);
      console.log(`  Status: PENDING (${hours}h ${mins}m remaining)`);
    }
    console.log();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
