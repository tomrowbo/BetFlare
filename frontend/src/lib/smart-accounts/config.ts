import type { Address } from 'viem';

// ============ Contract Addresses (Coston2 Testnet) ============

export const SMART_ACCOUNTS_CONFIG = {
  MASTER_ACCOUNT_CONTROLLER: '0x434936d47503353f06750Db1A444DBDC5F0AD37c' as Address,
  FLARE_CONTRACT_REGISTRY: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as Address,
  UNIVERSAL_VAULT: '0xB2569b2fbeA31A4f8ECaCF6Dd1fDC53157107F87' as Address,
  USDT: '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F' as Address,
  FXRP: '0x0b6A3645c240605887a5532109323A3E12273dc7' as Address,
  SWAP_DEPOSIT_WRAPPER: '0xe58390aac1030b20a12cF73B860105753f16A63d' as Address,
  // FXRP and BlazeSwap need to be discovered at runtime via registry
  XRPL_TESTNET_RPC: 'wss://s.altnet.rippletest.net:51233',
  // DEMO ONLY: Relayer wallet for registering custom instructions
  // Fund 0xDA094cDe2965d5Df06AccE382E5eE9f32CDBeA92 with C2FLR for gas
  DEMO_RELAYER_PRIVATE_KEY: '0x3faabf10f3292306b3e932964002de7e3c55565ac7e0e5e38dd7e4863492a0e7' as `0x${string}`,
} as const;

// ============ ABIs ============

// CustomInstructionsFacet ABI - for registering and encoding custom instructions
export const customInstructionsFacetAbi = [
  {
    inputs: [{ internalType: 'bytes32', name: 'customInstructionHash', type: 'bytes32' }],
    name: 'AlreadyRegistered',
    type: 'error',
  },
  { inputs: [], name: 'EmptyCustomInstruction', type: 'error' },
  {
    inputs: [{ internalType: 'bytes32', name: 'customInstructionHash', type: 'bytes32' }],
    name: 'InvalidCustomInstruction',
    type: 'error',
  },
  { inputs: [], name: 'TargetAddressZero', type: 'error' },
  { inputs: [{ internalType: 'address', name: 'target', type: 'address' }], name: 'TargetNotAContract', type: 'error' },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'bytes32', name: 'customInstructionHash', type: 'bytes32' }],
    name: 'CustomInstructionRegistered',
    type: 'event',
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
  {
    inputs: [{ internalType: 'bytes32', name: '_customInstructionHash', type: 'bytes32' }],
    name: 'getCustomInstruction',
    outputs: [
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
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_start', type: 'uint256' },
      { internalType: 'uint256', name: '_end', type: 'uint256' },
    ],
    name: 'getCustomInstructionHashes',
    outputs: [
      { internalType: 'bytes32[]', name: '_hashes', type: 'bytes32[]' },
      { internalType: 'uint256', name: '_totalLength', type: 'uint256' },
    ],
    stateMutability: 'view',
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
    name: 'registerCustomInstruction',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// IInstructionsFacet ABI - key events for monitoring smart account operations
export const instructionsFacetAbi = [
  {
    type: 'event',
    name: 'CustomInstructionExecuted',
    inputs: [
      { name: 'personalAccount', type: 'address', indexed: true, internalType: 'address' },
      { name: 'callHash', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      {
        name: 'customInstruction',
        type: 'tuple[]',
        indexed: false,
        internalType: 'struct CustomInstructions.CustomCall[]',
        components: [
          { name: 'targetContract', type: 'address', internalType: 'address' },
          { name: 'value', type: 'uint256', internalType: 'uint256' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'personalAccount', type: 'address', indexed: true, internalType: 'address' },
      { name: 'vault', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'shares', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FXrpTransferred',
    inputs: [
      { name: 'personalAccount', type: 'address', indexed: true, internalType: 'address' },
      { name: 'to', type: 'address', indexed: false, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CollateralReserved',
    inputs: [
      { name: 'personalAccount', type: 'address', indexed: true, internalType: 'address' },
      { name: 'transactionId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'paymentReference', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'xrplOwner', type: 'string', indexed: false, internalType: 'string' },
      { name: 'collateralReservationId', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'agentVault', type: 'address', indexed: false, internalType: 'address' },
      { name: 'lots', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'executor', type: 'address', indexed: false, internalType: 'address' },
      { name: 'executorFee', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const;

// MasterAccountController ABI - subset needed for smart account operations
export const masterAccountControllerAbi = [
  {
    inputs: [],
    name: 'getXrplProviderWallets',
    outputs: [{ internalType: 'string[]', name: '', type: 'string[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '_xrplAddress', type: 'string' }],
    name: 'getPersonalAccount',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getVaults',
    outputs: [
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
      { internalType: 'address[]', name: '', type: 'address[]' },
      { internalType: 'uint8[]', name: '', type: 'uint8[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAgentVaults',
    outputs: [
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
      { internalType: 'address[]', name: '', type: 'address[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_instructionId', type: 'uint256' }],
    name: 'getInstructionFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// FlareContractRegistry ABI - for looking up contract addresses
export const flareContractRegistryAbi = [
  {
    inputs: [{ internalType: 'string', name: '_name', type: 'string' }],
    name: 'getContractAddressByName',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// IAssetManager ABI - for FXRP events
// IMPORTANT: Must match exact ABI from @flarenetwork/flare-wagmi-periphery-package
export const assetManagerAbi = [
  {
    type: 'event',
    name: 'CollateralReserved',
    inputs: [
      { name: 'agentVault', type: 'address', indexed: true },
      { name: 'minter', type: 'address', indexed: true },
      { name: 'collateralReservationId', type: 'uint256', indexed: true },
      { name: 'valueUBA', type: 'uint256', indexed: false },
      { name: 'feeUBA', type: 'uint256', indexed: false },
      { name: 'firstUnderlyingBlock', type: 'uint256', indexed: false },
      { name: 'lastUnderlyingBlock', type: 'uint256', indexed: false },
      { name: 'lastUnderlyingTimestamp', type: 'uint256', indexed: false },
      { name: 'paymentAddress', type: 'string', indexed: false },
      { name: 'paymentReference', type: 'bytes32', indexed: false },
      { name: 'executor', type: 'address', indexed: false },
      { name: 'executorFeeNatWei', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MintingExecuted',
    inputs: [
      { name: 'agentVault', type: 'address', indexed: true },
      { name: 'collateralReservationId', type: 'uint256', indexed: true },
      { name: 'mintedAmountUBA', type: 'uint256', indexed: false },
      { name: 'agentFeeUBA', type: 'uint256', indexed: false },
      { name: 'poolFeeUBA', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    inputs: [],
    name: 'fAsset',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// BlazeSwap Router ABI - for swapping tokens
export const blazeSwapRouterAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
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

// ============ Types ============

export type CustomInstruction = {
  targetContract: Address;
  value: bigint;
  data: `0x${string}`;
};

export type Vault = {
  id: bigint;
  address: Address;
  type: number;
};

export type AgentVault = {
  id: bigint;
  address: Address;
};
