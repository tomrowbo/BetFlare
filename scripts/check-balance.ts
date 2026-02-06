import { ethers } from "hardhat";

async function main() {
  const wallet = "0x63A14D66364243455af3A758Ec4BB4829d740CfB";
  const USDT0 = "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F";

  console.log("Checking balances for:", wallet);

  const usdt = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)", "function symbol() view returns (string)"],
    USDT0
  );

  const balance = await usdt.balanceOf(wallet);
  const decimals = await usdt.decimals();
  const symbol = await usdt.symbol();

  console.log("\n========== BALANCE ==========");
  console.log("Token:", symbol);
  console.log("Address:", USDT0);
  console.log("Decimals:", decimals);
  console.log("Raw Balance:", balance.toString());
  console.log("Formatted:", ethers.formatUnits(balance, decimals));
  console.log("==============================");
}

main().catch(console.error);
