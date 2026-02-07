'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, ERC20_ABI } from '@/config/contracts';

export function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  // Fetch USDT balance
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
    <div className="bg-gradient-to-r from-[#ffb80c] to-[#ff9500]">
      <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/">
            <Image src="/betflare-logo.png" alt="BetFlare" width={140} height={32} className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${
                  pathname === item.href
                    ? 'text-black/90 px-3 py-1 bg-black/10 rounded'
                    : 'text-black/70 hover:text-black'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Balance Display */}
          {isConnected && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/10 rounded-lg">
              <span className="text-sm font-medium text-black/70">Balance:</span>
              <span className="text-sm font-bold text-black">
                {isLoadingBalance ? (
                  <span className="inline-block w-12 h-4 bg-black/20 rounded animate-pulse" />
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
                  className="px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-black/80 transition text-sm"
                >
                  {connected ? account.displayName : 'Connect Wallet'}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </div>
  );
}
