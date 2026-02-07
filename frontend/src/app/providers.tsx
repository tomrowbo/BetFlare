'use client';

import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/wagmi';
import { EtherspotProvider } from '@/contexts/EtherspotContext';
import { Web3AuthProvider, useWeb3Auth } from '@/contexts/Web3AuthContext';
import { WalletProvider } from '@/contexts/WalletContext';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Inner component that has access to Web3Auth context for passing userInfo to WalletProvider
function WalletProviderWithUserInfo({ children }: { children: React.ReactNode }) {
  const { userInfo } = useWeb3Auth();
  return (
    <WalletProvider socialUserInfo={userInfo}>
      {children}
    </WalletProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <EtherspotProvider>
            <Web3AuthProvider>
              <WalletProviderWithUserInfo>
                {children}
              </WalletProviderWithUserInfo>
            </Web3AuthProvider>
          </EtherspotProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
