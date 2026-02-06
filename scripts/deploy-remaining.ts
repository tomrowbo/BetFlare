import { ethers } from "hardhat";

// Already deployed contracts
const DEPLOYED = {
  usdt: "0x398E9f4a7fDCcB7Da550B12e71f5D192bD60CE04",
  conditionalTokens: "0x55E3dd4DAff975720E4eFA8BD78E6f64009C6dD9",
  vault: "0x034b6d1430B567842481abfB6BB339d552EC2Df0",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying remaining contracts with account:", deployer.address);

  const ctAddress = DEPLOYED.conditionalTokens;
  const vaultAddress = DEPLOYED.vault;
  const usdtAddress = DEPLOYED.usdt;

  // 4. Deploy FTSOResolver
  console.log("\n4. Deploying FTSOResolver...");
  const FTSO_REGISTRY_COSTON2 = ethers.getAddress("0xe80ebb4d949bb15a78d1209b84c9b10c4cd3bd0f");
  const FTSOResolver = await ethers.getContractFactory("FTSOResolver");
  const resolver = await FTSOResolver.deploy(FTSO_REGISTRY_COSTON2, ctAddress);
  await resolver.waitForDeployment();
  const resolverAddress = await resolver.getAddress();
  console.log("FTSOResolver deployed to:", resolverAddress);

  // 5. Deploy MarketFactory
  console.log("\n5. Deploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(
    ctAddress,
    resolverAddress,
    vaultAddress,
    usdtAddress
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("MarketFactory deployed to:", factoryAddress);

  // Summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("Network: Coston2");
  console.log("MockUSDT:", usdtAddress);
  console.log("ConditionalTokens:", ctAddress);
  console.log("Vault:", vaultAddress);
  console.log("FTSOResolver:", resolverAddress);
  console.log("MarketFactory:", factoryAddress);
  console.log("=========================================\n");

  // Export addresses for frontend
  const addresses = {
    usdt: usdtAddress,
    conditionalTokens: ctAddress,
    vault: vaultAddress,
    resolver: resolverAddress,
    factory: factoryAddress,
  };

  console.log("Contract Addresses (copy for frontend):");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
