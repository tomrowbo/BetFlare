'use client';

import { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { useAccount, useConnectorClient } from 'wagmi';
import { useEtherspot } from './EtherspotContext';

// Wallet connection mode
export type WalletMode = 'eoa' | 'smart_account' | 'disconnected';

// User info from social login
export interface SocialUserInfo {
  email?: string;
  name?: string;
  profileImage?: string;
}

interface WalletContextValue {
  // Unified address (works for both EOA and smart account)
  address: string | null;

  // Connection state
  isConnected: boolean;
  walletMode: WalletMode;

  // Display info
  displayName: string | null;
  userInfo: SocialUserInfo | null;

  // Mode checks
  isEOA: boolean;
  isSmartAccount: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// Helper to truncate address for display
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface WalletProviderProps {
  children: ReactNode;
  // Optional social user info passed from Web3Auth
  socialUserInfo?: SocialUserInfo | null;
}

export function WalletProvider({ children, socialUserInfo = null }: WalletProviderProps) {
  // EOA wallet from RainbowKit/wagmi
  const { address: eoaAddress, isConnected: isEoaConnected, connector } = useAccount();
  const { data: connectorClient } = useConnectorClient();

  // Smart account from Etherspot
  const { smartAccountAddress, isInitialized: isEtherspotInitialized, initializeWithProvider, isInitializing } = useEtherspot();

  // Track if we've already tried to initialize for this connection
  const [hasInitialized, setHasInitialized] = useState(false);

  // Auto-initialize Etherspot when wagmi connects (MetaMask, etc.)
  useEffect(() => {
    const initEtherspot = async () => {
      // Only initialize if:
      // 1. wagmi is connected
      // 2. We have a connector client with transport
      // 3. Etherspot is not already initialized
      // 4. We haven't already tried to initialize
      // 5. We're not currently initializing
      if (
        isEoaConnected &&
        connectorClient &&
        !isEtherspotInitialized &&
        !hasInitialized &&
        !isInitializing
      ) {
        console.log('[WalletContext] wagmi connected, initializing Etherspot...');
        setHasInitialized(true);

        try {
          // Get the underlying provider from wagmi's connector client
          // The transport contains the EIP-1193 provider
          const provider = (connectorClient as any).transport;
          if (provider) {
            await initializeWithProvider(provider);
            console.log('[WalletContext] Etherspot initialized with wagmi provider');
          }
        } catch (error) {
          console.error('[WalletContext] Failed to initialize Etherspot:', error);
          setHasInitialized(false); // Allow retry
        }
      }
    };

    initEtherspot();
  }, [isEoaConnected, connectorClient, isEtherspotInitialized, hasInitialized, isInitializing, initializeWithProvider]);

  // Reset hasInitialized when disconnected
  useEffect(() => {
    if (!isEoaConnected && !isEtherspotInitialized) {
      setHasInitialized(false);
    }
  }, [isEoaConnected, isEtherspotInitialized]);

  const value = useMemo((): WalletContextValue => {
    // Priority: Smart Account (social login) > EOA (RainbowKit)
    // If Etherspot is initialized with a smart account, use that
    if (isEtherspotInitialized && smartAccountAddress) {
      return {
        address: smartAccountAddress,
        isConnected: true,
        walletMode: 'smart_account',
        displayName: socialUserInfo?.name || truncateAddress(smartAccountAddress),
        userInfo: socialUserInfo,
        isEOA: false,
        isSmartAccount: true,
      };
    }

    // Fall back to EOA wallet from RainbowKit
    if (isEoaConnected && eoaAddress) {
      return {
        address: eoaAddress,
        isConnected: true,
        walletMode: 'eoa',
        displayName: truncateAddress(eoaAddress),
        userInfo: null,
        isEOA: true,
        isSmartAccount: false,
      };
    }

    // Not connected
    return {
      address: null,
      isConnected: false,
      walletMode: 'disconnected',
      displayName: null,
      userInfo: null,
      isEOA: false,
      isSmartAccount: false,
    };
  }, [
    eoaAddress,
    isEoaConnected,
    smartAccountAddress,
    isEtherspotInitialized,
    socialUserInfo,
  ]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
