/**
 * Test just the custom instruction step (Step 3)
 *
 * Prerequisites:
 * - Personal Account already has 10 FXRP (from previous mint)
 * - Personal Account has C2FLR (just fauceted)
 * - Custom instruction already registered
 */

import { createPublicClient, http, toHex, erc20Abi, type Address, encodeFunctionData } from 'viem';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import type { Memo } from 'xrpl';
import 'dotenv/config';

// Contract addresses (Coston2)
const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as Address;
const PERSONAL_ACCOUNT = '0x697B626A5170Dce7028A6cBb7bA494b0cA5C8DB4' as Address;
const UNIVERSAL_VAULT = '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87' as Address;
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
    name: 'encodeCustomInstruction',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
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

async function sendXrplPayment({
  destination,
  amount,
  memos,
  wallet,
  client,
}: {
  destination: string;
  amount: number;
  memos: Memo[];
  wallet: Wallet;
  client: Client;
}) {
  await client.connect();

  const preparedTransaction = await client.autofill({
    TransactionType: 'Payment',
    Account: wallet.address,
    Amount: xrpToDrops(amount),
    Destination: destination,
    Memos: memos,
  });

  const signedTransaction = wallet.sign(preparedTransaction);
  const transaction = await client.submitAndWait(signedTransaction.tx_blob);

  await client.disconnect();

  return transaction;
}

async function getOperatorXrplAddresses(): Promise<string[]> {
  const result = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getXrplProviderWallets',
  });
  return result as string[];
}

async function getInstructionFee(encodedInstruction: string): Promise<number> {
  const instructionId = encodedInstruction.slice(0, 4);
  const instructionIdDecimal = BigInt(instructionId);

  const requestFee = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getInstructionFee',
    args: [instructionIdDecimal],
  });

  return dropsToXrp(Number(requestFee));
}

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
  console.log('========== CUSTOM INSTRUCTION TEST ==========\n');
  console.log('Testing custom instruction now that C2FLR is in Personal Account\n');

  if (!process.env.XRPL_SEED) {
    console.error('ERROR: XRPL_SEED not set in .env');
    process.exit(1);
  }

  // Initialize XRPL
  const xrplClient = new Client('wss://s.altnet.rippletest.net:51233');
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED);
  console.log('XRPL Wallet:', xrplWallet.address);
  console.log('Personal Account:', PERSONAL_ACCOUNT);

  // Check C2FLR balance
  const c2flrBalance = await publicClient.getBalance({ address: PERSONAL_ACCOUNT });
  console.log('C2FLR Balance:', c2flrBalance.toString(), '(' + Number(c2flrBalance) / 1e18 + ' C2FLR)');

  if (c2flrBalance === 0n) {
    console.error('ERROR: Personal Account has no C2FLR!');
    console.log('Faucet C2FLR to', PERSONAL_ACCOUNT, 'at https://faucet.flare.network/coston2');
    process.exit(1);
  }

  // Check FXRP balance
  const fxrpAddress = await getFxrpAddress();
  console.log('FXRP Address:', fxrpAddress);

  const fxrpBalance = await publicClient.readContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [PERSONAL_ACCOUNT],
  });
  console.log('FXRP Balance:', fxrpBalance.toString(), '(' + Number(fxrpBalance) / 1e6 + ' FXRP)');

  if (fxrpBalance === 0n) {
    console.error('ERROR: Personal Account has no FXRP!');
    process.exit(1);
  }

  // Check vault balance before
  const vaultBalanceBefore = await publicClient.readContract({
    address: UNIVERSAL_VAULT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [PERSONAL_ACCOUNT],
  });
  console.log('Vault Balance Before:', vaultBalanceBefore.toString());

  // Get operator
  const operators = await getOperatorXrplAddresses();
  if (operators.length === 0) {
    console.error('ERROR: No operators available');
    process.exit(1);
  }
  console.log('Operator:', operators[0]);

  // Build the custom instruction
  const fxrpAmount = 10_000_000n; // 10 FXRP
  const minUsdtOut = 4_500_000n; // 4.5 USDT

  const instructions = [
    {
      targetContract: fxrpAddress,
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

  // Get the instruction hash
  const instructionHash = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: customInstructionsFacetAbi,
    functionName: 'encodeCustomInstruction',
    args: [instructions],
  });

  console.log('\n--- Sending Custom Instruction ---');
  console.log('Instruction hash:', instructionHash);

  // Encode for XRPL memo: 0xff + walletId + hash (truncated to 30 bytes)
  const encodedCustomInstruction = ('0xff' + toHex(0, { size: 1 }).slice(2) + (instructionHash as string).slice(6)) as `0x${string}`;
  console.log('Encoded instruction:', encodedCustomInstruction);
  console.log('Encoded length:', (encodedCustomInstruction.length - 2) / 2, 'bytes');

  const customFee = await getInstructionFee(encodedCustomInstruction);
  console.log('Instruction fee:', customFee, 'XRP');

  const customTx = await sendXrplPayment({
    destination: operators[0],
    amount: customFee,
    memos: [{ Memo: { MemoData: encodedCustomInstruction.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log('XRPL transaction hash:', (customTx.result as any).hash);

  // Wait for CustomInstructionExecuted event
  console.log('\nWaiting for CustomInstructionExecuted event...');
  console.log('(This may take 1-3 minutes for the operator to process)\n');

  const instructionsFacetAbi = [
    {
      type: 'event',
      name: 'CustomInstructionExecuted',
      inputs: [
        { name: 'personalAccount', type: 'address', indexed: true },
        { name: 'callHash', type: 'bytes32', indexed: true },
        {
          name: 'customInstruction',
          type: 'tuple[]',
          indexed: false,
          components: [
            { name: 'targetContract', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' },
          ],
        },
      ],
    },
  ] as const;

  let customEvent: any = null;
  let elapsed = 0;

  const unwatchCustom = publicClient.watchContractEvent({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: instructionsFacetAbi,
    eventName: 'CustomInstructionExecuted',
    onLogs: (logs) => {
      for (const log of logs) {
        const args = log.args as any;
        console.log('Event received for account:', args.personalAccount);
        if (args.personalAccount?.toLowerCase() === PERSONAL_ACCOUNT.toLowerCase()) {
          customEvent = args;
          return;
        }
      }
    },
  });

  const customTimeout = setTimeout(() => {
    console.error('\nTIMEOUT: CustomInstructionExecuted event not received after 5 minutes');
    console.log('The operator may still be processing, or there may be an issue.');
    process.exit(1);
  }, 300000); // 5 minutes

  while (!customEvent) {
    await new Promise((r) => setTimeout(r, 10000));
    elapsed += 10;
    console.log(`  Waiting... ${elapsed}s`);
  }
  clearTimeout(customTimeout);
  unwatchCustom();

  console.log('\n✅ CustomInstructionExecuted received!');
  console.log('  Call Hash:', customEvent.callHash);

  // Check vault balance after
  const vaultBalanceAfter = await publicClient.readContract({
    address: UNIVERSAL_VAULT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [PERSONAL_ACCOUNT],
  });
  console.log('\n--- RESULTS ---');
  console.log('Vault Balance Before:', vaultBalanceBefore.toString());
  console.log('Vault Balance After:', vaultBalanceAfter.toString());
  console.log('Vault Shares Received:', (vaultBalanceAfter - vaultBalanceBefore).toString());

  console.log('\n========== TEST COMPLETE ==========');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
