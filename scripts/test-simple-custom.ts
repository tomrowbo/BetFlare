/**
 * Test a SIMPLE custom instruction (just one call)
 * This tests if custom instructions work at all
 */

import { createPublicClient, createWalletClient, http, toHex, erc20Abi, type Address, encodeFunctionData } from 'viem';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import { privateKeyToAccount } from 'viem/accounts';
import { mnemonicToAccount } from 'viem/accounts';
import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import type { Memo } from 'xrpl';
import { ethers } from 'hardhat';
import 'dotenv/config';

const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as Address;
const PERSONAL_ACCOUNT = '0x697B626A5170Dce7028A6cBb7bA494b0cA5C8DB4' as Address;

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
] as const;

async function sendXrplPayment(params: {
  destination: string;
  amount: number;
  memos: Memo[];
  wallet: Wallet;
  client: Client;
}) {
  const { destination, amount, memos, wallet, client } = params;
  await client.connect();
  const tx = await client.autofill({
    TransactionType: 'Payment',
    Account: wallet.address,
    Amount: xrpToDrops(amount),
    Destination: destination,
    Memos: memos,
  });
  const signed = wallet.sign(tx);
  const result = await client.submitAndWait(signed.tx_blob);
  await client.disconnect();
  return result;
}

async function main() {
  console.log('========== SIMPLE CUSTOM INSTRUCTION TEST ==========\n');

  if (!process.env.XRPL_SEED) {
    console.error('ERROR: XRPL_SEED not set in .env');
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  console.log('EVM Signer:', signer.address);

  const xrplClient = new Client('wss://s.altnet.rippletest.net:51233');
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED);
  console.log('XRPL Wallet:', xrplWallet.address);
  console.log('Personal Account:', PERSONAL_ACCOUNT);

  // Get FXRP address
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
  }) as Address;
  console.log('FXRP:', fxrpAddress);

  // Get operator
  const operators = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getXrplProviderWallets',
  }) as string[];
  console.log('Operator:', operators[0]);

  // Create a SIMPLE instruction: just approve a random address for 1 wei
  // This should be harmless and quick to execute
  const simpleInstruction = [
    {
      targetContract: fxrpAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: ['0x0000000000000000000000000000000000000001' as Address, 1n],
      }),
    },
  ];

  console.log('\n--- Simple instruction: approve(0x...0001, 1) ---');
  console.log('Target:', fxrpAddress);
  console.log('Data:', simpleInstruction[0].data);

  // Get hash
  const hash = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: customInstructionsFacetAbi,
    functionName: 'encodeCustomInstruction',
    args: [simpleInstruction],
  });
  console.log('Hash:', hash);

  // Register using ethers signer
  console.log('\n--- Registering instruction ---');
  const masterController = new ethers.Contract(
    MASTER_ACCOUNT_CONTROLLER,
    customInstructionsFacetAbi,
    signer
  );

  try {
    const tx = await masterController.registerCustomInstruction(simpleInstruction);
    console.log('Registration tx:', tx.hash);
    const receipt = await tx.wait();
    console.log('Registration confirmed in block:', receipt.blockNumber);
  } catch (e: any) {
    if (e.message?.includes('AlreadyRegistered')) {
      console.log('Already registered (OK)');
    } else {
      throw e;
    }
  }

  // Encode for XRPL
  const encodedInstruction = ('0xff' + toHex(0, { size: 1 }).slice(2) + (hash as string).slice(6)) as `0x${string}`;
  console.log('Encoded instruction:', encodedInstruction);

  // Get fee
  const fee = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getInstructionFee',
    args: [255n],
  });
  const feeXrp = dropsToXrp(Number(fee));
  console.log('Fee:', feeXrp, 'XRP');

  // Send XRPL payment
  console.log('\n--- Sending XRPL payment ---');
  const xrplTx = await sendXrplPayment({
    destination: operators[0],
    amount: feeXrp,
    memos: [{ Memo: { MemoData: encodedInstruction.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log('XRPL tx:', (xrplTx.result as any).hash);

  // Wait for CustomInstructionExecuted
  console.log('\n--- Waiting for CustomInstructionExecuted event ---');
  console.log('(Waiting up to 5 minutes)');

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

  let executed = false;
  let elapsed = 0;

  const unwatch = publicClient.watchContractEvent({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: instructionsFacetAbi,
    eventName: 'CustomInstructionExecuted',
    onLogs: (logs) => {
      for (const log of logs) {
        const args = log.args as any;
        console.log('Event received! Personal Account:', args.personalAccount);
        if (args.personalAccount?.toLowerCase() === PERSONAL_ACCOUNT.toLowerCase()) {
          executed = true;
          console.log('\n✅ Custom instruction executed!');
          console.log('Call Hash:', args.callHash);
        }
      }
    },
  });

  const timeout = setTimeout(() => {
    console.log('\n❌ TIMEOUT: Custom instruction not executed after 5 minutes');
    console.log('The operator is not processing custom instructions.');
    process.exit(1);
  }, 300000);

  while (!executed) {
    await new Promise((r) => setTimeout(r, 10000));
    elapsed += 10;
    console.log(`  Waiting... ${elapsed}s`);
  }

  clearTimeout(timeout);
  unwatch();
  console.log('\n========== TEST PASSED ==========');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
