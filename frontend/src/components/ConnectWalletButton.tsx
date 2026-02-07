'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@/contexts/WalletContext';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { useEtherspot } from '@/contexts/EtherspotContext';
import { cn } from '@/lib/utils';
import { Wallet, LogOut, User, ChevronDown, Sparkles } from 'lucide-react';

export function ConnectWalletButton() {
  const [showDropdown, setShowDropdown] = useState(false);
  const { address, isConnected, walletMode, displayName, userInfo } = useWallet();
  const { connect: connectSocial, disconnect: disconnectSocial, isConnecting, isInitialized } = useWeb3Auth();
  const { disconnect: disconnectEtherspot } = useEtherspot();

  const handleDisconnect = async () => {
    console.log('[ConnectButton] Disconnect clicked, walletMode:', walletMode);
    try {
      await disconnectSocial();
      disconnectEtherspot();
      console.log('[ConnectButton] Disconnect complete');
    } catch (error) {
      console.error('[ConnectButton] Disconnect error:', error);
    }
    setShowDropdown(false);
    // Force page reload to clear any cached state
    window.location.reload();
  };

  // Connected state - show account info
  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border bg-card/60 transition-all',
            walletMode === 'smart_account'
              ? 'border-primary/30 text-white hover:border-primary/50'
              : 'border-white/10 text-white/80 hover:border-white/20 hover:text-white'
          )}
        >
          {userInfo?.profileImage ? (
            <img
              src={userInfo.profileImage}
              alt=""
              className="w-5 h-5 rounded-full"
            />
          ) : walletMode === 'smart_account' ? (
            <Sparkles className="w-4 h-4 text-primary" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          <span className="font-display font-semibold text-sm">{displayName}</span>
          {walletMode === 'smart_account' && (
            <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider bg-primary/20 text-primary rounded">
              Gasless
            </span>
          )}
          <ChevronDown className="w-4 h-4" />
        </button>

        {showDropdown && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-white/10 rounded-lg shadow-xl z-50">
              <div className="p-3 border-b border-white/5">
                <p className="text-xs text-muted-foreground mb-1">
                  {walletMode === 'smart_account' ? 'Smart Account' : 'Wallet'}
                </p>
                <p className="text-sm font-mono truncate text-white/80">{address}</p>
                {userInfo?.email && (
                  <p className="text-xs text-muted-foreground mt-1">{userInfo.email}</p>
                )}
              </div>
              {walletMode === 'smart_account' && (
                <div className="px-3 py-2 border-b border-white/5 bg-primary/5">
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Sparkles className="w-3 h-3" />
                    <span>Gasless transactions enabled</span>
                  </div>
                </div>
              )}
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Disconnected state - show connection options
  return (
    <div className="flex items-center gap-2">
      {/* Social Login Button (Primary) */}
      <button
        onClick={() => connectSocial()}
        disabled={isConnecting || !isInitialized}
        className={cn(
          'flex items-center gap-2 px-5 py-2 font-display font-semibold text-sm tracking-wide transition-all',
          'bg-primary text-white hover:bg-primary/90',
          'shadow-[0_0_15px_rgba(237,126,39,0.2)]',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <User className="w-4 h-4" />
        {isConnecting ? 'Connecting...' : !isInitialized ? 'Loading...' : 'Sign In'}
      </button>

      {/* RainbowKit Wallet Button (Secondary) */}
      <ConnectButton.Custom>
        {({ openConnectModal, mounted }) => {
          const ready = mounted;
          return (
            <button
              onClick={openConnectModal}
              disabled={!ready}
              className={cn(
                'flex items-center gap-2 px-3 py-2 border border-white/10 bg-card/60',
                'text-white/60 font-display font-medium text-sm',
                'hover:text-white hover:border-white/20 transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Wallet className="w-4 h-4" />
              Wallet
            </button>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
