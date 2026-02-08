import { createPublicClient, createWalletClient, http, encodeFunctionData, erc20Abi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import hre from 'hardhat';

// Contract addresses (Coston2)
const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as Address;
const UNIVERSAL_VAULT = '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87' as Address;
const USDT = '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F' as Address;
const BLAZESWAP_ROUTER = '0x7Ba34bDCA39C8B6082b0D730C3cD8537F927C9ba' as Address;

// Define Coston2 chain
const coston2Chain = {
  id: 114,
  name: 'Coston2',
  nativeCurrency: { decimals: 18, name: 'Coston2 FLR', symbol: 'C2FLR' },
  rpcUrls: { default: { http: ['https://coston2-api.flare.network/ext/C/rpc'] } },
} as const;

// ABIs
const customInstructionsFacetAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'targetContract', type: 'address' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct CustomInstructions.CustomCall[]',
        name: '_customInstruction',
        type: 'tuple[]',
      },
    ],
    name: 'registerCustomInstruction',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'targetContract', type: 'address' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct CustomInstructions.CustomCall[]',
        name: '_customInstruction',
        type: 'tuple[]',
      },
    ],
    name: 'encodeCustomInstruction',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_customInstructionHash', type: 'bytes32' }],
    name: 'getCustomInstruction',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'targetContract', type: 'address' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct CustomInstructions.CustomCall[]',
        name: '_customInstruction',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const universalVaultAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'assets', type: 'uint256' },
      { internalType: 'address', name: 'receiver', type: 'address' },
    ],
    name: 'deposit',
    outputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const blazeSwapRouterAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

type CustomInstruction = {
  targetContract: Address;
  value: bigint;
  data: `0x${string}`;
};

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log('Using account:', signer.address);

  const publicClient = createPublicClient({
    chain: coston2Chain,
    transport: http(),
  });

  // Get FXRP address from registry
  const assetManagerAddress = await publicClient.readContract({
    address: FLARE_CONTRACT_REGISTRY,
    abi: coston2.iFlareContractRegistryAbi,
    functionName: 'getContractAddressByName',
    args: ['AssetManagerFXRP'],
  });

  const fxrpAddress = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: 'fAsset',
  });

  console.log('FXRP Address:', fxrpAddress);
  console.log('USDT Address:', USDT);
  console.log('BlazeSwap Router:', BLAZESWAP_ROUTER);
  console.log('Universal Vault:', UNIVERSAL_VAULT);

  // We need to register a generic instruction that works for any amount
  // The instruction uses placeholder values that will be replaced at execution time
  // For custom instructions, we use a "canonical" form with specific amounts

  // Register instruction for 10 FXRP -> USDT -> Vault (1 lot mint result)
  // FXRP has 6 decimals, so 10 FXRP = 10_000_000
  const fxrpAmount = 10_000_000n; // 10 FXRP (6 decimals)
  const minUsdtOut = 4_950_000n; // ~4.95 USDT with 1% slippage (demo rate 0.5)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 365); // 1 year deadline

  // Use a placeholder address that will be replaced by the personal account
  // Actually, for custom instructions, we need to use a specific address
  // The personal account address is deterministic based on the XRPL address
  // For now, let's use a generic receiver address placeholder
  const personalAccountPlaceholder = '0x0000000000000000000000000000000000000001' as Address;

  const instructions: CustomInstruction[] = [
    // 1. Approve FXRP to BlazeSwap Router
    {
      targetContract: fxrpAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [BLAZESWAP_ROUTER, fxrpAmount],
      }),
    },
    // 2. Swap FXRP to USDT via BlazeSwap
    {
      targetContract: BLAZESWAP_ROUTER,
      value: 0n,
      data: encodeFunctionData({
        abi: blazeSwapRouterAbi,
        functionName: 'swapExactTokensForTokens',
        args: [fxrpAmount, minUsdtOut, [fxrpAddress, USDT], personalAccountPlaceholder, deadline],
      }),
    },
    // 3. Approve USDT to UniversalVault
    {
      targetContract: USDT,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [UNIVERSAL_VAULT, minUsdtOut],
      }),
    },
    // 4. Deposit USDT into UniversalVault
    {
      targetContract: UNIVERSAL_VAULT,
      value: 0n,
      data: encodeFunctionData({
        abi: universalVaultAbi,
        functionName: 'deposit',
        args: [minUsdtOut, personalAccountPlaceholder],
      }),
    },
  ];

  console.log('\nCustom instruction to register:');
  console.log(JSON.stringify(instructions, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  // Check if already registered
  const hash = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: customInstructionsFacetAbi,
    functionName: 'encodeCustomInstruction',
    args: [instructions],
  });
  console.log('\nInstruction hash:', hash);

  try {
    const existing = await publicClient.readContract({
      address: MASTER_ACCOUNT_CONTROLLER,
      abi: customInstructionsFacetAbi,
      functionName: 'getCustomInstruction',
      args: [hash],
    });

    if (existing && Array.isArray(existing) && existing.length > 0) {
      console.log('\n✅ Instruction already registered!');
      return;
    }
  } catch (e) {
    console.log('\nInstruction not yet registered, registering now...');
  }

  // Register the instruction using ethers (hardhat signer)
  const masterAccountController = new hre.ethers.Contract(
    MASTER_ACCOUNT_CONTROLLER,
    customInstructionsFacetAbi,
    signer
  );

  const tx = await masterAccountController.registerCustomInstruction(instructions);
  console.log('Registration tx:', tx.hash);

  const receipt = await tx.wait();
  console.log('Registration confirmed in block:', receipt.blockNumber);
  console.log('\n✅ Custom instruction registered successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
