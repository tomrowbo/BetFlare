import { ethers } from "hardhat";

const CONTRACTS = {
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  // Correct FTSO Registry on Coston2
  ftsoRegistry: "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying fixed FTSOResolver with account:", deployer.address);

  // Deploy new resolver with correct FTSO Registry
  const FTSOResolver = await ethers.getContractFactory("FTSOResolver");
  const resolver = await FTSOResolver.deploy(
    CONTRACTS.ftsoRegistry,
    CONTRACTS.conditionalTokens
  );
  await resolver.waitForDeployment();
  const resolverAddress = await resolver.getAddress();
  console.log("New FTSOResolver deployed to:", resolverAddress);

  // Check it can fetch testXRP price
  const [price, ts] = await resolver.getCurrentPrice("testXRP");
  console.log("testXRP price:", Number(price) / 100000, "at", new Date(Number(ts) * 1000).toISOString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
