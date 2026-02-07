// Contract addresses on Coston2 (UPGRADEABLE via UUPS)
export const CONTRACTS = {
  usdt: '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F',
  conditionalTokens: '0xCe9070d4C6940e7528b418cFB36087345f947c49',
  // Universal Vault System (immediate routing) - UUPS Proxies
  universalVault: '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87',
  vault: '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87',
  liquidityRouter: '0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac',
} as const;

// FTSO Registry on Coston2 (correct address)
export const FTSO_REGISTRY = '0x48Da21ce34966A64E267CeFb78012C0282D0Ac87';

// Market definitions
export interface Market {
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: 'Price' | 'DeFi' | 'Ecosystem';
  fpmm: string;
  resolver: string;
  marketId: string;
  conditionId: string;
  resolutionTime: number; // Unix timestamp
  symbol: string; // FTSO symbol (e.g., "testXRP")
  targetPrice: number; // 5 decimals (e.g., 300000 = $3.00)
  isAbove: boolean;
}

export const MARKETS: Market[] = [
  {
    slug: 'xrp-above-150-30min',
    title: 'Will XRP be above $1.50 in 30 minutes?',
    description: 'Market resolves YES if testXRP price is above $1.50 at resolution time.',
    icon: '⏱️',
    category: 'Price',
    fpmm: '0x97D8Bf27dC27C821EaB066f098A611BD7f8cBe89',
    resolver: '0x34d086c64AEA96a40c0a61fBEF5b3DC28e01a731',
    marketId: '0x204f8b1497863e93a74bf1431047e316905340724da4744975ba1b37b6f82bcd',
    conditionId: '0x204f8b1497863e93a74bf1431047e316905340724da4744975ba1b37b6f82bcd',
    resolutionTime: 1770477840,
    symbol: 'testXRP',
    targetPrice: 150000,
    isAbove: true,
  },
  {
    slug: 'xrp-above-250-test',
    title: 'Will XRP be above $2.50?',
    description: 'Resolves YES if testXRP price is above $2.50 at resolution time according to Flare FTSO.',
    icon: '💰',
    category: 'Price',
    fpmm: '0xf4e6EBf74f131F2780a535D98F6229812B76c595',
    resolver: '0xe11752Ec5Ae48000FB2Dc1A167883EAE6eE058f6',
    marketId: '0xbd8dee356f19500dd9edb3c5d8cd26f948cd8f24190d02abde6b3a0e17f4e3dd',
    conditionId: '0xbd8dee356f19500dd9edb3c5d8cd26f948cd8f24190d02abde6b3a0e17f4e3dd',
    resolutionTime: 1770467222, // ~12:27 UTC
    symbol: 'testXRP',
    targetPrice: 250000,
    isAbove: true,
  },
  {
    slug: 'xrp-above-3',
    title: 'Will XRP be above $3.00?',
    description: 'Resolves YES if testXRP price is above $3.00 at resolution time according to Flare FTSO.',
    icon: '💰',
    category: 'Price',
    fpmm: '0xADe505A8CEF91C92cd3cc1B6ea4a66C59AAf4000',
    resolver: '0xCa2BdF080B3C8c68290FC0b5ED4a62f493120fAb',
    marketId: '0x087501a66c9f49a0e6fa2e106ad9fde9122c0ebb49377a923297d6b6bb48504e',
    conditionId: '0x087501a66c9f49a0e6fa2e106ad9fde9122c0ebb49377a923297d6b6bb48504e',
    resolutionTime: 1770598863, // Feb 9, 2026 ~01:01 UTC
    symbol: 'testXRP',
    targetPrice: 300000,
    isAbove: true,
  },
  {
    slug: 'xrp-above-2-resolved',
    title: 'Will XRP be above $2.00?',
    description: 'Resolves YES if testXRP price is above $2.00 at resolution time according to Flare FTSO.',
    icon: '🧪',
    category: 'Price',
    fpmm: '0xB8f9b6b2Cf196e906FF312348EEB0690C7F61f8e',
    resolver: '0xBF48D254b21EcB29b421f9559EFDFa9a1122BCAB',
    marketId: '0x6932b69f52d753c141d5661aefe9631daced02958de20fba61156d0a5580a2ab',
    conditionId: '0x6932b69f52d753c141d5661aefe9631daced02958de20fba61156d0a5580a2ab',
    resolutionTime: 1738890058, // Already resolved - NO won
    symbol: 'testXRP',
    targetPrice: 200000,
    isAbove: true,
  },
];

// Helper to get market by slug
export function getMarketBySlug(slug: string): Market | undefined {
  return MARKETS.find(m => m.slug === slug);
}

// Helper to categorize markets
export function categorizeMarkets(markets: Market[]) {
  const now = Math.floor(Date.now() / 1000);
  return {
    active: markets.filter(m => m.resolutionTime > now),
    awaitingResolution: markets.filter(m => m.resolutionTime <= now), // Need to check resolved status on-chain
    resolved: [] as Market[], // Determined by on-chain check
  };
}

// ABIs in proper JSON format for wagmi/viem
export const FPMM_ABI = [
  { name: 'buyYes', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'investmentAmount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'buyNo', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'investmentAmount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'sellYes', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokensToSell', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'sellNo', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokensToSell', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getYesPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getNoPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'calcBuyYes', type: 'function', stateMutability: 'view', inputs: [{ name: 'investmentAmount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'calcBuyNo', type: 'function', stateMutability: 'view', inputs: [{ name: 'investmentAmount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'yesReserve', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'noReserve', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'resolved', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'yesPositionId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'noPositionId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  // Events for price history
  { name: 'Buy', type: 'event', inputs: [{ name: 'buyer', type: 'address', indexed: true }, { name: 'isYes', type: 'bool', indexed: false }, { name: 'investmentAmount', type: 'uint256', indexed: false }, { name: 'tokensReceived', type: 'uint256', indexed: false }] },
  { name: 'Sell', type: 'event', inputs: [{ name: 'seller', type: 'address', indexed: true }, { name: 'isYes', type: 'bool', indexed: false }, { name: 'tokensReturned', type: 'uint256', indexed: false }, { name: 'collateralReceived', type: 'uint256', indexed: false }] },
] as const;

export const VAULT_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }, { name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalAssets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'convertToAssets', type: 'function', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getApyBps', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

export const CONDITIONAL_TOKENS_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'redeemPositions', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [] },
  { name: 'isResolved', type: 'function', stateMutability: 'view', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'getPayoutNumerator', type: 'function', stateMutability: 'view', inputs: [{ name: 'conditionId', type: 'bytes32' }, { name: 'outcomeIndex', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const UNIVERSAL_VAULT_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }, { name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalAssets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'convertToAssets', type: 'function', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalFeesReceived', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const LIQUIDITY_ROUTER_ABI = [
  { name: 'getActiveMarketsCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getActiveMarkets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address[]' }] },
  { name: 'getTotalDeployed', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getMarketAllocation', type: 'function', stateMutability: 'view', inputs: [{ name: 'fpmm', type: 'address' }], outputs: [{ name: 'deployedAmount', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'currentLiquidity', type: 'uint256' }] },
] as const;

export const FTSO_RESOLVER_ABI = [
  { name: 'resolve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'marketId', type: 'bytes32' }], outputs: [] },
  { name: 'getMarket', type: 'function', stateMutability: 'view', inputs: [{ name: 'marketId', type: 'bytes32' }], outputs: [{ name: 'symbol', type: 'string' }, { name: 'targetPrice', type: 'uint256' }, { name: 'resolutionTime', type: 'uint256' }, { name: 'isAbove', type: 'bool' }, { name: 'resolved', type: 'bool' }, { name: 'conditionId', type: 'bytes32' }] },
  { name: 'getCurrentPrice', type: 'function', stateMutability: 'view', inputs: [{ name: 'symbol', type: 'string' }], outputs: [{ name: 'price', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }] },
] as const;
