import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Use real USDT0 test token on Coston2
  const USDT0_COSTON2 = "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F";
  console.log("\nUsing USDT0 test token:", USDT0_COSTON2);

  // 1. Deploy ConditionalTokens
  console.log("\n1. Deploying ConditionalTokens...");
  const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
  const conditionalTokens = await ConditionalTokens.deploy(USDT0_COSTON2);
  await conditionalTokens.waitForDeployment();
  const ctAddress = await conditionalTokens.getAddress();
  console.log("ConditionalTokens deployed to:", ctAddress);

  // 2. Deploy Vault
  console.log("\n2. Deploying Vault...");
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(USDT0_COSTON2);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("Vault deployed to:", vaultAddress);

  // 3. Deploy FTSOResolver
  console.log("\n3. Deploying FTSOResolver...");
  const FTSO_REGISTRY_COSTON2 = ethers.getAddress("0xe80ebb4d949bb15a78d1209b84c9b10c4cd3bd0f");
  const FTSOResolver = await ethers.getContractFactory("FTSOResolver");
  const resolver = await FTSOResolver.deploy(FTSO_REGISTRY_COSTON2, ctAddress);
  await resolver.waitForDeployment();
  const resolverAddress = await resolver.getAddress();
  console.log("FTSOResolver deployed to:", resolverAddress);

  // 4. Deploy MarketFactory
  console.log("\n4. Deploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(
    ctAddress,
    resolverAddress,
    vaultAddress,
    USDT0_COSTON2
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("MarketFactory deployed to:", factoryAddress);

  // Summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("Network: Coston2");
  console.log("USDT0 (existing):", USDT0_COSTON2);
  console.log("ConditionalTokens:", ctAddress);
  console.log("Vault:", vaultAddress);
  console.log("FTSOResolver:", resolverAddress);
  console.log("MarketFactory:", factoryAddress);
  console.log("=========================================\n");

  // Export addresses for frontend
  const addresses = {
    usdt: USDT0_COSTON2,
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
