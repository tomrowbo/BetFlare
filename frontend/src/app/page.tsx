'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { MarketCard } from '@/components/MarketCard';
import { BetSlip } from '@/components/BetSlip';
import { PositionView } from '@/components/PositionView';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CONTRACTS, UNIVERSAL_VAULT_ABI, FPMM_ABI } from '@/config/contracts';

function LiquidityWidget() {
  const { data: totalAssets } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'totalAssets',
  });

  const { data: yesReserve } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'yesReserve',
  });

  const { data: noReserve } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'noReserve',
  });

  const formattedTVL = totalAssets ? formatUnits(totalAssets as bigint, 6) : '0';
  const marketLiquidity = yesReserve && noReserve
    ? Number(formatUnits((yesReserve as bigint) + (noReserve as bigint), 6))
    : 0;

  return (
    <div className="mt-8">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Liquidity Pool</h3>
            <p className="text-sm text-[--text-secondary]">Earn fees by providing liquidity to all markets</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-sm text-[--text-muted]">Market Liquidity</div>
              <div className="text-xl font-bold text-[--accent-green]">${marketLiquidity.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[--text-muted]">Vault TVL</div>
              <div className="text-xl font-bold">${Number(formattedTVL).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[--text-muted]">Est. APY</div>
              <div className="text-xl font-bold text-[--accent-green]">~5.2%</div>
            </div>
            <Link
              href="/liquidity"
              className="btn btn-yes active px-6"
            >
              Provide Liquidity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isConnected } = useAccount();
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');

  return (
    <main className="min-h-screen">
      {/* BetFair-style Orange Banner */}
      <div className="bg-gradient-to-r from-[#ffb80c] to-[#ff9500]">
        <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Image src="/betflare-logo.png" alt="BetFlare" width={140} height={32} className="h-8 w-auto" />
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link href="/" className="text-black/90 hover:text-black px-3 py-1 bg-black/10 rounded">Markets</Link>
              <Link href="/liquidity" className="text-black/70 hover:text-black">Liquidity</Link>
              <a href="#" className="text-black/70 hover:text-black">Portfolio</a>
            </nav>
          </div>
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

      {/* Sub-header */}
      <header className="bg-[#1e1e1e] border-b border-[#333]">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-6 text-sm">
          <a href="#" className="text-white/90 hover:text-white font-medium">Crypto</a>
          <a href="#" className="text-white/60 hover:text-white">Politics</a>
          <a href="#" className="text-white/60 hover:text-white">Sports</a>
          <a href="#" className="text-white/60 hover:text-white">Finance</a>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[--text-secondary] mb-6">
          <a href="#" className="hover:text-[--text-primary]">Markets</a>
          <span>/</span>
          <a href="#" className="hover:text-[--text-primary]">Crypto</a>
          <span>/</span>
          <span className="text-[--text-primary]">XRP Price</span>
        </div>

        {/* Market Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Market Info - Takes 2 columns */}
          <div className="lg:col-span-2">
            <MarketCard
              selectedSide={selectedSide}
              onSelectSide={setSelectedSide}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <BetSlip
              side={selectedSide}
              disabled={!isConnected}
            />
            <PositionView />
          </div>
        </div>

        {/* LP Vault Quick Link */}
        <LiquidityWidget />
      </div>

      {/* Footer */}
      <footer className="border-t border-[--border-color] bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-[--text-secondary]">
              Powered by Flare FTSO Oracle • Built at ETHOxford 2025
            </div>
            <div className="flex gap-6 text-sm">
              <a href="https://faucet.flare.network/coston2" target="_blank" rel="noopener noreferrer" className="text-[--text-secondary] hover:text-[--accent-blue]">
                Get Testnet Tokens
              </a>
              <a href="https://coston2-explorer.flare.network" target="_blank" rel="noopener noreferrer" className="text-[--text-secondary] hover:text-[--accent-blue]">
                Block Explorer
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
