import { ethers } from "hardhat";

async function main() {
  const vault = await ethers.getContractAt("UniversalVault", "0x4F5Ac414560E8e14F9D63D4b7a644788882bf1b3");
  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
    "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F"
  );

  const [deployer] = await ethers.getSigners();
  const balance = await usdt.balanceOf(deployer.address);
  console.log("USDT Balance:", ethers.formatUnits(balance, 6));

  if (balance > ethers.parseUnits("0.1", 6)) {
    const amount = ethers.parseUnits("0.3", 6); // Deposit 0.3 USDT
    console.log("Depositing:", ethers.formatUnits(amount, 6));

    const approveTx = await usdt.approve("0x4F5Ac414560E8e14F9D63D4b7a644788882bf1b3", amount);
    await approveTx.wait();
    console.log("Approved");

    const depositTx = await vault.deposit(amount, deployer.address);
    await depositTx.wait();
    console.log("Deposited! Liquidity is now live in FPMM.");
  } else {
    console.log("Not enough balance");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
