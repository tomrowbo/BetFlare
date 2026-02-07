'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { Header } from '@/components/Header';
import { MiniPriceChart } from '@/components/MiniPriceChart';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { CONTRACTS, MARKETS, Market, UNIVERSAL_VAULT_ABI, FPMM_ABI } from '@/config/contracts';
import { FeaturedMarketSkeleton, MarketListItemSkeleton, StatsCardSkeleton } from '@/components/Skeleton';

function FeaturedMarketCard({
  market,
  yesPrice,
  volume,
  resolved,
}: {
  market: Market;
  yesPrice: number;
  volume: number;
  resolved: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= market.resolutionTime;

  return (
    <Link href={`/markets/${market.slug}`} className="block">
      <div className="card hover:border-[--accent-blue] transition cursor-pointer bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a2e] dark:to-[#16213e]">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{market.icon}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-xl mb-1">{market.title}</h3>
                <div className="text-sm text-[--text-muted]">
                  {resolved ? 'Resolved' : isPastResolution ? 'Awaiting Resolution' : `Resolves ${new Date(market.resolutionTime * 1000).toLocaleString()}`}
                </div>
              </div>
              <div>
                {resolved ? (
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-semibold rounded">RESOLVED</span>
                ) : isPastResolution ? (
                  <span className="px-2 py-1 bg-[--accent-orange]/20 text-[--accent-orange] text-xs font-semibold rounded">AWAITING</span>
                ) : (
                  <span className="px-2 py-1 bg-[--accent-green]/10 text-[--accent-green] text-xs font-semibold rounded">LIVE</span>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between mt-4">
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
                  <div className="text-lg font-semibold">${volume.toFixed(2)}</div>
                </div>
              </div>

              <MiniPriceChart yesPrice={yesPrice} width={128} height={48} fpmmAddress={market.fpmm} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MarketListItem({
  market,
  yesPrice,
  volume,
  resolved,
}: {
  market: Market;
  yesPrice: number;
  volume: number;
  resolved: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= market.resolutionTime;

  return (
    <Link href={`/markets/${market.slug}`} className="block">
      <div className={`card hover:border-[--accent-blue] transition cursor-pointer ${resolved ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="text-2xl">{market.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{market.title}</h3>
            <div className="text-sm text-[--text-muted]">
              <span className="text-[--accent-blue]">{market.category}</span> ·
              {resolved ? ' Resolved' : isPastResolution ? ' Awaiting Resolution' : ` ${new Date(market.resolutionTime * 1000).toLocaleString()}`} ·
              Vol: ${volume.toFixed(2)}
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
            {resolved ? (
              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">RESOLVED</span>
            ) : isPastResolution ? (
              <span className="px-2 py-1 bg-[--accent-orange]/20 text-[--accent-orange] text-xs rounded">AWAITING</span>
            ) : (
              <span className="px-2 py-1 bg-[--accent-green]/10 text-[--accent-green] text-xs rounded">LIVE</span>
            )}
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
  const now = Math.floor(Date.now() / 1000);

  // Read data for all markets
  const marketContracts = MARKETS.flatMap((market) => [
    {
      address: market.fpmm as `0x${string}`,
      abi: FPMM_ABI,
      functionName: 'getYesPrice',
    },
    {
      address: market.fpmm as `0x${string}`,
      abi: FPMM_ABI,
      functionName: 'yesReserve',
    },
    {
      address: market.fpmm as `0x${string}`,
      abi: FPMM_ABI,
      functionName: 'noReserve',
    },
    {
      address: market.fpmm as `0x${string}`,
      abi: FPMM_ABI,
      functionName: 'resolved',
    },
  ]);

  const { data: marketData, isLoading: isLoadingMarkets } = useReadContracts({
    contracts: marketContracts,
  });

  const { data: totalAssets, isLoading: isLoadingTvl } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'totalAssets',
  });

  const isLoading = isLoadingMarkets || isLoadingTvl;

  // Process market data
  const processedMarkets = useMemo(() => {
    return MARKETS.map((market, index) => {
      const baseIndex = index * 4;
      const yesPrice = marketData?.[baseIndex]?.result;
      const yesReserve = marketData?.[baseIndex + 1]?.result;
      const noReserve = marketData?.[baseIndex + 2]?.result;
      const resolved = marketData?.[baseIndex + 3]?.result;

      const formattedYesPrice = yesPrice ? Number(formatUnits(yesPrice as bigint, 18)) : 0.5;
      const volume = yesReserve && noReserve
        ? Number(formatUnits((yesReserve as bigint) + (noReserve as bigint), 6))
        : 0;

      return {
        market,
        yesPrice: formattedYesPrice,
        volume,
        resolved: resolved as boolean || false,
      };
    });
  }, [marketData]);

  // Categorize markets
  const { activeMarkets, awaitingResolution, resolvedMarkets } = useMemo(() => {
    const active: typeof processedMarkets = [];
    const awaiting: typeof processedMarkets = [];
    const resolved: typeof processedMarkets = [];

    for (const pm of processedMarkets) {
      if (pm.resolved) {
        resolved.push(pm);
      } else if (now >= pm.market.resolutionTime) {
        awaiting.push(pm);
      } else {
        active.push(pm);
      }
    }

    return { activeMarkets: active, awaitingResolution: awaiting, resolvedMarkets: resolved };
  }, [processedMarkets, now]);

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
                <div className="text-2xl font-bold">
                  {isLoadingTvl ? (
                    <span className="inline-block w-20 h-7 bg-white/30 rounded animate-pulse" />
                  ) : (
                    `$${tvl.toFixed(2)}`
                  )}
                </div>
                <div className="text-sm text-white/70">Total Locked</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold">{MARKETS.length}</div>
                <div className="text-sm text-white/70">Markets</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Active Markets */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">⚡</span> Active Markets
            </h2>
            <span className="px-2 py-1 bg-[--accent-green]/10 text-[--accent-green] text-xs font-semibold rounded">
              LIVE
            </span>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              // Show skeleton loaders while data is loading
              <>
                <FeaturedMarketSkeleton />
                <FeaturedMarketSkeleton />
              </>
            ) : activeMarkets.length > 0 ? (
              activeMarkets.map((pm) => (
                <FeaturedMarketCard
                  key={pm.market.slug}
                  market={pm.market}
                  yesPrice={pm.yesPrice}
                  volume={pm.volume}
                  resolved={pm.resolved}
                />
              ))
            ) : (
              <div className="card text-center py-8 text-[--text-muted]">
                No active markets
              </div>
            )}
          </div>
        </section>

        {/* Awaiting Resolution */}
        {(isLoading || awaitingResolution.length > 0) && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-xl">⏳</span> Awaiting Resolution
              </h2>
              <span className="px-2 py-1 bg-[--accent-orange]/20 text-[--accent-orange] text-xs font-semibold rounded">
                PENDING
              </span>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <MarketListItemSkeleton />
              ) : (
                awaitingResolution.map((pm) => (
                  <MarketListItem
                    key={pm.market.slug}
                    market={pm.market}
                    yesPrice={pm.yesPrice}
                    volume={pm.volume}
                    resolved={pm.resolved}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* Resolved Markets */}
        {!isLoading && resolvedMarkets.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>📜</span> Resolved Markets
            </h2>
            <div className="space-y-3">
              {resolvedMarkets.map((pm) => (
                <MarketListItem
                  key={pm.market.slug}
                  market={pm.market}
                  yesPrice={pm.yesPrice}
                  volume={pm.volume}
                  resolved={pm.resolved}
                />
              ))}
            </div>
          </section>
        )}

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
