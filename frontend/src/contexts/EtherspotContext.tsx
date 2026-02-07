'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { PrimeSdk, EtherspotBundler } from '@etherspot/prime-sdk';
import { ETHERSPOT_CONFIG } from '@/config/etherspot';

// Types for batch transactions
export interface BatchTransaction {
  to: string;
  data: string;
  value?: bigint;
}

interface EtherspotContextValue {
  // SDK instance
  primeSdk: PrimeSdk | null;

  // Account state
  smartAccountAddress: string | null;
  isInitialized: boolean;
  isInitializing: boolean;

  // Connection methods
  initializeWithPrivateKey: (privateKey: string) => Promise<string>;
  disconnect: () => void;

  // Transaction methods
  sendUserOperation: (transactions: BatchTransaction[]) => Promise<string>;
}

const EtherspotContext = createContext<EtherspotContextValue | null>(null);

export function EtherspotProvider({ children }: { children: ReactNode }) {
  const [primeSdk, setPrimeSdk] = useState<PrimeSdk | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Load persisted address on mount
  useEffect(() => {
    const stored = localStorage.getItem('etherspot_smart_account');
    if (stored) {
      setSmartAccountAddress(stored);
    }
  }, []);

  // Initialize SDK with a private key (from Web3Auth or direct)
  const initializeWithPrivateKey = useCallback(async (privateKey: string): Promise<string> => {
    setIsInitializing(true);
    try {
      // Ensure private key has 0x prefix
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

      // Create bundler instance
      const bundler = new EtherspotBundler(
        ETHERSPOT_CONFIG.chainId,
        ETHERSPOT_CONFIG.apiKey
      );

      // Initialize Prime SDK
      const sdk = new PrimeSdk(
        { privateKey: formattedKey },
        {
          chainId: ETHERSPOT_CONFIG.chainId,
          bundlerProvider: bundler,
        }
      );

      // Get the counterfactual smart account address
      const address = await sdk.getCounterFactualAddress();

      setPrimeSdk(sdk);
      setSmartAccountAddress(address);
      localStorage.setItem('etherspot_smart_account', address);

      console.log('[Etherspot] Smart account initialized:', address);
      return address;
    } catch (error) {
      console.error('[Etherspot] Failed to initialize:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Send batched transactions as a single UserOperation
  const sendUserOperation = useCallback(async (transactions: BatchTransaction[]): Promise<string> => {
    if (!primeSdk) {
      throw new Error('Etherspot SDK not initialized');
    }

    try {
      // Clear any previous batch
      await primeSdk.clearUserOpsFromBatch();

      // Add all transactions to the batch
      for (const tx of transactions) {
        await primeSdk.addUserOpsToBatch({
          to: tx.to,
          data: tx.data,
          value: tx.value,
        });
      }

      console.log('[Etherspot] Estimating UserOp with paymaster...');

      // Estimate with Arka paymaster for gasless execution
      const op = await primeSdk.estimate({
        paymasterDetails: {
          url: ETHERSPOT_CONFIG.paymasterUrl,
          context: ETHERSPOT_CONFIG.paymasterContext,
        },
      });

      console.log('[Etherspot] Sending UserOp...');

      // Send the UserOperation
      const userOpHash = await primeSdk.send(op);

      console.log('[Etherspot] UserOp sent:', userOpHash);

      // Wait for the transaction to be included
      // The userOpHash can be used to track status
      return userOpHash;
    } catch (error) {
      console.error('[Etherspot] Failed to send UserOp:', error);
      throw error;
    }
  }, [primeSdk]);

  // Disconnect and clear state
  const disconnect = useCallback(() => {
    setPrimeSdk(null);
    setSmartAccountAddress(null);
    localStorage.removeItem('etherspot_smart_account');
    localStorage.removeItem('etherspot_private_key');
    console.log('[Etherspot] Disconnected');
  }, []);

  return (
    <EtherspotContext.Provider
      value={{
        primeSdk,
        smartAccountAddress,
        isInitialized: !!primeSdk,
        isInitializing,
        initializeWithPrivateKey,
        disconnect,
        sendUserOperation,
      }}
    >
      {children}
    </EtherspotContext.Provider>
  );
}

export function useEtherspot() {
  const context = useContext(EtherspotContext);
  if (!context) {
    throw new Error('useEtherspot must be used within EtherspotProvider');
  }
  return context;
}
