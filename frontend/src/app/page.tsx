'use client';

import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Header } from '@/components/Header';
import { MiniPriceChart } from '@/components/MiniPriceChart';
import Link from 'next/link';
import { useState } from 'react';
import { CONTRACTS, UNIVERSAL_VAULT_ABI, FPMM_ABI } from '@/config/contracts';

function FeaturedMarketCard({
  title,
  volume,
  yesPrice,
  href,
  resolutionDate,
  icon,
  trend,
}: {
  title: string;
  volume: string;
  yesPrice: number;
  href: string;
  resolutionDate: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <Link href={href} className="block">
      <div className="card hover:border-[--accent-blue] transition cursor-pointer bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a2e] dark:to-[#16213e]">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="text-4xl">{icon}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-xl mb-1">{title}</h3>
                <div className="text-sm text-[--text-muted]">{resolutionDate}</div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className={trend === 'up' ? 'text-[--accent-green]' : trend === 'down' ? 'text-[--accent-red]' : 'text-[--text-muted]'}>
                  {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'}
                </span>
                <span className="text-[--text-muted]">24h</span>
              </div>
            </div>

            <div className="flex items-end justify-between mt-4">
              {/* Prices */}
              <div className="flex gap-6">
                <div>
                  <div className="text-xs text-[--text-muted] mb-1">YES</div>
                  <div className="text-2xl font-bold text-[--accent-green]">{(yesPrice * 100).toFixed(0)}¢</div>
                </div>
                <div>
                  <div className="text-xs text-[--text-muted] mb-1">NO</div>
                  <div className="text-2xl font-bold text-[--accent-red]">{((1 - yesPrice) * 100).toFixed(0)}¢</div>
                </div>
                <div>
                  <div className="text-xs text-[--text-muted] mb-1">Volume</div>
                  <div className="text-lg font-semibold">{volume}</div>
                </div>
              </div>

              {/* Sparkline - Real data from blockchain */}
              <MiniPriceChart yesPrice={yesPrice} width={128} height={48} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MarketListItem({
  title,
  volume,
  yesPrice,
  href,
  resolutionDate,
  icon,
  category,
}: {
  title: string;
  volume: string;
  yesPrice: number;
  href: string;
  resolutionDate: string;
  icon: string;
  category: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="card hover:border-[--accent-blue] transition cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="text-2xl">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{title}</h3>
            <div className="text-sm text-[--text-muted]">
              <span className="text-[--accent-blue]">{category}</span> · {resolutionDate} · Vol: {volume}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xs text-[--text-muted]">YES</div>
              <div className="font-bold text-[--accent-green]">{(yesPrice * 100).toFixed(0)}¢</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[--text-muted]">NO</div>
              <div className="font-bold text-[--accent-red]">{((1 - yesPrice) * 100).toFixed(0)}¢</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ComingSoonMarket({ title, resolutionDate, icon, category }: { title: string; resolutionDate: string; icon: string; category: string }) {
  return (
    <div className="card opacity-50 cursor-not-allowed">
      <div className="flex items-center gap-4">
        <div className="text-2xl grayscale">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{title}</h3>
          <div className="text-sm text-[--text-muted]">
            <span className="text-[--accent-blue]/50">{category}</span> · {resolutionDate}
          </div>
        </div>
        <span className="px-3 py-1 bg-[--bg-hover] text-[--text-muted] text-sm rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  );
}

const CATEGORIES = ['All', 'Price', 'DeFi', 'Ecosystem'] as const;

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('All');

  // Get XRP market data
  const { data: yesPrice } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getYesPrice',
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

  const { data: totalAssets } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'totalAssets',
  });

  const formattedYesPrice = yesPrice ? Number(formatUnits(yesPrice as bigint, 18)) : 0.5;
  const volume = yesReserve && noReserve
    ? Number(formatUnits((yesReserve as bigint) + (noReserve as bigint), 6))
    : 0;
  const tvl = totalAssets ? Number(formatUnits(totalAssets as bigint, 6)) : 0;

  // Coming soon markets - Flare/XRP themed, after Feb 8th
  const comingSoonMarkets = [
    { title: 'Will FLR be above $0.025 by Feb 14th?', resolutionDate: 'Feb 14, 2026', icon: '🔥', category: 'Price' },
    { title: 'Will XRP hit $4.00 by end of February?', resolutionDate: 'Feb 28, 2026', icon: '💎', category: 'Price' },
    { title: 'Will Flare TVL exceed $500M by March?', resolutionDate: 'Mar 1, 2026', icon: '📈', category: 'DeFi' },
    { title: 'Will XRP market cap flip Ethereum?', resolutionDate: 'Mar 15, 2026', icon: '⚔️', category: 'Ecosystem' },
  ];

  const filteredComingSoon = activeCategory === 'All'
    ? comingSoonMarkets
    : comingSoonMarkets.filter(m => m.category === activeCategory);

  // Expired markets (empty for now)
  const expiredMarkets: { title: string; outcome: 'yes' | 'no'; icon: string }[] = [];

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#ff6b35] via-[#f7931a] to-[#ffb80c] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Predict. Trade. Win.</h2>
              <p className="text-white/80">Decentralized prediction markets powered by Flare FTSO</p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">${tvl.toFixed(2)}</div>
                <div className="text-sm text-white/70">Total Locked</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold">1</div>
                <div className="text-sm text-white/70">Active Markets</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Featured Market */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🔥</span> Featured Market
            </h2>
            <span className="px-2 py-1 bg-[--accent-green]/10 text-[--accent-green] text-xs font-semibold rounded">
              LIVE
            </span>
          </div>
          <FeaturedMarketCard
            title="Will XRP be above $3.00?"
            volume={`$${volume.toFixed(2)}`}
            yesPrice={formattedYesPrice}
            href="/markets/xrp-above-3"
            resolutionDate="Resolves Feb 7, 2026"
            icon="💰"
            trend={formattedYesPrice > 0.5 ? 'up' : formattedYesPrice < 0.5 ? 'down' : 'neutral'}
          />
        </section>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-[--accent-blue] text-white'
                  : 'bg-[--bg-secondary] text-[--text-secondary] hover:bg-[--bg-hover]'
              }`}
            >
              {cat === 'All' && '🌐 '}
              {cat === 'Price' && '💹 '}
              {cat === 'DeFi' && '🏦 '}
              {cat === 'Ecosystem' && '🌍 '}
              {cat}
            </button>
          ))}
        </div>

        {/* Expired Markets */}
        {expiredMarkets.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>📜</span> Expired Markets
            </h2>
            <div className="space-y-3">
              {expiredMarkets.map((market, i) => (
                <div key={i} className="card opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl grayscale">{market.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{market.title}</h3>
                      <div className="text-sm text-[--text-muted]">Resolved</div>
                    </div>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      market.outcome === 'yes'
                        ? 'bg-[--accent-green]/20 text-[--accent-green]'
                        : 'bg-[--accent-red]/20 text-[--accent-red]'
                    }`}>
                      {market.outcome === 'yes' ? 'YES ✓' : 'NO ✓'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Coming Soon */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>🚀</span> Coming Soon
          </h2>
          <div className="space-y-3">
            {filteredComingSoon.length > 0 ? (
              filteredComingSoon.map((market, i) => (
                <ComingSoonMarket
                  key={i}
                  title={market.title}
                  resolutionDate={market.resolutionDate}
                  icon={market.icon}
                  category={market.category}
                />
              ))
            ) : (
              <div className="card text-center py-8 text-[--text-muted]">
                No markets in this category yet
              </div>
            )}
          </div>
        </section>

        {/* LP Widget */}
        <section className="mt-10">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1a1a2e] to-[#0f3460] p-6">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[--accent-green]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[--accent-blue]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                  <span className="text-2xl">💧</span>
                  <h3 className="text-xl font-bold text-white">Become a Liquidity Provider</h3>
                </div>
                <p className="text-gray-300">
                  Earn <span className="text-[--accent-green] font-semibold">0.2% fees</span> on every trade across all markets
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 justify-center sm:justify-start">
                  <span>✓ Instant deposits</span>
                  <span>✓ No lock-up</span>
                  <span>✓ Auto-compounding</span>
                </div>
              </div>
              <Link
                href="/liquidity"
                className="px-8 py-4 bg-[--accent-green] text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-[--accent-green]/25 whitespace-nowrap"
              >
                Add Liquidity →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
