'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { WEB3AUTH_CONFIG } from '@/config/etherspot';
import { useEtherspot } from './EtherspotContext';
import { SocialUserInfo } from './WalletContext';

interface Web3AuthContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  userInfo: SocialUserInfo | null;
  provider: IProvider | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const Web3AuthContext = createContext<Web3AuthContextValue | null>(null);

export function Web3AuthProvider({ children }: { children: ReactNode }) {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [userInfo, setUserInfo] = useState<SocialUserInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { initializeWithPrivateKey, disconnect: disconnectEtherspot } = useEtherspot();

  const getPrivateKey = async (web3authProvider: IProvider): Promise<string> => {
    const privateKey = await web3authProvider.request({
      method: 'eth_private_key',
    });
    return privateKey as string;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: WEB3AUTH_CONFIG.chainConfig.chainId,
          rpcTarget: WEB3AUTH_CONFIG.chainConfig.rpcTarget,
          displayName: WEB3AUTH_CONFIG.chainConfig.displayName,
          blockExplorerUrl: WEB3AUTH_CONFIG.chainConfig.blockExplorerUrl,
          ticker: WEB3AUTH_CONFIG.chainConfig.ticker,
          tickerName: WEB3AUTH_CONFIG.chainConfig.tickerName,
        };

        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig },
        });

        // Web3Auth Modal v10 - pass privateKeyProvider
        const web3authInstance = new Web3Auth({
          clientId: WEB3AUTH_CONFIG.clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          privateKeyProvider: privateKeyProvider as any,
        });

        await web3authInstance.init();

        setWeb3auth(web3authInstance);
        setIsInitialized(true);
        console.log('[Web3Auth] Initialized');

        // Restore session if exists
        if (web3authInstance.connected && web3authInstance.provider) {
          console.log('[Web3Auth] Existing session found');
          setProvider(web3authInstance.provider);

          try {
            const user = await web3authInstance.getUserInfo();
            setUserInfo({
              email: user.email,
              name: user.name,
              profileImage: user.profileImage,
            });

            const privateKey = await getPrivateKey(web3authInstance.provider);
            await initializeWithPrivateKey(privateKey);
          } catch (err) {
            console.warn('[Web3Auth] Could not restore session:', err);
          }
        }
      } catch (error) {
        console.error('[Web3Auth] Failed to initialize:', error);
        setIsInitialized(true);
      }
    };

    init();
  }, [initializeWithPrivateKey]);

  const connect = useCallback(async () => {
    if (!web3auth) {
      throw new Error('Web3Auth not initialized');
    }

    setIsConnecting(true);
    try {
      console.log('[Web3Auth] Opening modal...');

      // Use the modal's connect method which handles everything
      const web3authProvider = await web3auth.connect();

      if (!web3authProvider) {
        throw new Error('No provider returned from Web3Auth');
      }

      setProvider(web3authProvider);

      const user = await web3auth.getUserInfo();
      setUserInfo({
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
      });

      console.log('[Web3Auth] Connected as:', user.name || user.email);

      const privateKey = await getPrivateKey(web3authProvider);
      await initializeWithPrivateKey(privateKey);

      console.log('[Web3Auth] Etherspot initialized');
    } catch (error) {
      console.error('[Web3Auth] Connection failed:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [web3auth, initializeWithPrivateKey]);

  const disconnect = useCallback(async () => {
    console.log('[Web3Auth] Disconnecting...');

    setProvider(null);
    setUserInfo(null);
    disconnectEtherspot();

    try {
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('Web3Auth') || key.includes('openlogin') || key.includes('torus')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (e) {
      console.warn('[Web3Auth] Storage cleanup error:', e);
    }

    if (web3auth) {
      try {
        await web3auth.logout();
        console.log('[Web3Auth] Logged out');
      } catch (error) {
        console.error('[Web3Auth] Logout failed:', error);
      }
    }
  }, [web3auth, disconnectEtherspot]);

  return (
    <Web3AuthContext.Provider
      value={{
        isConnected: !!provider,
        isConnecting,
        isInitialized,
        userInfo,
        provider,
        connect,
        disconnect,
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
}

export function useWeb3Auth() {
  const context = useContext(Web3AuthContext);
  if (!context) {
    throw new Error('useWeb3Auth must be used within Web3AuthProvider');
  }
  return context;
}
