// Contract addresses on Coston2 (UPGRADEABLE via UUPS)
export const CONTRACTS = {
  usdt: '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F',
  conditionalTokens: '0xCe9070d4C6940e7528b418cFB36087345f947c49',
  resolver: '0xd8B47D970077D6752111dd176Dd0cce558e91445',
  fpmm: '0x9Fe173ec76c04d0198A14a29d61be81374A0B88E',
  // Universal Vault System (immediate routing) - UUPS Proxies
  universalVault: '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87',
  vault: '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87',
  liquidityRouter: '0xD6473a91aC0C62e6F2BC1FF60e02C59B0237b4ac',
} as const;

// FTSO Registry on Coston2
export const FTSO_REGISTRY = '0xe80ebb4d949bb15a78d1209b84c9b10c4cd3bd0f';

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
