import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy MockUSDT (for testnet)
  console.log("\n1. Deploying MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("MockUSDT deployed to:", usdtAddress);

  // 2. Deploy ConditionalTokens
  console.log("\n2. Deploying ConditionalTokens...");
  const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
  const conditionalTokens = await ConditionalTokens.deploy(usdtAddress);
  await conditionalTokens.waitForDeployment();
  const ctAddress = await conditionalTokens.getAddress();
  console.log("ConditionalTokens deployed to:", ctAddress);

  // 3. Deploy Vault
  console.log("\n3. Deploying Vault...");
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(usdtAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("Vault deployed to:", vaultAddress);

  // 4. Deploy FTSOResolver
  // Flare Coston2 FTSO Registry (use getAddress for proper checksum)
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
  console.log("Network:", (await ethers.provider.getNetwork()).name);
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
