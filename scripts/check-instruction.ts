import { createPublicClient, http, encodeFunctionData, erc20Abi, type Address } from 'viem';

const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
const WRAPPER_ADDRESS = '0xe58390aac1030b20a12cF73B860105753f16A63d' as Address;
const FXRP = '0x0b6A3645c240605887a5532109323A3E12273dc7' as Address;

const coston2Chain = {
  id: 114,
  name: 'Coston2',
  nativeCurrency: { decimals: 18, name: 'Coston2 FLR', symbol: 'C2FLR' },
  rpcUrls: { default: { http: ['https://coston2-api.flare.network/ext/C/rpc'] } },
} as const;

const publicClient = createPublicClient({
  chain: coston2Chain,
  transport: http(),
});

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

async function main() {
  const fxrpAmount = 10_000_000n;
  const minUsdtOut = 4_500_000n;

  const instructions = [
    {
      targetContract: FXRP,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [WRAPPER_ADDRESS, fxrpAmount],
      }),
    },
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

  console.log('\n=== Instruction Check ===\n');

  // Get the hash
  const hash = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: customInstructionsFacetAbi,
    functionName: 'encodeCustomInstruction',
    args: [instructions],
  });
  console.log('Expected hash:', hash);

  // Check if registered
  try {
    const stored = await publicClient.readContract({
      address: MASTER_ACCOUNT_CONTROLLER,
      abi: customInstructionsFacetAbi,
      functionName: 'getCustomInstruction',
      args: [hash as `0x${string}`],
    });

    if (stored && Array.isArray(stored) && stored.length > 0) {
      console.log('✅ Instruction IS registered!');
      console.log('Stored instruction:', JSON.stringify(stored, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    } else {
      console.log('❌ Instruction NOT registered (empty)');
    }
  } catch (e: any) {
    console.log('❌ Instruction NOT registered (error):', e.message);
  }
}

main().catch(console.error);
