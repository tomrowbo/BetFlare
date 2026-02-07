import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SimpleResolver with:", deployer.address);

  const SimpleResolver = await ethers.getContractFactory("SimpleResolver");
  const resolver = await SimpleResolver.deploy(
    "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87", // Correct FTSO Registry
    "0xCe9070d4C6940e7528b418cFB36087345f947c49"  // ConditionalTokens
  );
  await resolver.waitForDeployment();
  const addr = await resolver.getAddress();
  console.log("SimpleResolver deployed to:", addr);

  // Test FTSO
  const [price, dec] = await resolver.getCurrentPrice("testXRP");
  console.log("testXRP:", Number(price) / Math.pow(10, Number(dec)));
}

main().catch(console.error);
