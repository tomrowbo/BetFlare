'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useAccount } from 'wagmi';
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
  const { address: eoaAddress, isConnected: isEoaConnected } = useAccount();

  // Smart account from Etherspot
  const { smartAccountAddress, isInitialized: isEtherspotInitialized } = useEtherspot();

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
