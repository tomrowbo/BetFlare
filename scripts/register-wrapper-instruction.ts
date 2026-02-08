import { createPublicClient, http, encodeFunctionData, erc20Abi, type Address } from 'viem';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import hre from 'hardhat';

// Contract addresses (Coston2)
const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as Address;

// Deployed wrapper contract address
const WRAPPER_ADDRESS = '0xe58390aac1030b20a12cF73B860105753f16A63d' as Address;

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

// Wrapper ABI for swapAndDeposit
const wrapperAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'fxrpAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'minUsdtOut', type: 'uint256' },
    ],
    name: 'swapAndDeposit',
    outputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
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
  if (WRAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.error('ERROR: Please update WRAPPER_ADDRESS with the deployed wrapper address');
    console.error('Run deploy-wrapper.ts first and copy the address');
    process.exit(1);
  }

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
  console.log('Wrapper Address:', WRAPPER_ADDRESS);

  // Register instruction for 10 FXRP (1 lot = 10 FXRP at 6 decimals)
  // FXRP has 6 decimals, so 10 FXRP = 10_000_000
  const fxrpAmount = 10_000_000n; // 10 FXRP (6 decimals)

  // Min USDT out with slippage protection
  // Using MockSwapRouter rate: 1 FXRP = 0.5 USDT
  // 10 FXRP = 5 USDT, with 10% slippage = 4.5 USDT
  const minUsdtOut = 4_500_000n; // 4.5 USDT (6 decimals)

  // Build the custom instruction (2 steps):
  // 1. Approve wrapper to spend FXRP
  // 2. Call wrapper.swapAndDeposit()
  const instructions: CustomInstruction[] = [
    // 1. Approve FXRP to Wrapper
    {
      targetContract: fxrpAddress as Address,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [WRAPPER_ADDRESS, fxrpAmount],
      }),
    },
    // 2. Call wrapper.swapAndDeposit()
    {
      targetContract: WRAPPER_ADDRESS,
      value: 0n,
      data: encodeFunctionData({
        abi: wrapperAbi,
        functionName: 'swapAndDeposit',
        args: [fxrpAmount, minUsdtOut],
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
      console.log('\nInstruction hash for frontend:', hash);
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

  console.log('\n========== REGISTRATION SUMMARY ==========');
  console.log('✅ Custom instruction registered successfully!');
  console.log('');
  console.log('Instruction hash:', hash);
  console.log('FXRP amount:', fxrpAmount.toString(), '(10 FXRP)');
  console.log('Min USDT out:', minUsdtOut.toString(), '(4.5 USDT)');
  console.log('');
  console.log('This instruction can now be triggered by ANY user');
  console.log('by sending an XRPL payment with the instruction hash in memo');
  console.log('==========================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
