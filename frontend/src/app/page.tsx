'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { useState, useMemo } from 'react';
import { Zap, Clock, ScrollText } from 'lucide-react';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HeroBanner } from '@/components/home/HeroBanner';
import { FeaturedMarketCard } from '@/components/home/FeaturedMarketCard';
import { MarketListItem } from '@/components/home/MarketListItem';
import { ComingSoonCard } from '@/components/home/ComingSoonCard';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { LiquidityCTA } from '@/components/home/LiquidityCTA';
import { CONTRACTS, MARKETS, UNIVERSAL_VAULT_ABI, FPMM_ABI } from '@/config/contracts';
import { FeaturedMarketSkeleton, MarketListItemSkeleton } from '@/components/Skeleton';

const CATEGORIES = ['All', 'Price', 'DeFi', 'Ecosystem'] as const;

const COMING_SOON_MARKETS = [
  { title: 'Will FLR be above $0.025 by Feb 14th?', resolutionDate: 'Feb 14, 2026', category: 'Price' },
  { title: 'Will XRP hit $4.00 by end of February?', resolutionDate: 'Feb 28, 2026', category: 'Price' },
  { title: 'Will Flare TVL exceed $500M by March?', resolutionDate: 'Mar 1, 2026', category: 'DeFi' },
  { title: 'Will XRP market cap flip Ethereum?', resolutionDate: 'Mar 15, 2026', category: 'Ecosystem' },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('All');
  const now = Math.floor(Date.now() / 1000);

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

  const filteredComingSoon = activeCategory === 'All'
    ? COMING_SOON_MARKETS
    : COMING_SOON_MARKETS.filter(m => m.category === activeCategory);

  return (
    <main className="min-h-screen">
      <Header />
      <HeroBanner tvl={tvl} marketCount={MARKETS.length} isLoading={isLoadingTvl} />

      <PageContainer maxWidth="md">
        {/* Active Markets */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold text-white uppercase tracking-tight">
                Active Markets
              </h2>
            </div>
            <StatusBadge variant="live" />
          </div>
          <div className="space-y-4">
            {isLoading ? (
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
              <div className="glass-card text-center py-10 text-muted-foreground">
                No active markets
              </div>
            )}
          </div>
        </section>

        {/* Awaiting Resolution */}
        {(isLoading || awaitingResolution.length > 0) && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary/60" />
                <h2 className="text-lg font-display font-bold text-white uppercase tracking-tight">
                  Awaiting Resolution
                </h2>
              </div>
              <StatusBadge variant="pending" />
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
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <ScrollText className="w-5 h-5 text-white/30" />
              <h2 className="text-lg font-display font-bold text-white/40 uppercase tracking-tight">
                Resolved Markets
              </h2>
            </div>
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

        {/* Category Tabs + Coming Soon */}
        <div className="mb-5">
          <CategoryTabs
            categories={CATEGORIES}
            active={activeCategory}
            onChange={(cat) => setActiveCategory(cat as typeof CATEGORIES[number])}
          />
        </div>

        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-display font-bold text-white/50 uppercase tracking-tight">
              Coming Soon
            </h2>
          </div>
          <div className="space-y-3">
            {filteredComingSoon.length > 0 ? (
              filteredComingSoon.map((market, i) => (
                <ComingSoonCard
                  key={i}
                  title={market.title}
                  resolutionDate={market.resolutionDate}
                  category={market.category}
                />
              ))
            ) : (
              <div className="glass-card text-center py-10 text-muted-foreground">
                No markets in this category yet
              </div>
            )}
          </div>
        </section>

        <LiquidityCTA />
      </PageContainer>
    </main>
  );
}
