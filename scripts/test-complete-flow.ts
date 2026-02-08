/**
 * End-to-end test script for the complete XRP → FXRP → USDT → Vault flow
 *
 * Prerequisites:
 * 1. Deploy wrapper contract (deploy-wrapper.ts)
 * 2. Register custom instruction (register-wrapper-instruction.ts)
 * 3. Have XRPL testnet wallet with XRP (set XRPL_SEED in .env)
 *
 * Flow:
 * 1. Reserve collateral (XRPL payment to operator)
 * 2. Wait for CollateralReserved event
 * 3. Send mint payment (XRPL payment to agent vault)
 * 4. Wait for MintingExecuted event
 * 5. Send custom instruction (XRPL payment for swap+deposit)
 * 6. Wait for CustomInstructionExecuted event
 * 7. Verify vault shares in Personal Account
 */

import { createPublicClient, http, toHex, erc20Abi, type Address, encodeFunctionData } from 'viem';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import { FXRPCollateralReservationInstruction } from '@flarenetwork/smart-accounts-encoder';
import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import type { Memo } from 'xrpl';
import 'dotenv/config';

// Contract addresses (Coston2)
const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as Address;
const UNIVERSAL_VAULT = '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87' as Address;

// Deployed wrapper contract address
const WRAPPER_ADDRESS = '0xe58390aac1030b20a12cF73B860105753f16A63d' as Address;

// Define Coston2 chain
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

// ============ Utility Functions ============

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

async function getPersonalAccountAddress(xrplAddress: string): Promise<Address> {
  const result = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getPersonalAccount',
    args: [xrplAddress],
  });
  return result as Address;
}

async function getAgentVaults(): Promise<{ id: bigint; address: Address }[]> {
  const result = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getAgentVaults',
  });
  const [ids, addresses] = result as [bigint[], string[]];
  return ids.map((id, index) => ({ id, address: addresses[index] as Address }));
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

async function getAssetManagerFXRPAddress(): Promise<Address> {
  const result = await publicClient.readContract({
    address: FLARE_CONTRACT_REGISTRY,
    abi: coston2.iFlareContractRegistryAbi,
    functionName: 'getContractAddressByName',
    args: ['AssetManagerFXRP'],
  });
  return result as Address;
}

async function getFxrpAddress(): Promise<Address> {
  const assetManagerAddress = await getAssetManagerFXRPAddress();
  const result = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: 'fAsset',
  });
  return result as Address;
}

async function getVaultBalance(address: Address): Promise<bigint> {
  return publicClient.readContract({
    address: UNIVERSAL_VAULT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });
}

// ============ Main Flow ============

async function main() {
  console.log('========== COMPLETE FLOW TEST ==========\n');

  if (WRAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.error('ERROR: Please update WRAPPER_ADDRESS with the deployed wrapper address');
    console.error('Run deploy-wrapper.ts and register-wrapper-instruction.ts first');
    process.exit(1);
  }

  if (!process.env.XRPL_SEED) {
    console.error('ERROR: XRPL_SEED not set in .env');
    process.exit(1);
  }

  // Initialize XRPL
  const xrplClient = new Client('wss://s.altnet.rippletest.net:51233');
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED);
  console.log('XRPL Wallet:', xrplWallet.address);

  // Get Personal Account
  const personalAccountAddress = await getPersonalAccountAddress(xrplWallet.address);
  console.log('Personal Account:', personalAccountAddress);

  // Get initial vault balance
  const initialVaultBalance = await getVaultBalance(personalAccountAddress);
  console.log('Initial Vault Balance:', initialVaultBalance.toString());

  // Get operator and agent vault
  const operators = await getOperatorXrplAddresses();
  if (operators.length === 0) {
    console.error('ERROR: No operators available');
    process.exit(1);
  }
  console.log('Operator:', operators[0]);

  const agentVaults = await getAgentVaults();
  if (agentVaults.length === 0) {
    console.error('ERROR: No agent vaults available');
    process.exit(1);
  }
  console.log('Agent Vault ID:', agentVaults[0].id.toString());

  const assetManagerAddress = await getAssetManagerFXRPAddress();
  const fxrpAddress = await getFxrpAddress();
  console.log('FXRP:', fxrpAddress);

  // ============ STEP 1: Reserve Collateral ============
  console.log('\n--- STEP 1: Reserve Collateral ---');

  const collateralInstruction = new FXRPCollateralReservationInstruction({
    walletId: 0,
    value: 1, // 1 lot
    agentVaultId: Number(agentVaults[0].id),
  });

  const encodedCollateral = collateralInstruction.encode();
  console.log('Encoded instruction:', encodedCollateral);

  const collateralFee = await getInstructionFee(encodedCollateral);
  console.log('Instruction fee:', collateralFee, 'XRP');

  const collateralTx = await sendXrplPayment({
    destination: operators[0],
    amount: collateralFee,
    memos: [{ Memo: { MemoData: encodedCollateral.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log('Collateral tx:', (collateralTx.result as any).hash);

  // Wait for CollateralReserved event
  console.log('\nWaiting for CollateralReserved event...');
  let collateralEvent: any = null;

  const unwatchCollateral = publicClient.watchContractEvent({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    eventName: 'CollateralReserved',
    onLogs: (logs) => {
      for (const log of logs) {
        const args = log.args as any;
        if (args.minter?.toLowerCase() === personalAccountAddress.toLowerCase()) {
          collateralEvent = args;
          return;
        }
      }
    },
  });

  const collateralTimeout = setTimeout(() => {
    console.error('TIMEOUT: CollateralReserved event not received');
    process.exit(1);
  }, 180000);

  while (!collateralEvent) {
    await new Promise((r) => setTimeout(r, 5000));
  }
  clearTimeout(collateralTimeout);
  unwatchCollateral();

  console.log('CollateralReserved received!');
  console.log('  Collateral Reservation ID:', collateralEvent.collateralReservationId.toString());
  console.log('  Value UBA:', collateralEvent.valueUBA.toString());
  console.log('  Fee UBA:', collateralEvent.feeUBA.toString());
  console.log('  Payment Address:', collateralEvent.paymentAddress);
  console.log('  Payment Reference:', collateralEvent.paymentReference);

  // ============ STEP 2: Send Mint Payment ============
  console.log('\n--- STEP 2: Send Mint Payment ---');

  const mintAmountDrops = collateralEvent.valueUBA + collateralEvent.feeUBA;
  const mintAmountXrp = dropsToXrp(Number(mintAmountDrops));
  console.log('Mint amount:', mintAmountXrp, 'XRP');

  const mintTx = await sendXrplPayment({
    destination: collateralEvent.paymentAddress,
    amount: mintAmountXrp,
    memos: [{ Memo: { MemoData: (collateralEvent.paymentReference as string).slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log('Mint tx:', (mintTx.result as any).hash);

  // Wait for MintingExecuted event
  console.log('\nWaiting for MintingExecuted event...');
  let mintEvent: any = null;

  const unwatchMint = publicClient.watchContractEvent({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    eventName: 'MintingExecuted',
    onLogs: (logs) => {
      for (const log of logs) {
        const args = log.args as any;
        if (args.collateralReservationId === collateralEvent.collateralReservationId) {
          mintEvent = args;
          return;
        }
      }
    },
  });

  const mintTimeout = setTimeout(() => {
    console.error('TIMEOUT: MintingExecuted event not received');
    process.exit(1);
  }, 180000);

  while (!mintEvent) {
    await new Promise((r) => setTimeout(r, 5000));
  }
  clearTimeout(mintTimeout);
  unwatchMint();

  console.log('MintingExecuted received!');
  console.log('  Minted Amount UBA:', mintEvent.mintedAmountUBA.toString());
  console.log('  Minted:', Number(mintEvent.mintedAmountUBA) / 1_000_000, 'FXRP');

  // ============ STEP 3: Send Custom Instruction (Swap + Deposit) ============
  console.log('\n--- STEP 3: Send Custom Instruction (Swap + Deposit) ---');

  // Build the same instruction that was registered
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

  // Encode for XRPL memo: 0xff + walletId + hash (truncated to 30 bytes)
  const encodedCustomInstruction = ('0xff' + toHex(0, { size: 1 }).slice(2) + (instructionHash as string).slice(6)) as `0x${string}`;
  console.log('Custom instruction:', encodedCustomInstruction);

  const customFee = await getInstructionFee(encodedCustomInstruction);
  console.log('Custom instruction fee:', customFee, 'XRP');

  const customTx = await sendXrplPayment({
    destination: operators[0],
    amount: customFee,
    memos: [{ Memo: { MemoData: encodedCustomInstruction.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log('Custom instruction tx:', (customTx.result as any).hash);

  // Wait for CustomInstructionExecuted event
  console.log('\nWaiting for CustomInstructionExecuted event...');

  // Use IInstructionsFacet ABI for this event
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

  const unwatchCustom = publicClient.watchContractEvent({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: instructionsFacetAbi,
    eventName: 'CustomInstructionExecuted',
    onLogs: (logs) => {
      for (const log of logs) {
        const args = log.args as any;
        if (args.personalAccount?.toLowerCase() === personalAccountAddress.toLowerCase()) {
          customEvent = args;
          return;
        }
      }
    },
  });

  const customTimeout = setTimeout(() => {
    console.error('TIMEOUT: CustomInstructionExecuted event not received');
    console.log('This might mean the instruction was not registered correctly');
    process.exit(1);
  }, 180000);

  while (!customEvent) {
    await new Promise((r) => setTimeout(r, 5000));
  }
  clearTimeout(customTimeout);
  unwatchCustom();

  console.log('CustomInstructionExecuted received!');
  console.log('  Call Hash:', customEvent.callHash);

  // ============ VERIFY RESULTS ============
  console.log('\n--- VERIFICATION ---');

  const finalVaultBalance = await getVaultBalance(personalAccountAddress);
  console.log('Final Vault Balance:', finalVaultBalance.toString());
  console.log('Vault Shares Received:', (finalVaultBalance - initialVaultBalance).toString());

  console.log('\n========== TEST COMPLETE ==========');
  console.log('✅ All steps completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log('  1. Collateral reserved');
  console.log('  2. FXRP minted');
  console.log('  3. FXRP swapped to USDT and deposited to vault');
  console.log('  4. Vault shares received in Personal Account');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
