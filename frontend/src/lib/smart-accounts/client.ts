import { createPublicClient, http, fromHex, type Address, erc20Abi } from 'viem';
import { coston2 as coston2Chain } from '@/config/wagmi';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import {
  SMART_ACCOUNTS_CONFIG,
  type Vault,
  type AgentVault,
} from './config';

// ============ Public Client ============

export const publicClient = createPublicClient({
  chain: coston2Chain,
  transport: http(),
});

// ============ Smart Account Utilities ============

/**
 * Get the operator XRPL wallet addresses that accept instructions
 */
export async function getOperatorXrplAddresses(): Promise<string[]> {
  const result = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getXrplProviderWallets',
  });
  return result as string[];
}

/**
 * Get the Personal Account address on Flare for a given XRPL address
 */
export async function getPersonalAccountAddress(xrplAddress: string): Promise<Address> {
  const result = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getPersonalAccount',
    args: [xrplAddress],
  });
  return result as Address;
}

/**
 * Get all registered vaults from the MasterAccountController
 */
export async function getVaults(): Promise<Vault[]> {
  const result = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getVaults',
  });

  const [ids, addresses, types] = result as [bigint[], string[], number[]];

  return ids.map((id, index) => ({
    id,
    address: addresses[index] as Address,
    type: types[index],
  }));
}

/**
 * Get all agent vaults (collateral pools)
 */
export async function getAgentVaults(): Promise<AgentVault[]> {
  const result = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getAgentVaults',
  });

  const [ids, addresses] = result as [bigint[], string[]];

  return ids.map((id, index) => ({
    id,
    address: addresses[index] as Address,
  }));
}

/**
 * Get the instruction fee in XRP drops for a given encoded instruction
 */
export async function getInstructionFee(encodedInstruction: string): Promise<bigint> {
  const instructionId = encodedInstruction.slice(0, 4);
  const instructionIdDecimal = fromHex(instructionId as `0x${string}`, 'bigint');

  const fee = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: 'getInstructionFee',
    args: [instructionIdDecimal],
  });

  return fee as bigint;
}

// ============ Contract Address Discovery ============

/**
 * Get a contract address by name from the FlareContractRegistry
 */
export async function getContractAddressByName(name: string): Promise<Address> {
  const result = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.FLARE_CONTRACT_REGISTRY,
    abi: coston2.iFlareContractRegistryAbi,
    functionName: 'getContractAddressByName',
    args: [name],
  });
  return result as Address;
}

/**
 * Get the AssetManagerFXRP address
 */
export async function getAssetManagerFXRPAddress(): Promise<Address> {
  return getContractAddressByName('AssetManagerFXRP');
}

/**
 * Get the FXRP token address from AssetManagerFXRP
 */
export async function getFxrpAddress(): Promise<Address> {
  const assetManagerAddress = await getAssetManagerFXRPAddress();

  const fxrpAddress = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: 'fAsset',
  });

  return fxrpAddress as Address;
}

// ============ Balance Queries ============

/**
 * Get FXRP balance for an address
 */
export async function getFxrpBalance(address: Address): Promise<bigint> {
  const fxrpAddress = await getFxrpAddress();

  const balance = await publicClient.readContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  return balance;
}

/**
 * Get FXRP decimals
 */
export async function getFxrpDecimals(): Promise<number> {
  const fxrpAddress = await getFxrpAddress();

  const decimals = await publicClient.readContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  return decimals;
}

/**
 * Get vault share balance for an address
 */
export async function getVaultBalance(address: Address): Promise<bigint> {
  const balance = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.UNIVERSAL_VAULT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  return balance;
}

/**
 * Convert vault shares to underlying asset value (USDT)
 */
export async function convertSharesToAssets(shares: bigint): Promise<bigint> {
  if (shares === 0n) return 0n;

  const assets = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.UNIVERSAL_VAULT,
    abi: [{
      name: 'convertToAssets',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'shares', type: 'uint256' }],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'convertToAssets',
    args: [shares],
  });

  return assets;
}

/**
 * Get USDT balance for an address
 */
export async function getUsdtBalance(address: Address): Promise<bigint> {
  const balance = await publicClient.readContract({
    address: SMART_ACCOUNTS_CONFIG.USDT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  return balance;
}

// ============ Utility Functions ============

/**
 * Convert XRP drops to XRP
 */
export function dropsToXrp(drops: bigint | number): number {
  return Number(drops) / 1_000_000;
}

/**
 * Convert XRP to drops
 */
export function xrpToDrops(xrp: number): bigint {
  return BigInt(Math.floor(xrp * 1_000_000));
}
