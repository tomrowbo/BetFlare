import { createPublicClient, http, type Address } from 'viem';

const BLAZESWAP_ROUTER = '0x7Ba34bDCA39C8B6082b0D730C3cD8537F927C9ba' as Address;
const FXRP = '0x0b6A3645c240605887a5532109323A3E12273dc7' as Address;
const USDT = '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F' as Address;

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

const routerAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function main() {
  console.log('\n=== Swap Liquidity Check ===\n');
  console.log('Router:', BLAZESWAP_ROUTER);
  console.log('FXRP:', FXRP);
  console.log('USDT:', USDT);

  const fxrpAmount = 10_000_000n; // 10 FXRP

  try {
    const amounts = await publicClient.readContract({
      address: BLAZESWAP_ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [fxrpAmount, [FXRP, USDT]],
    });

    console.log('\n✅ Liquidity exists!');
    console.log('Input:', Number(amounts[0]) / 1e6, 'FXRP');
    console.log('Output:', Number(amounts[1]) / 1e6, 'USDT');
  } catch (e: any) {
    console.log('\n❌ No liquidity or pair does not exist');
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
