import { ethers } from "hardhat";

async function main() {
  const ROUTER_ADDRESS = "0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac";
  const RESOLVED_MARKET = "0x97D8Bf27dC27C821EaB066f098A611BD7f8cBe89";

  const [signer] = await ethers.getSigners();
  console.log("Deregistering with account:", signer.address);

  const router = await ethers.getContractAt(
    ["function deregisterMarket(address fpmm) external", "function getActiveMarkets() external view returns (address[])"],
    ROUTER_ADDRESS,
    signer
  );

  // Check current active markets
  const before = await router.getActiveMarkets();
  console.log("Active markets before:", before);

  // Deregister the resolved market
  console.log(`\nDeregistering resolved market: ${RESOLVED_MARKET}`);
  const tx = await router.deregisterMarket(RESOLVED_MARKET);
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Done!");

  // Check after
  const after = await router.getActiveMarkets();
  console.log("\nActive markets after:", after);
}

main().catch(console.error);
