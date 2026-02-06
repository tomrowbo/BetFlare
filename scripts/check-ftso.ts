import { ethers } from "hardhat";

async function main() {
  // FTSO Registry on Coston2
  const FTSO_REGISTRY = "0xe80ebb4d949bb15a78d1209b84c9b10c4cd3bd0f";

  const registry = await ethers.getContractAt(
    [
      "function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals)",
      "function getSupportedSymbols() external view returns (string[] memory)"
    ],
    FTSO_REGISTRY
  );

  console.log("Checking FTSO Registry...\n");

  // Try different XRP symbol variants
  const symbols = ["XRP", "testXRP", "FLR", "testFLR", "BTC", "testBTC"];

  for (const symbol of symbols) {
    try {
      const [price, timestamp, decimals] = await registry.getCurrentPriceWithDecimals(symbol);
      console.log(`${symbol}: $${Number(price) / Math.pow(10, Number(decimals))} (decimals: ${decimals})`);
    } catch (e: any) {
      console.log(`${symbol}: Not found`);
    }
  }
}

main().catch(console.error);
