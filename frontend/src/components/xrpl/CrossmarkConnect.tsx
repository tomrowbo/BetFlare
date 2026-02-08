'use client';

import { cn } from '@/lib/utils';

interface CrossmarkConnectProps {
  isInstalled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: string | null;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  className?: string;
}

export function CrossmarkConnect({
  isInstalled,
  isConnected,
  isConnecting,
  address,
  balance,
  error,
  onConnect,
  onDisconnect,
  className,
}: CrossmarkConnectProps) {
  // Not installed
  if (!isInstalled) {
    return (
      <a
        href="https://crossmark.io"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/60 font-display font-bold text-sm uppercase tracking-wide hover:border-primary/30 hover:text-white transition-all",
          className
        )}
      >
        Install Crossmark
      </a>
    );
  }

  // Connected
  if (isConnected && address) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30">
            XRPL Wallet
          </span>
          <span className="text-sm font-mono text-white">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          {balance && (
            <span className="text-xs text-white/40 font-mono">{balance} XRP</span>
          )}
        </div>
        <button
          onClick={onDisconnect}
          className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-display font-bold uppercase tracking-wide hover:bg-red-500/20 transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Not connected
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onConnect}
        disabled={isConnecting}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/60 font-display font-bold text-sm uppercase tracking-wide hover:border-primary/30 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {isConnecting ? 'Connecting...' : 'Connect XRPL'}
      </button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
