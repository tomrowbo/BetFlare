/**
 * Debug the instruction hash encoding
 */

import { createPublicClient, http, erc20Abi, type Address, encodeFunctionData, keccak256, encodeAbiParameters } from 'viem';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import 'dotenv/config';

const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as Address;
const WRAPPER_ADDRESS = '0xe58390aac1030b20a12cF73B860105753f16A63d' as Address;

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

async function getFxrpAddress(): Promise<Address> {
  const assetManagerAddress = await publicClient.readContract({
    address: FLARE_CONTRACT_REGISTRY,
    abi: coston2.iFlareContractRegistryAbi,
    functionName: 'getContractAddressByName',
    args: ['AssetManagerFXRP'],
  });
  return await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: 'fAsset',
  }) as Address;
}

async function main() {
  console.log('========== DEBUG INSTRUCTION HASH ==========\n');

  const fxrpAddress = await getFxrpAddress();
  console.log('FXRP Address:', fxrpAddress);
  console.log('Wrapper Address:', WRAPPER_ADDRESS);

  const fxrpAmount = 10_000_000n;
  const minUsdtOut = 4_500_000n;

  // Build instruction (same as test-custom-instruction-only.ts)
  const approveData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [WRAPPER_ADDRESS, fxrpAmount],
  });

  const swapData = encodeFunctionData({
    abi: wrapperAbi,
    functionName: 'swapAndDeposit',
    args: [fxrpAmount, minUsdtOut],
  });

  console.log('\n--- Instruction Details ---');
  console.log('Call 1: approve(wrapper, 10000000)');
  console.log('  Target:', fxrpAddress);
  console.log('  Value:', '0');
  console.log('  Data:', approveData);

  console.log('\nCall 2: swapAndDeposit(10000000, 4500000)');
  console.log('  Target:', WRAPPER_ADDRESS);
  console.log('  Value:', '0');
  console.log('  Data:', swapData);

  const instructions = [
    {
      targetContract: fxrpAddress,
      value: 0n,
      data: approveData,
    },
    {
      targetContract: WRAPPER_ADDRESS,
      value: 0n,
      data: swapData,
    },
  ];

  // Get hash from contract
  const hash = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: customInstructionsFacetAbi,
    functionName: 'encodeCustomInstruction',
    args: [instructions],
  });

  console.log('\n--- Hash ---');
  console.log('Computed hash:', hash);

  // Check if registered
  console.log('\n--- Registration Check ---');
  try {
    const stored = await publicClient.readContract({
      address: MASTER_ACCOUNT_CONTROLLER,
      abi: customInstructionsFacetAbi,
      functionName: 'getCustomInstruction',
      args: [hash as `0x${string}`],
    });

    if (stored && Array.isArray(stored) && stored.length > 0) {
      console.log('✅ Instruction IS registered');
      console.log('Stored instruction:');
      for (let i = 0; i < stored.length; i++) {
        const call = stored[i] as any;
        console.log(`  Call ${i + 1}:`);
        console.log(`    Target: ${call.targetContract}`);
        console.log(`    Value: ${call.value.toString()}`);
        console.log(`    Data: ${call.data}`);
      }

      // Verify stored matches what we're trying to send
      console.log('\n--- Verification ---');
      const storedCall0 = stored[0] as any;
      const storedCall1 = stored[1] as any;

      console.log('Call 1 target matches:', storedCall0.targetContract.toLowerCase() === fxrpAddress.toLowerCase());
      console.log('Call 1 value matches:', storedCall0.value === 0n);
      console.log('Call 1 data matches:', storedCall0.data.toLowerCase() === approveData.toLowerCase());

      console.log('Call 2 target matches:', storedCall1.targetContract.toLowerCase() === WRAPPER_ADDRESS.toLowerCase());
      console.log('Call 2 value matches:', storedCall1.value === 0n);
      console.log('Call 2 data matches:', storedCall1.data.toLowerCase() === swapData.toLowerCase());

    } else {
      console.log('❌ Instruction NOT registered (empty array)');
    }
  } catch (e: any) {
    console.log('❌ Instruction NOT registered (error):', e.message);
  }

  // Show the full encoded instruction for XRPL memo
  const { toHex } = await import('viem');
  const encodedForXrpl = ('0xff' + toHex(0, { size: 1 }).slice(2) + (hash as string).slice(6)) as `0x${string}`;
  console.log('\n--- XRPL Memo Encoding ---');
  console.log('Full encoded instruction:', encodedForXrpl);
  console.log('Memo data (without 0x):', encodedForXrpl.slice(2));
  console.log('Length:', (encodedForXrpl.length - 2) / 2, 'bytes');
}

main().catch(console.error);
