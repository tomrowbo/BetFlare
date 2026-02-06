import { ethers } from "hardhat";

async function main() {
  console.log("Checking FPMM market state...\n");

  const fpmm = await ethers.getContractAt("FPMM", "0x5D8FC54d9D4e3D24331b0378CC3e6F11487255F6");

  const yesPrice = await fpmm.getYesPrice();
  const noPrice = await fpmm.getNoPrice();
  const yesReserve = await fpmm.yesReserve();
  const noReserve = await fpmm.noReserve();
  const resolved = await fpmm.resolved();

  console.log("========== MARKET STATE ==========");
  console.log("YES Price:", (Number(yesPrice) / 1e18 * 100).toFixed(2) + "%");
  console.log("NO Price:", (Number(noPrice) / 1e18 * 100).toFixed(2) + "%");
  console.log("YES Reserve:", ethers.formatUnits(yesReserve, 6), "USDT0");
  console.log("NO Reserve:", ethers.formatUnits(noReserve, 6), "USDT0");
  console.log("Resolved:", resolved);
  console.log("===================================");
}

main().catch(console.error);
