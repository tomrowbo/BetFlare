import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  fpmm: "0x5D8FC54d9D4e3D24331b0378CC3e6F11487255F6",
};

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing buy with account:", signer.address);

  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)"],
    CONTRACTS.usdt
  );

  const fpmm = await ethers.getContractAt("FPMM", CONTRACTS.fpmm);

  // Check balance
  const balance = await usdt.balanceOf(signer.address);
  console.log("\nUSDT0 Balance:", ethers.formatUnits(balance, 6));

  // Check allowance
  const allowance = await usdt.allowance(signer.address, CONTRACTS.fpmm);
  console.log("Current Allowance:", ethers.formatUnits(allowance, 6));

  // Buy amount: 1 USDT0
  const buyAmount = ethers.parseUnits("1", 6);

  if (allowance < buyAmount) {
    console.log("\nApproving FPMM to spend USDT0...");
    const approveTx = await usdt.approve(CONTRACTS.fpmm, ethers.parseUnits("1000000", 6));
    await approveTx.wait();
    console.log("Approved!");
  }

  // Get prices before
  const yesPriceBefore = await fpmm.getYesPrice();
  console.log("\nYES Price Before:", (Number(yesPriceBefore) / 1e18 * 100).toFixed(2) + "%");

  // Buy YES tokens
  console.log("\nBuying 1 USDT0 worth of YES tokens...");
  const buyTx = await fpmm.buyYes(buyAmount);
  const receipt = await buyTx.wait();
  console.log("Transaction hash:", receipt?.hash);

  // Get prices after
  const yesPriceAfter = await fpmm.getYesPrice();
  const newBalance = await usdt.balanceOf(signer.address);

  console.log("\n========== RESULT ==========");
  console.log("YES Price After:", (Number(yesPriceAfter) / 1e18 * 100).toFixed(2) + "%");
  console.log("USDT0 Balance After:", ethers.formatUnits(newBalance, 6));
  console.log("Price moved:", ((Number(yesPriceAfter) - Number(yesPriceBefore)) / 1e18 * 100).toFixed(2) + "%");
  console.log("=============================");
  console.log("\n✅ BUY SUCCESSFUL! The prediction market works!");
}

main().catch(console.error);
