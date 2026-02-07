import { ethers, upgrades } from "hardhat";

const ROUTER_PROXY = "0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading LiquidityRouter with:", deployer.address);

  const LiquidityRouter = await ethers.getContractFactory("LiquidityRouter");

  console.log("Upgrading proxy at:", ROUTER_PROXY);
  const upgraded = await upgrades.upgradeProxy(ROUTER_PROXY, LiquidityRouter);
  await upgraded.waitForDeployment();

  console.log("LiquidityRouter upgraded!");

  // Test rebalance
  console.log("\nCalling rebalance...");
  const tx = await upgraded.rebalance();
  await tx.wait();
  console.log("Rebalanced!");

  // Check new market liquidity
  const newMarket = "0xADe505A8CEF91C92cd3cc1B6ea4a66C59AAf4000";
  const fpmm = await ethers.getContractAt(
    ["function yesReserve() view returns (uint256)", "function noReserve() view returns (uint256)"],
    newMarket
  );
  const yes = await fpmm.yesReserve();
  const no = await fpmm.noReserve();
  console.log("\nNew market liquidity after rebalance:");
  console.log("  YES Reserve:", ethers.formatUnits(yes, 6));
  console.log("  NO Reserve:", ethers.formatUnits(no, 6));
  console.log("  Total:", ethers.formatUnits(yes + no, 6));
}

main().catch(console.error);
