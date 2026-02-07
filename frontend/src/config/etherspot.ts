// Etherspot Smart Account Configuration for BetFlare
// Uses Arka paymaster for gasless transactions on Flare Coston2

export const ETHERSPOT_CONFIG = {
  // API key for Etherspot bundler and paymaster
  apiKey: 'etherspot_HRAmb3kXUy78d6nMpHnBpp',

  // Flare Coston2 testnet
  chainId: 114,

  // Arka paymaster URL with sponsor mode (we pay gas)
  paymasterUrl: 'https://arka.etherspot.io/v2/114/etherspot_HRAmb3kXUy78d6nMpHnBpp',

  // Paymaster context for sponsored transactions
  paymasterContext: {
    mode: 'sponsor'
  },
} as const;

// Web3Auth configuration for social login
export const WEB3AUTH_CONFIG = {
  // Get from https://dashboard.web3auth.io
  clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || 'BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ', // Demo key for testing

  // Flare Coston2 chain config
  chainConfig: {
    chainNamespace: 'eip155' as const,
    chainId: '0x72', // 114 in hex
    rpcTarget: 'https://coston2-api.flare.network/ext/C/rpc',
    displayName: 'Coston2',
    blockExplorerUrl: 'https://coston2-explorer.flare.network',
    ticker: 'C2FLR',
    tickerName: 'Coston2 FLR',
  },
} as const;

// Entry point address for ERC-4337 (same across most chains)
export const ENTRY_POINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
