import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  vault: "0xd542B1ab9DD7065CC66ded19CE3dA42d41d8B15C",
  resolver: "0xd8B47D970077D6752111dd176Dd0cce558e91445",
  factory: "0xaa59AB7d8A844BEd4717f93da255e6124718A219",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Creating XRP market with account:", deployer.address);

  // Get USDT0 contract
  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
    CONTRACTS.usdt
  );

  // Check USDT0 balance
  const balance = await usdt.balanceOf(deployer.address);
  console.log("USDT0 balance:", ethers.formatUnits(balance, 6));

  // Get factory contract
  const factory = await ethers.getContractAt(
    ["function createXRPMarket(uint256,uint256,bool,uint256) returns (address,bytes32)"],
    CONTRACTS.factory
  );

  // Initial liquidity: 9 USDT0 (leave some for gas)
  const initialLiquidity = ethers.parseUnits("9", 6);

  if (balance < initialLiquidity) {
    console.log("Insufficient USDT0 balance. Need at least 9 USDT0");
    return;
  }

  // Approve factory to spend USDT0
  console.log("\n1. Approving factory to spend USDT0...");
  const approveTx = await usdt.approve(CONTRACTS.factory, initialLiquidity);
  await approveTx.wait();
  console.log("Approved!");

  // Create XRP market
  // Target: XRP above $3.00
  // Resolution: 24 hours from now (for demo, can adjust)
  console.log("\n2. Creating XRP prediction market...");
  const targetPrice = 300000; // $3.00 with 5 decimals
  const resolutionTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const isAbove = true; // "Will XRP be above $3.00?"

  const tx = await factory.createXRPMarket(
    targetPrice,
    resolutionTime,
    isAbove,
    initialLiquidity
  );

  console.log("Transaction hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction confirmed!");

  // Parse logs to find the FPMM address
  console.log("\n========== MARKET CREATED ==========");
  console.log("Target Price: $3.00");
  console.log("Resolution:", new Date(resolutionTime * 1000).toISOString());
  console.log("Bet Type: XRP ABOVE $3.00");
  console.log("Initial Liquidity: 9 USDT0");
  console.log("\nCheck transaction on explorer:");
  console.log(`https://coston2-explorer.flare.network/tx/${tx.hash}`);
  console.log("=====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
