'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Web3Auth, type Web3AuthOptions } from '@web3auth/modal';
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { WEB3AUTH_CONFIG } from '@/config/etherspot';
import { useEtherspot } from './EtherspotContext';
import { SocialUserInfo } from './WalletContext';

interface Web3AuthContextValue {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  userInfo: SocialUserInfo | null;
  provider: IProvider | null;

  // Methods
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

  // Get private key from Web3Auth provider
  const getPrivateKey = async (web3authProvider: IProvider): Promise<string> => {
    const privateKey = await web3authProvider.request({
      method: 'eth_private_key',
    });
    return privateKey as string;
  };

  // Initialize Web3Auth on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Chain config for Coston2
        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: WEB3AUTH_CONFIG.chainConfig.chainId,
          rpcTarget: WEB3AUTH_CONFIG.chainConfig.rpcTarget,
          displayName: WEB3AUTH_CONFIG.chainConfig.displayName,
          blockExplorerUrl: WEB3AUTH_CONFIG.chainConfig.blockExplorerUrl,
          ticker: WEB3AUTH_CONFIG.chainConfig.ticker,
          tickerName: WEB3AUTH_CONFIG.chainConfig.tickerName,
        };

        // Create Ethereum private key provider
        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig },
        });

        // Create Web3Auth instance with v10 API
        // Cast privateKeyProvider to bypass version mismatch type error
        const web3authInstance = new Web3Auth({
          clientId: WEB3AUTH_CONFIG.clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          privateKeyProvider: privateKeyProvider as unknown as Web3AuthOptions['privateKeyProvider'],
        });

        // Initialize Web3Auth
        await web3authInstance.init();

        setWeb3auth(web3authInstance);
        setIsInitialized(true);

        console.log('[Web3Auth] Initialized');

        // Check if already connected (session exists)
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

            // Initialize Etherspot with the private key
            const privateKey = await getPrivateKey(web3authInstance.provider);
            await initializeWithPrivateKey(privateKey);
          } catch (err) {
            console.warn('[Web3Auth] Could not restore session:', err);
          }
        }
      } catch (error) {
        console.error('[Web3Auth] Failed to initialize:', error);
      }
    };

    init();
  }, [initializeWithPrivateKey]);

  // Connect with Web3Auth modal
  const connect = useCallback(async () => {
    if (!web3auth) {
      throw new Error('Web3Auth not initialized');
    }

    setIsConnecting(true);
    try {
      console.log('[Web3Auth] Opening modal...');
      const web3authProvider = await web3auth.connect();

      if (!web3authProvider) {
        throw new Error('No provider returned from Web3Auth');
      }

      setProvider(web3authProvider);

      // Get user info
      const user = await web3auth.getUserInfo();
      setUserInfo({
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
      });

      console.log('[Web3Auth] Connected as:', user.name || user.email);

      // Initialize Etherspot SDK with the derived private key
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

  // Disconnect from Web3Auth
  const disconnect = useCallback(async () => {
    if (!web3auth) return;

    try {
      await web3auth.logout();
      setProvider(null);
      setUserInfo(null);
      disconnectEtherspot();
      console.log('[Web3Auth] Disconnected');
    } catch (error) {
      console.error('[Web3Auth] Logout failed:', error);
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
