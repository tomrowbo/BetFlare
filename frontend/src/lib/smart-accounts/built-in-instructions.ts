import { FXRPCollateralReservationInstruction } from '@flarenetwork/smart-accounts-encoder';
import type { Address } from 'viem';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import { publicClient, getInstructionFee, getAssetManagerFXRPAddress, dropsToXrp } from './client';

// ============ Built-in Instruction Encoding ============

/**
 * Create and encode a FXRP collateral reservation instruction
 * This is the first step of minting FXRP from XRP
 *
 * @param walletId - The wallet ID (usually 0 for the first wallet)
 * @param valueXrp - Amount of XRP to convert to FXRP (in whole XRP, not drops)
 * @param agentVaultId - The agent vault ID to use (get from getAgentVaults)
 * @returns The encoded instruction as hex string (without 0x prefix for memo)
 */
export function encodeCollateralReservation(
  walletId: number,
  valueXrp: number,
  agentVaultId: number
): string {
  const instruction = new FXRPCollateralReservationInstruction({
    walletId,
    value: valueXrp,
    agentVaultId,
  });

  return instruction.encode();
}

/**
 * Get the fee for a collateral reservation instruction
 */
export async function getCollateralReservationFee(
  walletId: number,
  valueXrp: number,
  agentVaultId: number
): Promise<number> {
  const encoded = encodeCollateralReservation(walletId, valueXrp, agentVaultId);
  const feeDrops = await getInstructionFee(encoded);
  return dropsToXrp(feeDrops);
}

// ============ Event Types ============

// Event types must match the ABI exactly
export type CollateralReservedEvent = {
  agentVault: Address;
  minter: Address;
  collateralReservationId: bigint; // uint256, indexed
  valueUBA: bigint;
  feeUBA: bigint;
  firstUnderlyingBlock: bigint;
  lastUnderlyingBlock: bigint;
  lastUnderlyingTimestamp: bigint;
  paymentAddress: string;
  paymentReference: `0x${string}`;
  executor: Address;
  executorFeeNatWei: bigint;
};

export type MintingExecutedEvent = {
  agentVault: Address;
  collateralReservationId: bigint;
  mintedAmountUBA: bigint;
  agentFeeUBA: bigint;
  poolFeeUBA: bigint;
};

// ============ Event Watching ============

/**
 * Watch for CollateralReserved event for a specific minter address
 * Returns the event data needed for the mint payment
 */
export function watchForCollateralReserved(
  minterAddress: Address,
  timeout: number = 120000
): Promise<CollateralReservedEvent | null> {
  return new Promise(async (resolve) => {
    let found = false;
    const startTime = Date.now();

    const assetManagerAddress = await getAssetManagerFXRPAddress();

    const unwatch = publicClient.watchContractEvent({
      address: assetManagerAddress,
      abi: coston2.iAssetManagerAbi,
      eventName: 'CollateralReserved',
      onLogs: (logs) => {
        for (const log of logs) {
          const args = log.args as unknown as CollateralReservedEvent;
          if (args.minter?.toLowerCase() === minterAddress.toLowerCase()) {
            found = true;
            unwatch();
            resolve(args);
            return;
          }
        }
      },
    });

    // Poll for timeout
    const checkTimeout = () => {
      if (found) return;
      if (Date.now() - startTime > timeout) {
        unwatch();
        resolve(null);
        return;
      }
      setTimeout(checkTimeout, 5000);
    };
    checkTimeout();
  });
}

/**
 * Watch for MintingExecuted event for a specific collateral reservation
 */
export function watchForMintingExecuted(
  collateralReservationId: bigint,
  timeout: number = 120000
): Promise<MintingExecutedEvent | null> {
  return new Promise(async (resolve) => {
    let found = false;
    const startTime = Date.now();

    const assetManagerAddress = await getAssetManagerFXRPAddress();

    const unwatch = publicClient.watchContractEvent({
      address: assetManagerAddress,
      abi: coston2.iAssetManagerAbi,
      eventName: 'MintingExecuted',
      onLogs: (logs) => {
        for (const log of logs) {
          const args = log.args as unknown as MintingExecutedEvent;
          if (args.collateralReservationId === collateralReservationId) {
            found = true;
            unwatch();
            resolve(args);
            return;
          }
        }
      },
    });

    // Poll for timeout
    const checkTimeout = () => {
      if (found) return;
      if (Date.now() - startTime > timeout) {
        unwatch();
        resolve(null);
        return;
      }
      setTimeout(checkTimeout, 5000);
    };
    checkTimeout();
  });
}

// ============ Mint Payment Helpers ============

/**
 * Calculate the mint payment amount from CollateralReserved event
 * Returns amount in XRP (not drops)
 */
export function calculateMintPaymentAmount(event: CollateralReservedEvent): number {
  const totalDrops = event.valueUBA + event.feeUBA;
  return dropsToXrp(totalDrops);
}

/**
 * Get payment details from CollateralReserved event
 */
export function getMintPaymentDetails(event: CollateralReservedEvent): {
  destination: string;
  amountXrp: number;
  memoData: string;
} {
  return {
    destination: event.paymentAddress,
    amountXrp: calculateMintPaymentAmount(event),
    memoData: event.paymentReference.slice(2), // Remove 0x prefix
  };
}
