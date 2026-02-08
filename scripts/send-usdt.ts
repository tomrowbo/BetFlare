import { ethers } from "hardhat";

async function main() {
  const mnemonic = "effort party couple stamp suspect market rhythm vanish beach pull car enough";
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);
  
  console.log("From:", wallet.address);
  
  const usdt = new ethers.Contract(
    "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
    ["function transfer(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"],
    signer
  );
  
  const balance = await usdt.balanceOf(wallet.address);
  console.log("Balance:", ethers.formatUnits(balance, 6), "USDT");
  
  const amount = ethers.parseUnits("8", 6);
  console.log("Sending 8 USDT to 0x63A14D66364243455af3A758Ec4BB4829d740CfB...");
  
  const tx = await usdt.transfer("0x63A14D66364243455af3A758Ec4BB4829d740CfB", amount);
  await tx.wait();
  
  console.log("Done! TX:", tx.hash);
}

main().catch(console.error);
