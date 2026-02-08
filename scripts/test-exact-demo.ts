/**
 * This script is an EXACT copy of the demo custom-instructions.ts
 * with only the instruction data changed to use our wrapper
 */

import { encodeFunctionData, toHex, fromHex, erc20Abi, type Address } from "viem";
import { createPublicClient, http } from "viem";
import { flareTestnet } from "viem/chains";
import { Client, Wallet, xrpToDrops, dropsToXrp } from "xrpl";
import type { Memo } from "xrpl";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import "dotenv/config";

// === EXACT COPY OF DEMO ABIS ===

const customInstructionsFacetAbi = [
  {
    inputs: [{ internalType: "bytes32", name: "customInstructionHash", type: "bytes32" }],
    name: "AlreadyRegistered",
    type: "error",
  },
  { inputs: [], name: "EmptyCustomInstruction", type: "error" },
  {
    inputs: [{ internalType: "bytes32", name: "customInstructionHash", type: "bytes32" }],
    name: "InvalidCustomInstruction",
    type: "error",
  },
  { inputs: [], name: "TargetAddressZero", type: "error" },
  { inputs: [{ internalType: "address", name: "target", type: "address" }], name: "TargetNotAContract", type: "error" },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "bytes32", name: "customInstructionHash", type: "bytes32" }],
    name: "CustomInstructionRegistered",
    type: "event",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "targetContract", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "bytes", name: "data", type: "bytes" },
        ],
        internalType: "struct CustomInstructions.CustomCall[]",
        name: "_customInstruction",
        type: "tuple[]",
      },
    ],
    name: "encodeCustomInstruction",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_customInstructionHash", type: "bytes32" }],
    name: "getCustomInstruction",
    outputs: [
      {
        components: [
          { internalType: "address", name: "targetContract", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "bytes", name: "data", type: "bytes" },
        ],
        internalType: "struct CustomInstructions.CustomCall[]",
        name: "_customInstruction",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const iInstructionsFacetAbi = [
  {
    type: "event",
    name: "CustomInstructionExecuted",
    inputs: [
      { name: "personalAccount", type: "address", indexed: true, internalType: "address" },
      { name: "callHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      {
        name: "customInstruction",
        type: "tuple[]",
        indexed: false,
        internalType: "struct CustomInstructions.CustomCall[]",
        components: [
          { name: "targetContract", type: "address", internalType: "address" },
          { name: "value", type: "uint256", internalType: "uint256" },
          { name: "data", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    anonymous: false,
  },
] as const;

// === EXACT COPY OF DEMO CONSTANTS ===

const MASTER_ACCOUNT_CONTROLLER_ADDRESS = "0x434936d47503353f06750Db1A444DBDC5F0AD37c" as Address;

// === EXACT COPY OF DEMO CLIENT (using flareTestnet) ===

const publicClient = createPublicClient({
  chain: flareTestnet,
  transport: http(),
});

// === EXACT COPY OF DEMO UTILS ===

type CustomInstruction = {
  targetContract: Address;
  value: bigint;
  data: `0x${string}`;
};

async function getOperatorXrplAddresses() {
  const result = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getXrplProviderWallets",
    args: [],
  });
  return result as string[];
}

async function getPersonalAccountAddress(xrplAddress: string) {
  const personalAccountAddress = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getPersonalAccount",
    args: [xrplAddress],
  });
  return personalAccountAddress as Address;
}

async function getInstructionFee(encodedInstruction: string) {
  const instructionId = encodedInstruction.slice(0, 4);
  const instructionIdDecimal = fromHex(instructionId as `0x${string}`, "bigint");

  console.log("instructionIdDecimal:", instructionIdDecimal, "\n");

  const requestFee = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getInstructionFee",
    args: [instructionIdDecimal],
  });
  return dropsToXrp(Number(requestFee));
}

// === EXACT COPY OF DEMO XRPL UTILS ===

type SendXrplPaymentInputType = {
  destination: string;
  amount: number;
  memos: Memo[];
  wallet: Wallet;
  client: Client;
};

async function sendXrplPayment({ destination, memos, amount, wallet, client }: SendXrplPaymentInputType) {
  await client.connect();

  const preparedTransaction = await client.autofill({
    TransactionType: "Payment",
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

// === EXACT COPY OF DEMO ENCODE FUNCTION ===

async function encodeCustomInstruction(instructions: CustomInstruction[], walletId: number) {
  const encodedInstruction = (await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: customInstructionsFacetAbi,
    functionName: "encodeCustomInstruction",
    args: [instructions],
  })) as `0x${string}`;
  // NOTE:(Nik) We cut off the `0x` prefix and the first 2 bytes to get the length down to 30 bytes
  return ("0xff" + toHex(walletId, { size: 1 }).slice(2) + encodedInstruction.slice(6)) as `0x${string}`;
}

// === EXACT COPY OF DEMO SEND FUNCTION ===

async function sendCustomInstruction({
  encodedInstruction,
  xrplClient,
  xrplWallet,
}: {
  encodedInstruction: `0x${string}`;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const operatorXrplAddress = (await getOperatorXrplAddresses())[0] as string;

  const instructionFee = await getInstructionFee(encodedInstruction);
  console.log("Instruction fee:", instructionFee, "\n");

  const customInstructionTransaction = await sendXrplPayment({
    destination: operatorXrplAddress,
    amount: instructionFee,
    memos: [{ Memo: { MemoData: encodedInstruction.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });

  return customInstructionTransaction;
}

// === EXACT COPY OF DEMO WAIT FUNCTION ===

async function waitForCustomInstructionExecutedEvent({
  encodedInstruction,
  personalAccountAddress,
}: {
  encodedInstruction: `0x${string}`;
  personalAccountAddress: string;
}) {
  type CustomInstructionExecutedEventType = {
    args: {
      personalAccount: Address;
      callHash: `0x${string}`;
      customInstruction: CustomInstruction[];
    };
  };

  let customInstructionExecutedEvent: CustomInstructionExecutedEventType | undefined;
  let customInstructionExecutedEventFound = false;

  const unwatchCustomInstructionExecuted = publicClient.watchContractEvent({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iInstructionsFacetAbi,
    eventName: "CustomInstructionExecuted",
    onLogs: (logs) => {
      for (const log of logs) {
        customInstructionExecutedEvent = log as any;
        console.log("Event received:", log);
        if (
          customInstructionExecutedEvent!.args.callHash.slice(6) !== encodedInstruction.slice(6) ||
          customInstructionExecutedEvent!.args.personalAccount.toLowerCase() !== personalAccountAddress.toLowerCase()
        ) {
          continue;
        }
        customInstructionExecutedEventFound = true;
        break;
      }
    },
  });

  console.log("Waiting for CustomInstructionExecuted event...");

  // Add timeout
  const timeout = setTimeout(() => {
    console.log("\nTIMEOUT after 5 minutes");
    process.exit(1);
  }, 300000);

  while (!customInstructionExecutedEventFound) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log("  Still waiting...");
  }

  clearTimeout(timeout);
  unwatchCustomInstructionExecuted();

  return customInstructionExecutedEvent;
}

// === MAIN - USING OUR REGISTERED INSTRUCTION ===

async function main() {
  const walletId = 0;

  // Our wrapper addresses
  const WRAPPER_ADDRESS = "0xe58390aac1030b20a12cF73B860105753f16A63d" as Address;
  const FXRP_ADDRESS = "0x0b6A3645c240605887a5532109323A3E12273dc7" as Address;

  const fxrpAmount = 10_000_000n; // 10 FXRP
  const minUsdtOut = 4_500_000n; // 4.5 USDT

  const wrapperAbi = [
    {
      inputs: [
        { internalType: "uint256", name: "fxrpAmount", type: "uint256" },
        { internalType: "uint256", name: "minUsdtOut", type: "uint256" },
      ],
      name: "swapAndDeposit",
      outputs: [{ internalType: "uint256", name: "shares", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;

  // Our custom instructions (same as registered)
  const customInstructions = [
    {
      targetContract: FXRP_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [WRAPPER_ADDRESS, fxrpAmount],
      }),
    },
    {
      targetContract: WRAPPER_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: wrapperAbi,
        functionName: "swapAndDeposit",
        args: [fxrpAmount, minUsdtOut],
      }),
    },
  ] as CustomInstruction[];
  console.log("Custom instructions:", customInstructions, "\n");

  // EXACT DEMO PATTERN: Use env vars
  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL || "wss://s.altnet.rippletest.net:51233");
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const personalAccountAddress = await getPersonalAccountAddress(xrplWallet.address);
  console.log("Personal account address:", personalAccountAddress, "\n");

  // Skip registration - already registered
  // const customInstructionCallHash = await registerCustomInstruction(customInstructions);
  // console.log("Custom instruction call hash:", customInstructionCallHash, "\n");

  // EXACT DEMO PATTERN: encode instruction
  const encodedInstruction = await encodeCustomInstruction(customInstructions, walletId);
  console.log("Encoded instructions:", encodedInstruction, "\n");

  // EXACT DEMO PATTERN: send custom instruction
  const customInstructionTransaction = await sendCustomInstruction({
    encodedInstruction,
    xrplClient,
    xrplWallet,
  });
  console.log("Custom instruction transaction hash:", customInstructionTransaction.result.hash, "\n");

  // EXACT DEMO PATTERN: wait for event
  const customInstructionExecutedEvent = await waitForCustomInstructionExecutedEvent({
    encodedInstruction,
    personalAccountAddress,
  });
  console.log("CustomInstructionExecuted event:", customInstructionExecutedEvent, "\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
