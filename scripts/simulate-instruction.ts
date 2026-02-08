/**
 * Simulate what would happen if the custom instruction executed
 * This helps debug if the instruction would revert
 */

import { createPublicClient, http, erc20Abi, type Address, encodeFunctionData, decodeFunctionResult } from 'viem';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import 'dotenv/config';

const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as Address;
const PERSONAL_ACCOUNT = '0x697B626A5170Dce7028A6cBb7bA494b0cA5C8DB4' as Address;
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
  const result = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: 'fAsset',
  });
  return result as Address;
}

async function main() {
  console.log('========== SIMULATE INSTRUCTION EXECUTION ==========\n');

  const fxrpAddress = await getFxrpAddress();
  console.log('FXRP:', fxrpAddress);
  console.log('Personal Account:', PERSONAL_ACCOUNT);
  console.log('Wrapper:', WRAPPER_ADDRESS);

  const fxrpAmount = 10_000_000n;
  const minUsdtOut = 4_500_000n;

  // Check FXRP balance
  const fxrpBalance = await publicClient.readContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [PERSONAL_ACCOUNT],
  });
  console.log('\nFXRP Balance:', fxrpBalance.toString(), '(' + Number(fxrpBalance) / 1e6 + ' FXRP)');

  // Check current allowance
  const currentAllowance = await publicClient.readContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [PERSONAL_ACCOUNT, WRAPPER_ADDRESS],
  });
  console.log('Current FXRP allowance to Wrapper:', currentAllowance.toString());

  // Simulate CALL 1: approve
  console.log('\n--- Simulating CALL 1: FXRP.approve(wrapper, amount) ---');
  const approveData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [WRAPPER_ADDRESS, fxrpAmount],
  });
  console.log('Call data:', approveData);

  try {
    await publicClient.call({
      account: PERSONAL_ACCOUNT,
      to: fxrpAddress,
      data: approveData,
    });
    console.log('✅ CALL 1 would succeed');
  } catch (e: any) {
    console.log('❌ CALL 1 would FAIL:', e.message);
  }

  // Simulate CALL 2: swapAndDeposit (assuming approve happened)
  console.log('\n--- Simulating CALL 2: wrapper.swapAndDeposit(amount, minOut) ---');
  const swapData = encodeFunctionData({
    abi: wrapperAbi,
    functionName: 'swapAndDeposit',
    args: [fxrpAmount, minUsdtOut],
  });
  console.log('Call data:', swapData);

  // First check if Personal Account has approved the wrapper (it hasn't yet, this is just checking)
  console.log('\nNote: If Personal Account hasnt approved wrapper, this will fail.');
  console.log('The custom instruction does: 1) approve, 2) swapAndDeposit in sequence.');
  console.log('The approve in step 1 enables step 2 to succeed.\n');

  try {
    // This will fail because approve hasn't happened yet
    // But we can check the wrapper code to see if there are other issues
    await publicClient.call({
      account: PERSONAL_ACCOUNT,
      to: WRAPPER_ADDRESS,
      data: swapData,
    });
    console.log('✅ CALL 2 would succeed (unexpected - allowance should be 0)');
  } catch (e: any) {
    console.log('❌ CALL 2 would FAIL (expected if no allowance):', e.message?.slice(0, 200));
  }

  // Check wrapper state
  console.log('\n--- Wrapper Contract State ---');
  const wrapperStateAbi = [
    { inputs: [], name: 'fxrp', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'usdt', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'router', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'vault', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  ] as const;

  try {
    const wrapperFxrp = await publicClient.readContract({
      address: WRAPPER_ADDRESS,
      abi: wrapperStateAbi,
      functionName: 'fxrp',
    });
    console.log('Wrapper FXRP:', wrapperFxrp);

    const wrapperUsdt = await publicClient.readContract({
      address: WRAPPER_ADDRESS,
      abi: wrapperStateAbi,
      functionName: 'usdt',
    });
    console.log('Wrapper USDT:', wrapperUsdt);

    const wrapperRouter = await publicClient.readContract({
      address: WRAPPER_ADDRESS,
      abi: wrapperStateAbi,
      functionName: 'router',
    });
    console.log('Wrapper Router:', wrapperRouter);

    const wrapperVault = await publicClient.readContract({
      address: WRAPPER_ADDRESS,
      abi: wrapperStateAbi,
      functionName: 'vault',
    });
    console.log('Wrapper Vault:', wrapperVault);
  } catch (e: any) {
    console.log('Error reading wrapper state:', e.message);
  }

  // Check wrapper approvals
  console.log('\n--- Wrapper Approvals ---');
  const BLAZESWAP_ROUTER = '0x7Ba34bDCA39C8B6082b0D730C3cD8537F927C9ba' as Address;
  const UNIVERSAL_VAULT = '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87' as Address;
  const USDT = '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F' as Address;

  const wrapperFxrpAllowance = await publicClient.readContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [WRAPPER_ADDRESS, BLAZESWAP_ROUTER],
  });
  console.log('Wrapper -> Router (FXRP):', wrapperFxrpAllowance.toString());

  const wrapperUsdtAllowance = await publicClient.readContract({
    address: USDT,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [WRAPPER_ADDRESS, UNIVERSAL_VAULT],
  });
  console.log('Wrapper -> Vault (USDT):', wrapperUsdtAllowance.toString());
}

main().catch(console.error);
