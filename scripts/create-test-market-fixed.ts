import { ethers } from "hardhat";

const CONTRACTS = {
  usdt: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
  conditionalTokens: "0xCe9070d4C6940e7528b418cFB36087345f947c49",
  resolver: "0x61c422DF498D1035809AC643273Ac70dbd1c2A96", // Fixed resolver with correct FTSO
  universalVault: "0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87",
  liquidityRouter: "0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Creating test market with:", deployer.address);

  // Resolution in 3 minutes
  const resolutionTime = Math.floor(Date.now() / 1000) + 180;
  const targetPrice = 200000; // $2.00 - testXRP is ~$1.47 so NO should win
  const symbol = "testXRP"; // Correct Coston2 symbol!

  console.log("\n=== Market Config ===");
  console.log("Symbol:", symbol);
  console.log("Target: above $2.00");
  console.log("Current price: ~$1.47");
  console.log("Expected: NO wins");
  console.log("Resolution:", new Date(resolutionTime * 1000).toLocaleTimeString());

  // 1. Create questionId (same formula as resolver will use)
  const questionId = ethers.keccak256(
    ethers.solidityPacked(
      ["string", "uint256", "uint256", "bool", "uint256"],
      [symbol, targetPrice, resolutionTime, true, Math.floor(Date.now() / 1000)]
    )
  );
  console.log("\nQuestionId:", questionId);

  // 2. Prepare condition with resolver as oracle
  console.log("\n1. Preparing condition...");
  const ct = await ethers.getContractAt("ConditionalTokens", CONTRACTS.conditionalTokens);
  await (await ct.prepareCondition(CONTRACTS.resolver, questionId, 2)).wait();
  const conditionId = await ct.getConditionId(CONTRACTS.resolver, questionId, 2);
  console.log("ConditionId:", conditionId);

  // 3. Deploy FPMM
  console.log("\n2. Deploying FPMM...");
  const FPMM = await ethers.getContractFactory("FPMM");
  const fpmm = await FPMM.deploy(
    CONTRACTS.conditionalTokens,
    CONTRACTS.usdt,
    conditionId,
    CONTRACTS.universalVault
  );
  await fpmm.waitForDeployment();
  const fpmmAddress = await fpmm.getAddress();
  console.log("FPMM:", fpmmAddress);

  // 4. Setup FPMM
  console.log("\n3. Configuring FPMM...");
  await (await fpmm.setRouter(CONTRACTS.liquidityRouter)).wait();

  const router = await ethers.getContractAt(
    ["function registerMarket(address)"],
    CONTRACTS.liquidityRouter
  );
  await (await router.registerMarket(fpmmAddress)).wait();

  const vault = await ethers.getContractAt(
    ["function authorizeMarket(address,bool)"],
    CONTRACTS.universalVault
  );
  await (await vault.authorizeMarket(fpmmAddress, true)).wait();
  console.log("FPMM configured");

  // 5. Add liquidity
  console.log("\n4. Adding liquidity...");
  const usdt = await ethers.getContractAt(
    ["function approve(address,uint256)", "function balanceOf(address) view returns (uint256)"],
    CONTRACTS.usdt
  );
  const bal = await usdt.balanceOf(deployer.address);
  const liq = bal > ethers.parseUnits("0.5", 6) ? ethers.parseUnits("0.5", 6) : bal / 2n;
  if (liq > 0n) {
    await (await usdt.approve(fpmmAddress, liq)).wait();
    await (await fpmm.addLiquidity(liq)).wait();
    console.log("Added", ethers.formatUnits(liq, 6), "USDT0");
  }

  console.log("\n========== TEST MARKET READY ==========");
  console.log("FPMM:", fpmmAddress);
  console.log("Resolver:", CONTRACTS.resolver);
  console.log("QuestionId:", questionId);
  console.log("ConditionId:", conditionId);
  console.log("Symbol: testXRP");
  console.log("Target: $2.00");
  console.log("Resolves:", new Date(resolutionTime * 1000).toLocaleTimeString());
  console.log("\nTo resolve after deadline, run:");
  console.log(`npx hardhat console --network coston2`);
  console.log(`const r = await ethers.getContractAt(["function resolveWithFTSO(bytes32,address,string,uint256,bool)"], "${CONTRACTS.resolver}");`);
  console.log(`await r.resolveWithFTSO("${questionId}", "${fpmmAddress}", "testXRP", 200000, true);`);
  console.log("==========================================");
}

main().catch(console.error);
