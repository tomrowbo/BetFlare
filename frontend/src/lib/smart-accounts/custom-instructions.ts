import { encodeFunctionData, toHex, type Address, erc20Abi, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import { coston2 as coston2Chain } from '@/config/wagmi';
import {
  SMART_ACCOUNTS_CONFIG,
  customInstructionsFacetAbi,
  blazeSwapRouterAbi,
  instructionsFacetAbi,
  type CustomInstruction,
} from './config';
import { publicClient, getFxrpAddress, getInstructionFee, dropsToXrp } from './client';

// Demo relayer wallet for registering custom instructions
const relayerAccount = privateKeyToAccount(SMART_ACCOUNTS_CONFIG.DEMO_RELAYER_PRIVATE_KEY);
const relayerWalletClient = createWalletClient({
  account: relayerAccount,
  chain: coston2Chain,
  transport: http(),
});

// SwapAndDepositWrapper ABI
const swapDepositWrapperAbi = [
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

// Universal Vault ABI for deposit
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

// Swap Router addresses
// Mainnet BlazeSwap: 0xe3A1b355ca63abCBC9589334B5e609583C7BAa06
// Coston2 MockSwapRouter: 0x7Ba34bDCA39C8B6082b0D730C3cD8537F927C9ba
const BLAZESWAP_ROUTER = '0x7Ba34bDCA39C8B6082b0D730C3cD8537F927C9ba' as Address;

// Mock swap rate for the MockSwapRouter (1 FXRP = 0.50 USDT)
// Both tokens have 6 decimals
const DEMO_FXRP_TO_USDT_RATE = 0.5;

/**
 * Build custom instructions for swapping FXRP to USDT and depositing into vault
 *
 * The instruction chain:
 * 1. FXRP.approve(BlazeSwap, fxrpAmount)
 * 2. BlazeSwap.swapExactTokensForTokens(FXRP -> USDT)
 * 3. USDT.approve(UniversalVault, usdtAmount)
 * 4. UniversalVault.deposit(usdtAmount, personalAccount)
 */
export async function buildSwapAndDepositInstructions(
  fxrpAmount: bigint,
  minUsdtOut: bigint,
  personalAccountAddress: Address,
  deadline?: bigint
): Promise<CustomInstruction[]> {
  const fxrpAddress = await getFxrpAddress();
  const effectiveDeadline = deadline ?? BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min

  return [
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
        args: [
          fxrpAmount,
          minUsdtOut,
          [fxrpAddress, SMART_ACCOUNTS_CONFIG.USDT],
          personalAccountAddress,
          effectiveDeadline,
        ],
      }),
    },
    // 3. Approve USDT to UniversalVault
    {
      targetContract: SMART_ACCOUNTS_CONFIG.USDT,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [SMART_ACCOUNTS_CONFIG.UNIVERSAL_VAULT, minUsdtOut],
      }),
    },
    // 4. Deposit USDT into UniversalVault
    {
      targetContract: SMART_ACCOUNTS_CONFIG.UNIVERSAL_VAULT,
      value: 0n,
      data: encodeFunctionData({
        abi: universalVaultAbi,
        functionName: 'deposit',
        args: [minUsdtOut, personalAccountAddress],
      }),
    },
  ];
}

/**
 * Build simple FXRP transfer instruction
 */
export async function buildFxrpTransferInstruction(
  amount: bigint,
  recipientAddress: Address
): Promise<CustomInstruction[]> {
  const fxrpAddress = await getFxrpAddress();

  return [
    {
      targetContract: fxrpAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress, amount],
      }),
    },
  ];
}

/**
 * Encode custom instructions into a bytes32 hash for memo
 */
export async function encodeCustomInstruction(
  instructions: CustomInstruction[],
  walletId: number
): Promise<`0x${string}`> {
  const encodedInstruction = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
    abi: customInstructionsFacetAbi,
    functionName: 'encodeCustomInstruction',
    args: [instructions],
  });

  // Custom instruction type is 0xFF, followed by wallet ID, then the hash
  // Cut off the `0x` prefix and the first 2 bytes to get the length down to 30 bytes
  return ('0xff' + toHex(walletId, { size: 1 }).slice(2) + (encodedInstruction as string).slice(6)) as `0x${string}`;
}

/**
 * Get the instruction fee in XRP for a custom instruction
 */
export async function getCustomInstructionFee(encodedInstruction: `0x${string}`): Promise<number> {
  const feeDrops = await getInstructionFee(encodedInstruction);
  return dropsToXrp(feeDrops);
}

/**
 * Get the hash for a custom instruction (for checking if registered)
 */
export async function getCustomInstructionHash(instructions: CustomInstruction[]): Promise<`0x${string}`> {
  const hash = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
    abi: customInstructionsFacetAbi,
    functionName: 'encodeCustomInstruction',
    args: [instructions],
  });
  return hash as `0x${string}`;
}

/**
 * Check if a custom instruction is already registered on-chain
 */
export async function isInstructionRegistered(instructions: CustomInstruction[]): Promise<boolean> {
  try {
    const hash = await getCustomInstructionHash(instructions);

    // Try to get the instruction - if it exists, it's registered
    const storedInstruction = await publicClient.readContract({
      address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
      abi: customInstructionsFacetAbi,
      functionName: 'getCustomInstruction',
      args: [hash],
    });

    return Array.isArray(storedInstruction) && storedInstruction.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get swap quote from BlazeSwap (FXRP -> USDT)
 * Falls back to demo rate on Coston2 testnet where DEX may not have liquidity
 */
export async function getSwapQuote(fxrpAmount: bigint): Promise<bigint> {
  try {
    const fxrpAddress = await getFxrpAddress();

    const amounts = await publicClient.readContract({
      address: BLAZESWAP_ROUTER,
      abi: blazeSwapRouterAbi,
      functionName: 'getAmountsOut',
      args: [fxrpAmount, [fxrpAddress, SMART_ACCOUNTS_CONFIG.USDT]],
    });

    return (amounts as bigint[])[1];
  } catch (error) {
    console.warn('DEX quote unavailable, using demo rate for testnet:', error);
    // Fallback: Use demo rate (FXRP has 6 decimals, USDT has 6 decimals)
    // 1 FXRP ≈ 0.50 USDT for demo
    const usdtAmount = (fxrpAmount * BigInt(Math.floor(DEMO_FXRP_TO_USDT_RATE * 1000000))) / 1000000n;
    return usdtAmount;
  }
}

/**
 * Calculate minimum output with slippage
 */
export function calculateMinOutput(amount: bigint, slippageBps: number): bigint {
  // slippageBps: 100 = 1%, 50 = 0.5%
  const slippageMultiplier = 10000n - BigInt(slippageBps);
  return (amount * slippageMultiplier) / 10000n;
}

/**
 * Build wrapper-based swap and deposit instructions (PROVEN WORKING!)
 * Uses our deployed SwapAndDepositWrapper contract
 *
 * The instruction chain:
 * 1. FXRP.approve(wrapper, fxrpAmount)
 * 2. wrapper.swapAndDeposit(fxrpAmount, minUsdtOut)
 */
export async function buildWrapperSwapAndDepositInstructions(
  fxrpAmount: bigint,
  minUsdtOut: bigint = 0n
): Promise<CustomInstruction[]> {
  return [
    // 1. Approve FXRP to wrapper
    {
      targetContract: SMART_ACCOUNTS_CONFIG.FXRP,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [SMART_ACCOUNTS_CONFIG.SWAP_DEPOSIT_WRAPPER, fxrpAmount],
      }),
    },
    // 2. Call wrapper.swapAndDeposit
    {
      targetContract: SMART_ACCOUNTS_CONFIG.SWAP_DEPOSIT_WRAPPER,
      value: 0n,
      data: encodeFunctionData({
        abi: swapDepositWrapperAbi,
        functionName: 'swapAndDeposit',
        args: [fxrpAmount, minUsdtOut],
      }),
    },
  ];
}

/**
 * Register custom instruction on-chain using demo relayer wallet
 * DEMO ONLY - In production, use proper relayer infrastructure
 */
export async function registerCustomInstruction(
  instructions: CustomInstruction[]
): Promise<`0x${string}`> {
  console.log('Registering custom instruction with relayer wallet...');

  const hash = await relayerWalletClient.writeContract({
    address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
    abi: customInstructionsFacetAbi,
    functionName: 'registerCustomInstruction',
    args: [instructions],
  });

  console.log('Registration tx:', hash);

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('Registration confirmed!');

  return hash;
}

/**
 * Watch for CustomInstructionExecuted event
 */
export function watchForCustomInstructionExecuted(
  personalAccountAddress: Address,
  encodedInstruction: `0x${string}`,
  timeout: number = 240000 // 4 minutes - proven to work
): Promise<{ success: boolean; shares?: bigint }> {
  return new Promise((resolve) => {
    let found = false;
    const startTime = Date.now();

    const unwatch = publicClient.watchContractEvent({
      address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
      abi: instructionsFacetAbi,
      eventName: 'CustomInstructionExecuted',
      onLogs: (logs) => {
        for (const log of logs) {
          const args = log.args as {
            personalAccount: Address;
            callHash: `0x${string}`;
            customInstruction: unknown[];
          };

          // Match by personal account and call hash (compare after first 4 chars)
          if (
            args.personalAccount?.toLowerCase() === personalAccountAddress.toLowerCase() &&
            args.callHash?.slice(6) === encodedInstruction.slice(6)
          ) {
            found = true;
            unwatch();
            resolve({ success: true });
            return;
          }
        }
      },
    });

    // Poll for timeout
    const checkTimeout = () => {
      if (found) return;
      if (Date.now() - startTime > timeout) {
        unwatch();
        resolve({ success: false });
        return;
      }
      setTimeout(checkTimeout, 5000);
    };
    checkTimeout();
  });
}

export { BLAZESWAP_ROUTER };
