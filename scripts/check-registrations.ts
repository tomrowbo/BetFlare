import { createPublicClient, http, type Address } from "viem";

const client = createPublicClient({
  chain: { id: 114, name: "Coston2", rpcUrls: { default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] } }, nativeCurrency: { decimals: 18, name: "C2FLR", symbol: "C2FLR" } } as any,
  transport: http(),
});

const abi = [
  {
    inputs: [{ internalType: "bytes32", name: "_customInstructionHash", type: "bytes32" }],
    name: "getCustomInstruction",
    outputs: [
      {
        components: [
          { name: "targetContract", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function main() {
  // Hashes to check (full bytes32 - pad with leading zeros)
  const hashes = [
    { name: "Modified demo (TEST MESSAGE)", hash: "0x0000dc77b044d09d72a1359b0d29beed0552b9a6a42bf2e9550dd6f400c2963b" },
    { name: "Original demo (Hello World!)", hash: "0x0000e54bf1b4e93c5306e08d919864ec111211c4fb36960261e8018da9959791" },
    { name: "Our wrapper instruction", hash: "0x00006ac64822dcd80794270508c7596f1b352681fc686e3a8249d780161d9c67" },
  ];

  console.log("Checking on-chain registrations...\n");

  for (const { name, hash } of hashes) {
    try {
      const result = await client.readContract({
        address: "0x434936d47503353f06750Db1A444DBDC5F0AD37c" as Address,
        abi,
        functionName: "getCustomInstruction",
        args: [hash as `0x${string}`],
      });
      const calls = result as any[];
      if (calls.length > 0) {
        console.log(`${name}: REGISTERED (${calls.length} calls)`);
        for (let i = 0; i < calls.length; i++) {
          console.log(`  Call ${i + 1}: target=${calls[i].targetContract}, value=${calls[i].value}`);
        }
      } else {
        console.log(`${name}: NOT REGISTERED (empty array)`);
      }
    } catch (e: any) {
      console.log(`${name}: ERROR - ${e.message?.slice(0, 100)}`);
    }
    console.log();
  }
}
main().catch(console.error);
