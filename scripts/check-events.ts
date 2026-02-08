import { createPublicClient, http, type Address } from 'viem';

const MASTER_ACCOUNT_CONTROLLER = '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address;
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

// Full ABI for events
const eventsAbi = [
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
  {
    type: 'event',
    name: 'InstructionExecuted',
    inputs: [
      { name: 'personalAccount', type: 'address', indexed: true },
      { name: 'transactionId', type: 'bytes32', indexed: true },
      { name: 'paymentReference', type: 'bytes32', indexed: true },
      { name: 'xrplOwner', type: 'string', indexed: false },
      { name: 'instructionId', type: 'uint256', indexed: false },
    ],
  },
] as const;

async function main() {
  console.log('\n=== Recent Events Check ===\n');

  const currentBlock = await publicClient.getBlockNumber();
  const fromBlock = currentBlock - 25n; // RPC limits to 30 blocks

  console.log('Checking blocks', fromBlock.toString(), 'to', currentBlock.toString());
  console.log('Personal Account:', PERSONAL_ACCOUNT);

  // Check for CustomInstructionExecuted events
  const customLogs = await publicClient.getLogs({
    address: MASTER_ACCOUNT_CONTROLLER,
    event: eventsAbi[0],
    fromBlock,
    toBlock: currentBlock,
  });

  console.log('\nCustomInstructionExecuted events (all):', customLogs.length);
  for (const log of customLogs) {
    const args = log.args as any;
    console.log('  Block:', log.blockNumber);
    console.log('  Personal Account:', args.personalAccount);
    console.log('  Call Hash:', args.callHash);
  }

  // Check for InstructionExecuted events
  const instructionLogs = await publicClient.getLogs({
    address: MASTER_ACCOUNT_CONTROLLER,
    event: eventsAbi[1],
    fromBlock,
    toBlock: currentBlock,
  });

  console.log('\nInstructionExecuted events (all):', instructionLogs.length);
  const myLogs = instructionLogs.filter((log: any) =>
    log.args.personalAccount?.toLowerCase() === PERSONAL_ACCOUNT.toLowerCase()
  );
  console.log('For our Personal Account:', myLogs.length);
  for (const log of myLogs) {
    const args = log.args as any;
    console.log('  Block:', log.blockNumber);
    console.log('  Instruction ID:', args.instructionId?.toString());
  }
}

main().catch(console.error);
