const hre = require("hardhat");

async function main() {
  console.log("Deploying MockSwapRouter to", hre.network.name, "...");

  const MockSwapRouter = await hre.ethers.getContractFactory("MockSwapRouter");
  const router = await MockSwapRouter.deploy();

  await router.waitForDeployment();

  const address = await router.getAddress();
  console.log("MockSwapRouter deployed to:", address);

  // Log verification command
  console.log("\nTo verify on explorer:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${address}`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
