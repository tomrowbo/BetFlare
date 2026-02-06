import { ethers } from "hardhat";

// Update these addresses after deployment
const ADDRESSES = {
  usdt: "",
  conditionalTokens: "",
  vault: "",
  resolver: "",
  factory: "",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Creating XRP market with account:", deployer.address);

  // Get contracts
  const usdt = await ethers.getContractAt("MockUSDT", ADDRESSES.usdt);
  const factory = await ethers.getContractAt("MarketFactory", ADDRESSES.factory);
  const vault = await ethers.getContractAt("Vault", ADDRESSES.vault);

  // Mint some USDT for liquidity
  console.log("\n1. Minting USDT for initial liquidity...");
  const initialLiquidity = ethers.parseUnits("1000", 6); // 1000 USDT
  await usdt.mint(deployer.address, initialLiquidity);
  console.log("Minted 1000 USDT");

  // Approve factory
  console.log("\n2. Approving factory to spend USDT...");
  await usdt.approve(ADDRESSES.factory, initialLiquidity);
  console.log("Approved");

  // Create XRP market
  // Target: XRP above $3.00 by end of hackathon
  // Price is in 5 decimals, so $3.00 = 300000
  console.log("\n3. Creating XRP prediction market...");
  const targetPrice = 300000; // $3.00
  const resolutionTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const isAbove = true; // "Will XRP be above $3.00?"

  const tx = await factory.createXRPMarket(
    targetPrice,
    resolutionTime,
    isAbove,
    initialLiquidity
  );
  const receipt = await tx.wait();

  // Find the market address from events
  const event = receipt?.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed?.name === "MarketCreated";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = factory.interface.parseLog(event);
    console.log("\n========== MARKET CREATED ==========");
    console.log("FPMM Address:", parsed?.args?.fpmm);
    console.log("Market ID:", parsed?.args?.marketId);
    console.log("Target Price: $", targetPrice / 100000);
    console.log("Resolution Time:", new Date(resolutionTime * 1000).toISOString());
    console.log("Bet Type:", isAbove ? "XRP ABOVE target" : "XRP BELOW target");
    console.log("=====================================\n");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
