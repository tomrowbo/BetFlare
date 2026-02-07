'use client';

import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { motion } from 'framer-motion';
import { Zap, Clock, Gift, CheckCircle2, TrendingUp, TrendingDown, Wallet, BarChart3 } from 'lucide-react';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { PositionCard, MarketPosition } from '@/components/portfolio/PositionCard';
import { RedeemedHistoryCard, RedeemedPosition } from '@/components/portfolio/RedeemedHistoryCard';
import { CONTRACTS, MARKETS, Market, FPMM_ABI, CONDITIONAL_TOKENS_ABI, FTSO_RESOLVER_ABI } from '@/config/contracts';
import { PositionCardSkeleton, StatsCardSkeleton, Skeleton } from '@/components/Skeleton';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [resolvingMarketId, setResolvingMarketId] = useState<string | null>(null);
  const [redeemingMarketId, setRedeemingMarketId] = useState<string | null>(null);
  const [redeemedHistory, setRedeemedHistory] = useState<RedeemedPosition[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const marketContracts = useMemo(() => {
    if (!address) return [];

    return MARKETS.flatMap((market) => [
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'yesPositionId' },
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'noPositionId' },
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'getYesPrice' },
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'getNoPrice' },
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'resolved' },
      { address: CONTRACTS.conditionalTokens as `0x${string}`, abi: CONDITIONAL_TOKENS_ABI, functionName: 'getPayoutNumerator', args: [market.conditionId as `0x${string}`, BigInt(0)] },
    ]);
  }, [address]);

  const { data: marketData, isLoading: isLoadingMarkets } = useReadContracts({
    contracts: marketContracts,
  });

  useEffect(() => {
    async function fetchRedeemedHistory() {
      if (!address) {
        setRedeemedHistory([]);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const PAYOUT_TOPIC = '0x9140a6a270ef945260c03894b3c6b3b2695e9d5101feef0ff24fec960cfd3224';
        const userPadded = `0x000000000000000000000000${address.slice(2).toLowerCase()}`;

        const response = await fetch(
          `https://coston2-explorer.flare.network/api?module=logs&action=getLogs&address=${CONTRACTS.conditionalTokens}&topic0=${PAYOUT_TOPIC}&fromBlock=0&toBlock=latest`
        );
        const data = await response.json();

        interface LogEntry {
          blockNumber: string;
          transactionHash: string;
          data: string;
          topics: string[];
        }

        const userRedemptions = (data.result || [])
          .filter((log: LogEntry) => log.topics[1]?.toLowerCase() === userPadded)
          .map((log: LogEntry) => {
            const conditionId = log.topics[2];
            const payout = BigInt('0x' + log.data.slice(66, 130));
            const market = MARKETS.find(m => m.conditionId.toLowerCase() === conditionId?.toLowerCase());

            return {
              conditionId,
              payout: Number(formatUnits(payout, 6)),
              txHash: log.transactionHash,
              blockNumber: parseInt(log.blockNumber, 16),
              market,
            };
          })
          .filter((r: { market: Market | undefined; payout: number }) => r.market && r.payout > 0);

        const processedRedemptions: RedeemedPosition[] = [];
        for (const r of userRedemptions) {
          const marketIndex = MARKETS.findIndex(m => m.conditionId.toLowerCase() === r.conditionId?.toLowerCase());
          if (marketIndex >= 0 && marketData) {
            const baseIndex = marketIndex * 6;
            const yesPayoutNumerator = marketData[baseIndex + 5]?.result as bigint | undefined;
            const yesWon = yesPayoutNumerator === BigInt(1);

            processedRedemptions.push({
              market: r.market,
              payout: r.payout,
              yesWon,
              txHash: r.txHash,
              blockNumber: r.blockNumber,
            });
          }
        }

        setRedeemedHistory(processedRedemptions);
      } catch (err) {
        console.error('Failed to fetch redeemed history:', err);
        setRedeemedHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    fetchRedeemedHistory();
  }, [address, marketData]);

  const balanceContracts = useMemo(() => {
    if (!address || !marketData) return [];

    return MARKETS.flatMap((market, index) => {
      const baseIndex = index * 6;
      const yesPositionId = marketData[baseIndex]?.result as bigint | undefined;
      const noPositionId = marketData[baseIndex + 1]?.result as bigint | undefined;

      if (!yesPositionId || !noPositionId) return [];

      return [
        {
          address: CONTRACTS.conditionalTokens as `0x${string}`,
          abi: CONDITIONAL_TOKENS_ABI,
          functionName: 'balanceOf',
          args: [address, yesPositionId],
        },
        {
          address: CONTRACTS.conditionalTokens as `0x${string}`,
          abi: CONDITIONAL_TOKENS_ABI,
          functionName: 'balanceOf',
          args: [address, noPositionId],
        },
      ];
    });
  }, [address, marketData]);

  const { data: balanceData, isLoading: isLoadingBalances } = useReadContracts({
    contracts: balanceContracts,
  });

  const isLoading = isLoadingMarkets || isLoadingBalances;

  const positions = useMemo((): MarketPosition[] => {
    if (!marketData || !balanceData) return [];

    const result: MarketPosition[] = [];
    let balanceIndex = 0;

    MARKETS.forEach((market, index) => {
      const baseIndex = index * 6;
      const yesPositionId = marketData[baseIndex]?.result as bigint | undefined;
      const noPositionId = marketData[baseIndex + 1]?.result as bigint | undefined;
      const yesPrice = marketData[baseIndex + 2]?.result as bigint | undefined;
      const noPrice = marketData[baseIndex + 3]?.result as bigint | undefined;
      const resolved = marketData[baseIndex + 4]?.result as boolean | undefined;
      const yesPayoutNumerator = marketData[baseIndex + 5]?.result as bigint | undefined;

      if (!yesPositionId || !noPositionId) return;

      const yesBalanceRaw = balanceData[balanceIndex]?.result as bigint | undefined;
      const noBalanceRaw = balanceData[balanceIndex + 1]?.result as bigint | undefined;
      balanceIndex += 2;

      const yesBalance = yesBalanceRaw ? Number(formatUnits(yesBalanceRaw, 6)) : 0;
      const noBalance = noBalanceRaw ? Number(formatUnits(noBalanceRaw, 6)) : 0;
      const formattedYesPrice = yesPrice ? Number(formatUnits(yesPrice, 18)) : 0.5;
      const formattedNoPrice = noPrice ? Number(formatUnits(noPrice, 18)) : 0.5;

      const yesWon = resolved && yesPayoutNumerator !== undefined
        ? yesPayoutNumerator === BigInt(1)
        : null;

      if (yesBalance > 0 || noBalance > 0) {
        result.push({
          market,
          yesBalance,
          noBalance,
          yesPrice: formattedYesPrice,
          noPrice: formattedNoPrice,
          resolved: resolved || false,
          yesValue: yesBalance * formattedYesPrice,
          noValue: noBalance * formattedNoPrice,
          yesPositionId: yesPositionId,
          noPositionId: noPositionId,
          yesWon,
        });
      }
    });

    return result;
  }, [marketData, balanceData]);

  const { activePositions, awaitingPositions, resolvedPositions } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const active: MarketPosition[] = [];
    const awaiting: MarketPosition[] = [];
    const resolved: MarketPosition[] = [];

    for (const pos of positions) {
      if (pos.resolved) {
        resolved.push(pos);
      } else if (now >= pos.market.resolutionTime) {
        awaiting.push(pos);
      } else {
        active.push(pos);
      }
    }

    return { activePositions: active, awaitingPositions: awaiting, resolvedPositions: resolved };
  }, [positions]);

  const totals = useMemo(() => {
    let yesValue = 0;
    let noValue = 0;

    for (const pos of positions) {
      yesValue += pos.yesValue;
      noValue += pos.noValue;
    }

    const totalRedeemed = redeemedHistory.reduce((sum, item) => sum + item.payout, 0);

    return { yesValue, noValue, totalValue: yesValue + noValue, totalRedeemed };
  }, [positions, redeemedHistory]);

  const { writeContract: writeResolve, data: resolveTxHash } = useWriteContract();
  const { isLoading: isConfirmingResolve } = useWaitForTransactionReceipt({
    hash: resolveTxHash,
  });

  const { writeContract: writeRedeem, data: redeemTxHash } = useWriteContract();
  const { isLoading: isConfirmingRedeem } = useWaitForTransactionReceipt({
    hash: redeemTxHash,
  });

  const handleResolve = (market: Market) => {
    setResolvingMarketId(market.marketId);
    writeResolve({
      address: market.resolver as `0x${string}`,
      abi: FTSO_RESOLVER_ABI,
      functionName: 'resolve',
      args: [market.marketId as `0x${string}`],
    });
  };

  const handleRedeem = (market: Market) => {
    setRedeemingMarketId(market.marketId);
    writeRedeem({
      address: CONTRACTS.conditionalTokens as `0x${string}`,
      abi: CONDITIONAL_TOKENS_ABI,
      functionName: 'redeemPositions',
      args: [market.conditionId as `0x${string}`],
    });
  };

  const hasPositions = positions.length > 0;

  return (
    <main className="min-h-screen">
      <Header />

      <PageContainer maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <span className="inline-block px-3 py-1 border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-4 tracking-wider uppercase">
            Portfolio
          </span>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white uppercase tracking-tighter leading-[1.1]">
            Your <span className="text-primary">Positions</span>
          </h1>
          <p className="text-muted-foreground text-base font-light leading-relaxed mt-3">
            Track and manage your prediction market positions
          </p>
        </motion.div>

        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 text-center py-16 px-8"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg font-light mb-2">
              Connect your wallet to view your positions
            </p>
            <p className="text-white/20 text-sm">
              Your active bets, results, and redemption history will appear here
            </p>
          </motion.div>
        ) : isLoading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </div>
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-5 h-5 bg-white/5 rounded animate-pulse" />
                <div className="w-36 h-5 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="space-y-4">
                <PositionCardSkeleton />
                <PositionCardSkeleton />
              </div>
            </section>
          </>
        ) : !hasPositions ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 text-center py-16 px-8"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <BarChart3 className="w-7 h-7 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg font-light mb-3">
              You don&apos;t have any positions yet
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-display font-semibold text-primary hover:text-primary/80 uppercase tracking-wide transition-colors"
            >
              Browse markets to place your first bet
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
            >
              <StatCard
                icon={<BarChart3 className="w-4 h-4 text-primary/60" />}
                label="Active Value"
                value={`$${totals.totalValue.toFixed(2)}`}
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4 text-green-400/60" />}
                label="YES Positions"
                value={`$${totals.yesValue.toFixed(2)}`}
                valueColor="text-green-400"
              />
              <StatCard
                icon={<TrendingDown className="w-4 h-4 text-red-400/60" />}
                label="NO Positions"
                value={`$${totals.noValue.toFixed(2)}`}
                valueColor="text-red-400"
              />
              <StatCard
                icon={<CheckCircle2 className="w-4 h-4 text-green-400/60" />}
                label="Redeemed"
                value={
                  isLoadingHistory
                    ? undefined
                    : `$${totals.totalRedeemed.toFixed(2)}`
                }
                valueColor="text-green-400"
                isLoading={isLoadingHistory}
              />
            </motion.div>

            {activePositions.length > 0 && (
              <PositionSection
                icon={<Zap className="w-4 h-4 text-primary" />}
                title="Active Positions"
                delay={0.15}
              >
                <div className="space-y-4">
                  {activePositions.map((pos, i) => (
                    <PositionCard
                      key={pos.market.slug}
                      position={pos}
                      onResolve={() => handleResolve(pos.market)}
                      onRedeem={() => handleRedeem(pos.market)}
                      isResolving={resolvingMarketId === pos.market.marketId && isConfirmingResolve}
                      isRedeeming={redeemingMarketId === pos.market.marketId && isConfirmingRedeem}
                      index={i}
                    />
                  ))}
                </div>
              </PositionSection>
            )}

            {awaitingPositions.length > 0 && (
              <PositionSection
                icon={<Clock className="w-4 h-4 text-primary" />}
                title="Awaiting Resolution"
                subtitle="Click to resolve and claim winnings"
                delay={0.2}
              >
                <div className="space-y-4">
                  {awaitingPositions.map((pos, i) => (
                    <PositionCard
                      key={pos.market.slug}
                      position={pos}
                      onResolve={() => handleResolve(pos.market)}
                      onRedeem={() => handleRedeem(pos.market)}
                      isResolving={resolvingMarketId === pos.market.marketId && isConfirmingResolve}
                      isRedeeming={redeemingMarketId === pos.market.marketId && isConfirmingRedeem}
                      index={i}
                    />
                  ))}
                </div>
              </PositionSection>
            )}

            {resolvedPositions.length > 0 && (
              <PositionSection
                icon={<Gift className="w-4 h-4 text-green-400" />}
                title="Awaiting Redemption"
                subtitle="Claim your winnings"
                delay={0.25}
              >
                <div className="space-y-4">
                  {resolvedPositions.map((pos, i) => (
                    <PositionCard
                      key={pos.market.slug}
                      position={pos}
                      onResolve={() => handleResolve(pos.market)}
                      onRedeem={() => handleRedeem(pos.market)}
                      isResolving={false}
                      isRedeeming={redeemingMarketId === pos.market.marketId && isConfirmingRedeem}
                      index={i}
                    />
                  ))}
                </div>
              </PositionSection>
            )}

            {(isLoadingHistory || redeemedHistory.length > 0) && (
              <PositionSection
                icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
                title="Redeemed History"
                delay={0.3}
              >
                {isLoadingHistory ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-card/50 border border-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton width={32} height={32} rounded="full" />
                          <div>
                            <Skeleton width={200} height={16} className="mb-2" />
                            <Skeleton width={120} height={12} />
                          </div>
                        </div>
                        <Skeleton width={80} height={22} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {redeemedHistory.map((item, i) => (
                      <RedeemedHistoryCard key={`${item.txHash}-${i}`} item={item} index={i} />
                    ))}
                  </div>
                )}
              </PositionSection>
            )}
          </>
        )}
      </PageContainer>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor = "text-white",
  isLoading = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueColor?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
          {label}
        </span>
      </div>
      <div className={`text-xl md:text-2xl font-display font-bold ${valueColor}`}>
        {isLoading ? (
          <span className="inline-block w-16 h-7 bg-white/5 rounded animate-pulse" />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function PositionSection({
  icon,
  title,
  subtitle,
  delay = 0,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10"
    >
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-sm font-display font-bold text-white uppercase tracking-wide">
          {title}
        </h2>
        {subtitle && (
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/20 ml-1">
            — {subtitle}
          </span>
        )}
      </div>
      {children}
    </motion.section>
  );
}
