/**
 * Script to register a custom instruction for swap + deposit flow
 *
 * This must be run ONCE before users can use the XRPL deposit flow.
 * The custom instruction allows: FXRP → approve → swap → approve → vault deposit
 *
 * Usage:
 *   npx hardhat run scripts/register-custom-instruction.js --network coston2
 */

const hre = require("hardhat");

// Contract addresses on Coston2
const MASTER_ACCOUNT_CONTROLLER = "0x434936d47503353f06750Db1A444DBDC5F0AD37c";
const FLARE_CONTRACT_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const UNIVERSAL_VAULT = "0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87";
const USDT = "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F";
const MOCK_SWAP_ROUTER = "0x7Ba34bDCA39C8B6082b0D730C3cD8537F927C9ba";

// ABIs
const flareContractRegistryAbi = [
  {
    inputs: [{ name: "_name", type: "string" }],
    name: "getContractAddressByName",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const assetManagerAbi = [
  {
    inputs: [],
    name: "fAsset",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const customInstructionsFacetAbi = [
  {
    inputs: [
      {
        components: [
          { name: "targetContract", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        name: "_customInstruction",
        type: "tuple[]",
      },
    ],
    name: "registerCustomInstruction",
    outputs: [{ type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { name: "targetContract", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        name: "_customInstruction",
        type: "tuple[]",
      },
    ],
    name: "encodeCustomInstruction",
    outputs: [{ type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ name: "_customInstructionHash", type: "bytes32" }],
    name: "getCustomInstruction",
    outputs: [
      {
        components: [
          { name: "targetContract", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  console.log("Registering custom instruction on", hre.network.name, "...\n");

  const [signer] = await hre.ethers.getSigners();
  console.log("Using account:", signer.address);

  // Get FXRP address from registry
  const registry = new hre.ethers.Contract(
    FLARE_CONTRACT_REGISTRY,
    flareContractRegistryAbi,
    signer
  );
  const assetManagerAddress = await registry.getContractAddressByName(
    "AssetManagerFXRP"
  );
  console.log("AssetManagerFXRP:", assetManagerAddress);

  const assetManager = new hre.ethers.Contract(
    assetManagerAddress,
    assetManagerAbi,
    signer
  );
  const fxrpAddress = await assetManager.fAsset();
  console.log("FXRP address:", fxrpAddress);

  // Use a placeholder personal account address for registration
  // The actual personal account will be filled in during execution
  // We use a well-known test address as placeholder
  const PLACEHOLDER_PERSONAL_ACCOUNT =
    "0x0000000000000000000000000000000000000001";

  // Build the custom instruction for swap + deposit
  // The instruction uses placeholder values since actual amounts
  // will be filled in at execution time by the operator

  // ERC20 interface for encoding
  const erc20Interface = new hre.ethers.Interface([
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);

  // BlazeSwap/MockSwapRouter interface
  const swapRouterInterface = new hre.ethers.Interface([
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  ]);

  // UniversalVault interface
  const vaultInterface = new hre.ethers.Interface([
    "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  ]);

  // Use max uint256 for amounts (will be replaced at execution)
  const MAX_AMOUNT = hre.ethers.MaxUint256;
  const DEADLINE = hre.ethers.MaxUint256;

  // Build instruction chain
  const customInstructions = [
    // 1. Approve FXRP to swap router
    {
      targetContract: fxrpAddress,
      value: 0n,
      data: erc20Interface.encodeFunctionData("approve", [
        MOCK_SWAP_ROUTER,
        MAX_AMOUNT,
      ]),
    },
    // 2. Swap FXRP to USDT
    {
      targetContract: MOCK_SWAP_ROUTER,
      value: 0n,
      data: swapRouterInterface.encodeFunctionData("swapExactTokensForTokens", [
        MAX_AMOUNT, // amountIn
        0n, // amountOutMin (accept any)
        [fxrpAddress, USDT], // path
        PLACEHOLDER_PERSONAL_ACCOUNT, // to
        DEADLINE, // deadline
      ]),
    },
    // 3. Approve USDT to vault
    {
      targetContract: USDT,
      value: 0n,
      data: erc20Interface.encodeFunctionData("approve", [
        UNIVERSAL_VAULT,
        MAX_AMOUNT,
      ]),
    },
    // 4. Deposit USDT into vault
    {
      targetContract: UNIVERSAL_VAULT,
      value: 0n,
      data: vaultInterface.encodeFunctionData("deposit", [
        MAX_AMOUNT, // assets
        PLACEHOLDER_PERSONAL_ACCOUNT, // receiver
      ]),
    },
  ];

  console.log("\nCustom instruction chain:");
  console.log("1. Approve FXRP to MockSwapRouter");
  console.log("2. Swap FXRP → USDT via MockSwapRouter");
  console.log("3. Approve USDT to UniversalVault");
  console.log("4. Deposit USDT into UniversalVault\n");

  // Get the MasterAccountController contract
  const mac = new hre.ethers.Contract(
    MASTER_ACCOUNT_CONTROLLER,
    customInstructionsFacetAbi,
    signer
  );

  // First check if already registered
  try {
    const hash = await mac.encodeCustomInstruction(customInstructions);
    console.log("Instruction hash:", hash);

    const existing = await mac.getCustomInstruction(hash);
    if (existing && existing.length > 0) {
      console.log("\n✓ Custom instruction already registered!");
      console.log("Hash:", hash);
      return hash;
    }
  } catch (e) {
    // Not registered, continue
  }

  // Register the instruction
  console.log("Registering instruction...");
  const tx = await mac.registerCustomInstruction(customInstructions);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Get the hash
  const hash = await mac.encodeCustomInstruction(customInstructions);
  console.log("\n✓ Custom instruction registered!");
  console.log("Hash:", hash);

  return hash;
}

main()
  .then((hash) => {
    console.log("\nDone! Hash:", hash);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
