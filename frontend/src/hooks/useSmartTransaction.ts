'use client';

import { useCallback, useState } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { useWallet } from '@/contexts/WalletContext';
import { useEtherspot, BatchTransaction } from '@/contexts/EtherspotContext';

// Transaction request format (similar to wagmi's writeContract args)
export interface TransactionRequest {
  address: `0x${string}`;
  abi: readonly any[];
  functionName: string;
  args?: readonly any[];
  value?: bigint;
}

interface UseSmartTransactionReturn {
  /**
   * Execute one or more transactions.
   * - Smart Account: Batches all into single gasless UserOperation
   * - EOA: Executes sequentially with gas from wallet
   */
  execute: (transactions: TransactionRequest[]) => Promise<string>;

  /** Whether a transaction is currently in progress */
  isLoading: boolean;

  /** Error from the last transaction attempt */
  error: Error | null;

  /** Clear the error state */
  clearError: () => void;
}

/**
 * Hook for executing transactions that works with both EOA and Smart Accounts.
 *
 * For Smart Accounts: Batches all transactions into a single gasless UserOperation
 * For EOA: Executes transactions sequentially (standard wagmi flow)
 */
export function useSmartTransaction(): UseSmartTransactionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { walletMode, isSmartAccount } = useWallet();
  const { sendUserOperation } = useEtherspot();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const execute = useCallback(
    async (transactions: TransactionRequest[]): Promise<string> => {
      if (transactions.length === 0) {
        throw new Error('No transactions to execute');
      }

      setIsLoading(true);
      setError(null);

      try {
        if (isSmartAccount) {
          // ========================================
          // SMART ACCOUNT: Batch into single UserOp
          // ========================================
          console.log('[SmartTx] Using Etherspot smart account (gasless)');

          // Encode all transactions
          const batchTxs: BatchTransaction[] = transactions.map((tx) => ({
            to: tx.address,
            data: encodeFunctionData({
              abi: tx.abi,
              functionName: tx.functionName,
              args: tx.args,
            }),
            value: tx.value,
          }));

          console.log(`[SmartTx] Batching ${batchTxs.length} transaction(s)`);

          // Send as single UserOperation (gasless via Arka paymaster)
          const userOpHash = await sendUserOperation(batchTxs);

          console.log('[SmartTx] UserOp hash:', userOpHash);
          return userOpHash;
        } else {
          // ========================================
          // EOA: Execute sequentially (standard flow)
          // ========================================
          console.log('[SmartTx] Using EOA wallet (standard gas)');

          let lastHash = '';

          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            console.log(`[SmartTx] Executing tx ${i + 1}/${transactions.length}: ${tx.functionName}`);

            const hash = await writeContractAsync({
              address: tx.address,
              abi: tx.abi as any,
              functionName: tx.functionName,
              args: tx.args as any,
              value: tx.value,
            });

            console.log(`[SmartTx] Tx ${i + 1} hash:`, hash);

            // Wait for confirmation before next tx
            if (publicClient) {
              await publicClient.waitForTransactionReceipt({ hash });
            }

            lastHash = hash;
          }

          return lastHash;
        }
      } catch (err) {
        const error = err as Error;
        console.error('[SmartTx] Transaction failed:', error);
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isSmartAccount, sendUserOperation, writeContractAsync, publicClient]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    clearError,
  };
}
