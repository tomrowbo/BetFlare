import sdk from '@crossmarkio/sdk';
import { Client } from 'xrpl';
import type { CrossmarkSignResult, XrplPayment, CrossmarkWalletState } from './types';
import { SMART_ACCOUNTS_CONFIG } from '../smart-accounts/config';

// ============ Crossmark Detection ============

/**
 * Check if Crossmark extension is installed
 */
export function detectCrossmark(): boolean {
  if (typeof window === 'undefined') return false;
  return sdk.sync.isInstalled() ?? false;
}

/**
 * Wait for Crossmark to be available (for slow loading)
 */
export async function waitForCrossmark(timeout = 3000): Promise<boolean> {
  if (detectCrossmark()) return true;

  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      if (detectCrossmark()) {
        resolve(true);
      } else if (Date.now() - start > timeout) {
        resolve(false);
      } else {
        setTimeout(check, 100);
      }
    };

    check();
  });
}

// ============ Crossmark Connection ============

/**
 * Check if Crossmark is connected
 */
export async function isCrossmarkConnected(): Promise<boolean> {
  if (!detectCrossmark()) return false;
  try {
    const session = sdk.sync.session;
    return session?.address !== undefined;
  } catch {
    return false;
  }
}

/**
 * Connect to Crossmark wallet (sign in)
 */
export async function connectCrossmark(): Promise<{ address: string }> {
  if (!detectCrossmark()) {
    throw new Error('Crossmark extension not installed');
  }

  try {
    const { response } = await sdk.methods.signInAndWait();

    if (!response?.data?.address) {
      throw new Error('Failed to get address from Crossmark');
    }

    return { address: response.data.address };
  } catch (error) {
    throw new Error(`Failed to connect to Crossmark: ${error}`);
  }
}

/**
 * Disconnect from Crossmark wallet
 */
export async function disconnectCrossmark(): Promise<void> {
  // Crossmark SDK doesn't have explicit disconnect - session persists
  // User can disconnect from extension directly
}

/**
 * Get current Crossmark address
 */
export async function getCrossmarkAddress(): Promise<string | null> {
  if (!detectCrossmark()) return null;

  try {
    const session = sdk.sync.session;
    return session?.address ?? null;
  } catch {
    return null;
  }
}

// ============ XRPL Operations ============

/**
 * Get XRP balance for an address using XRPL client
 */
export async function getXrplBalance(address: string): Promise<string> {
  const client = new Client(SMART_ACCOUNTS_CONFIG.XRPL_TESTNET_RPC);

  try {
    await client.connect();
    const response = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    });

    const balance = response.result.account_data.Balance;
    // Convert drops to XRP
    return (Number(balance) / 1_000_000).toFixed(6);
  } catch (error) {
    console.error('Failed to get XRP balance:', error);
    return '0';
  } finally {
    await client.disconnect();
  }
}

/**
 * Get current ledger sequence for setting LastLedgerSequence
 */
async function getCurrentLedgerSequence(): Promise<number> {
  const client = new Client(SMART_ACCOUNTS_CONFIG.XRPL_TESTNET_RPC);
  try {
    await client.connect();
    const response = await client.request({
      command: 'ledger_current',
    });
    return response.result.ledger_current_index;
  } finally {
    await client.disconnect();
  }
}

/**
 * Sign and submit an XRPL payment using Crossmark
 */
export async function signAndSubmitPayment(
  destination: string,
  amountDrops: string,
  memoData: string // hex encoded instruction (without 0x prefix)
): Promise<CrossmarkSignResult> {
  if (!detectCrossmark()) {
    throw new Error('Crossmark extension not installed');
  }

  const address = await getCrossmarkAddress();
  if (!address) {
    throw new Error('Crossmark not connected');
  }

  try {
    // Get current ledger and add generous buffer (300 ledgers ≈ 15 minutes)
    const currentLedger = await getCurrentLedgerSequence();
    const lastLedgerSequence = currentLedger + 300;

    // Match exact memo format from flare-smart-accounts-viem demo
    // Only MemoData, no MemoType - operator expects this exact format
    const result = await sdk.methods.signAndSubmitAndWait({
      TransactionType: 'Payment',
      Account: address,
      Destination: destination,
      Amount: amountDrops,
      LastLedgerSequence: lastLedgerSequence,
      Memos: [
        {
          Memo: {
            MemoData: memoData,
          },
        },
      ],
    });

    console.log('Crossmark response:', JSON.stringify(result, null, 2));

    const { response } = result;
    const data = response?.data as Record<string, unknown> | undefined;
    const resp = data?.resp as Record<string, unknown> | undefined;
    const respResult = resp?.result as Record<string, unknown> | undefined;
    const dataResult = data?.result as Record<string, unknown> | undefined;

    // Check for various response structures
    const hash = (respResult?.hash as string) ||
                 (resp?.hash as string) ||
                 (data?.hash as string) ||
                 (dataResult?.hash as string);

    if (!hash) {
      console.error('Full Crossmark response:', result);
      throw new Error(`Transaction failed - no hash returned. Response: ${JSON.stringify(response?.data)}`);
    }

    return {
      hash,
      tx_blob: '',
    };
  } catch (error) {
    throw new Error(`Failed to sign and submit payment: ${error}`);
  }
}

/**
 * Send XRP payment with instruction memo to operator
 */
export async function sendInstructionPayment(
  operatorAddress: string,
  amountXrp: number,
  encodedInstruction: `0x${string}`
): Promise<string> {
  const amountDrops = String(Math.floor(amountXrp * 1_000_000));
  const memoData = encodedInstruction.slice(2); // Remove 0x prefix

  const result = await signAndSubmitPayment(operatorAddress, amountDrops, memoData);
  return result.hash;
}

/**
 * Send mint payment to agent vault (step 2 of minting)
 * This payment goes to the agent vault address with the payment reference from CollateralReserved
 */
export async function sendMintPayment(
  agentVaultXrplAddress: string,
  amountXrp: number,
  paymentReference: string // hex encoded payment reference (with 0x prefix)
): Promise<string> {
  const amountDrops = String(Math.floor(amountXrp * 1_000_000));
  const memoData = paymentReference.startsWith('0x') ? paymentReference.slice(2) : paymentReference;

  const result = await signAndSubmitPayment(agentVaultXrplAddress, amountDrops, memoData);
  return result.hash;
}

// Re-export types
export type { CrossmarkSignResult, XrplPayment, CrossmarkWalletState } from './types';
