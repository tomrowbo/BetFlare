'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { PrimeSdk, EtherspotBundler, Web3eip1193WalletProvider } from '@etherspot/prime-sdk';
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
  initializeWithProvider: (provider: any) => Promise<string>;
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
      console.log('[Etherspot] ====== INITIALIZATION START ======');
      console.log('[Etherspot] Chain ID:', ETHERSPOT_CONFIG.chainId);
      console.log('[Etherspot] API Key:', ETHERSPOT_CONFIG.apiKey);

      // Ensure private key has 0x prefix
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

      // Create bundler instance
      console.log('[Etherspot] Creating EtherspotBundler...');
      const bundler = new EtherspotBundler(
        ETHERSPOT_CONFIG.chainId,
        ETHERSPOT_CONFIG.apiKey
      );
      console.log('[Etherspot] Bundler created');

      // Initialize Prime SDK
      console.log('[Etherspot] Creating PrimeSdk...');
      const sdk = new PrimeSdk(
        { privateKey: formattedKey },
        {
          chainId: ETHERSPOT_CONFIG.chainId,
          bundlerProvider: bundler,
        }
      );
      console.log('[Etherspot] PrimeSdk created');

      // Get the counterfactual smart account address
      console.log('[Etherspot] Getting counterfactual address...');
      const address = await sdk.getCounterFactualAddress();

      setPrimeSdk(sdk);
      setSmartAccountAddress(address);
      localStorage.setItem('etherspot_smart_account', address);

      console.log('[Etherspot] ====== INITIALIZATION SUCCESS ======');
      console.log('[Etherspot] Smart account address:', address);
      return address;
    } catch (error: any) {
      console.error('[Etherspot] ====== INITIALIZATION FAILED ======');
      console.error('[Etherspot] Error:', error);
      console.error('[Etherspot] Error message:', error?.message);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Initialize SDK with an EIP-1193 provider (MetaMask, RainbowKit, etc.)
  const initializeWithProvider = useCallback(async (provider: any): Promise<string> => {
    setIsInitializing(true);
    try {
      console.log('[Etherspot] ====== PROVIDER INITIALIZATION START ======');
      console.log('[Etherspot] Chain ID:', ETHERSPOT_CONFIG.chainId);

      // Wrap the EIP-1193 provider for Etherspot
      console.log('[Etherspot] Creating Web3eip1193WalletProvider...');
      const web3Provider = await Web3eip1193WalletProvider.connect(provider);
      console.log('[Etherspot] Web3eip1193WalletProvider created');

      // Create bundler instance
      console.log('[Etherspot] Creating EtherspotBundler...');
      const bundler = new EtherspotBundler(
        ETHERSPOT_CONFIG.chainId,
        ETHERSPOT_CONFIG.apiKey
      );
      console.log('[Etherspot] Bundler created');

      // Initialize Prime SDK with provider
      console.log('[Etherspot] Creating PrimeSdk with provider...');
      const sdk = new PrimeSdk(web3Provider, {
        chainId: ETHERSPOT_CONFIG.chainId,
        bundlerProvider: bundler,
      });
      console.log('[Etherspot] PrimeSdk created');

      // Get the counterfactual smart account address
      console.log('[Etherspot] Getting counterfactual address...');
      const address = await sdk.getCounterFactualAddress();

      setPrimeSdk(sdk);
      setSmartAccountAddress(address);
      localStorage.setItem('etherspot_smart_account', address);

      console.log('[Etherspot] ====== PROVIDER INITIALIZATION SUCCESS ======');
      console.log('[Etherspot] Smart account address:', address);
      return address;
    } catch (error: any) {
      console.error('[Etherspot] ====== PROVIDER INITIALIZATION FAILED ======');
      console.error('[Etherspot] Error:', error);
      console.error('[Etherspot] Error message:', error?.message);
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

      // Build paymaster URL with query params as per Etherspot docs
      const paymasterUrl = `${ETHERSPOT_CONFIG.paymasterUrl}?apiKey=${ETHERSPOT_CONFIG.apiKey}&chainId=${ETHERSPOT_CONFIG.chainId}`;

      console.log('[Etherspot] Estimating UserOp with paymaster...');
      console.log('[Etherspot] Paymaster URL:', paymasterUrl);
      console.log('[Etherspot] Chain ID:', ETHERSPOT_CONFIG.chainId);
      console.log('[Etherspot] Context:', ETHERSPOT_CONFIG.paymasterContext);

      // Estimate with Arka paymaster for gasless execution
      const op = await primeSdk.estimate({
        paymasterDetails: {
          url: paymasterUrl,
          context: ETHERSPOT_CONFIG.paymasterContext,
        },
      });

      console.log('[Etherspot] UserOp estimated:', op);

      console.log('[Etherspot] Sending UserOp...');

      // Send the UserOperation
      const userOpHash = await primeSdk.send(op);

      console.log('[Etherspot] UserOp sent:', userOpHash);

      // Wait for the transaction to be included
      // The userOpHash can be used to track status
      return userOpHash;
    } catch (error: any) {
      console.error('[Etherspot] ====== SEND USEROP FAILED ======');
      console.error('[Etherspot] Error:', error);
      console.error('[Etherspot] Error message:', error?.message);
      console.error('[Etherspot] Error data:', error?.data);
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
        initializeWithProvider,
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
