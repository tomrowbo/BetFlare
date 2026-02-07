'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Wallet } from 'lucide-react';
import { CONTRACTS, ERC20_ABI } from '@/config/contracts';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  const { data: usdtBalance, isLoading: isLoadingBalance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const formattedBalance = usdtBalance ? Number(formatUnits(usdtBalance as bigint, 6)).toFixed(2) : '0.00';

  const navItems = [
    { href: '/', label: 'Markets' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/liquidity', label: 'Liquidity' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center shrink-0 group">
            <Image
              src="/betflare-logo.png"
              alt="BetFlare"
              width={140}
              height={32}
              className="h-7 w-auto group-hover:opacity-90 transition-opacity"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-2 text-sm font-display font-medium tracking-wide uppercase transition-colors relative',
                  pathname === item.href
                    ? 'text-primary'
                    : 'text-white/50 hover:text-white/80'
                )}
              >
                {item.label}
                {pathname === item.href && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[2px] bg-primary" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-white/5 bg-card/60 backdrop-blur-sm">
              <Wallet className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/40">
                Balance
              </span>
              <span className="text-sm font-mono font-semibold text-white">
                {isLoadingBalance ? (
                  <span className="inline-block w-12 h-4 bg-white/10 rounded animate-pulse" />
                ) : (
                  `$${formattedBalance}`
                )}
              </span>
            </div>
          )}

          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
              const connected = mounted && account && chain;
              return (
                <button
                  onClick={connected ? openAccountModal : openConnectModal}
                  className={cn(
                    'px-5 py-2 font-display font-semibold text-sm tracking-wide transition-all',
                    connected
                      ? 'border border-white/10 bg-card/60 text-white/80 hover:border-primary/30 hover:text-white'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(237,126,39,0.2)]'
                  )}
                >
                  {connected ? account.displayName : 'Connect Wallet'}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}
