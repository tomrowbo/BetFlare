'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  waitForCrossmark,
  connectCrossmark,
  getCrossmarkAddress,
  getXrplBalance,
} from '@/lib/crossmark';

interface CrossmarkContextValue {
  isInstalled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  clearError: () => void;
}

const CrossmarkContext = createContext<CrossmarkContextValue | null>(null);

export function CrossmarkProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Crossmark is installed on mount
  useEffect(() => {
    waitForCrossmark().then((installed) => {
      setIsInstalled(installed);

      // Check for existing session
      if (installed) {
        getCrossmarkAddress().then((addr) => {
          if (addr) {
            setAddress(addr);
            getXrplBalance(addr).then(setBalance);
          }
        });
      }
    });
  }, []);

  // Refresh balance when address changes
  useEffect(() => {
    if (address) {
      getXrplBalance(address).then(setBalance);
    } else {
      setBalance(null);
    }
  }, [address]);

  const connect = useCallback(async () => {
    if (!isInstalled) {
      setError('Crossmark extension not installed');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await connectCrossmark();
      setAddress(result.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }, [isInstalled]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (address) {
      const newBalance = await getXrplBalance(address);
      setBalance(newBalance);
    }
  }, [address]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <CrossmarkContext.Provider
      value={{
        isInstalled,
        isConnected: !!address,
        isConnecting,
        address,
        balance,
        error,
        connect,
        disconnect,
        refreshBalance,
        clearError,
      }}
    >
      {children}
    </CrossmarkContext.Provider>
  );
}

export function useCrossmarkContext(): CrossmarkContextValue {
  const context = useContext(CrossmarkContext);
  if (!context) {
    throw new Error('useCrossmarkContext must be used within a CrossmarkProvider');
  }
  return context;
}
