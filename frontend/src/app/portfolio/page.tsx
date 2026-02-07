'use client';

import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { Header } from '@/components/Header';
import { CONTRACTS, MARKETS, Market, FPMM_ABI, CONDITIONAL_TOKENS_ABI, FTSO_RESOLVER_ABI } from '@/config/contracts';
import { PositionCardSkeleton, StatsCardSkeleton, Skeleton } from '@/components/Skeleton';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

// Interface for redeemed history
interface RedeemedPosition {
  market: Market;
  payout: number;
  yesWon: boolean;
  txHash: string;
  blockNumber: number;
}

interface MarketPosition {
  market: Market;
  yesBalance: number;
  noBalance: number;
  yesPrice: number;
  noPrice: number;
  resolved: boolean;
  yesValue: number;
  noValue: number;
  yesPositionId: bigint;
  noPositionId: bigint;
  yesWon: boolean | null; // null if not resolved, true/false if resolved
}

function PositionCard({
  position,
  onResolve,
  onRedeem,
  isResolving,
  isRedeeming,
}: {
  position: MarketPosition;
  onResolve: () => void;
  onRedeem: () => void;
  isResolving: boolean;
  isRedeeming: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= position.market.resolutionTime;
  const canResolve = isPastResolution && !position.resolved;

  // Calculate redeemable amount (only winning side pays out)
  const hasWinningPosition = position.resolved && position.yesWon !== null && (
    (position.yesWon && position.yesBalance > 0) || (!position.yesWon && position.noBalance > 0)
  );
  const redeemableAmount = position.resolved && position.yesWon !== null
    ? (position.yesWon ? position.yesBalance : position.noBalance)
    : 0;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{position.market.icon}</span>
          <div>
            <Link href={`/markets/${position.market.slug}`} className="text-lg font-bold hover:text-[--accent-blue]">
              {position.market.title}
            </Link>
            <div className="text-sm text-[--text-secondary]">
              {position.resolved
                ? 'Resolved'
                : isPastResolution
                  ? `Resolution time passed - ${new Date(position.market.resolutionTime * 1000).toLocaleString()}`
                  : `Resolves ${new Date(position.market.resolutionTime * 1000).toLocaleString()}`
              }
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {position.resolved ? (
            <div className="flex items-center gap-2">
              {position.yesWon !== null && (
                <span className={`px-3 py-1 text-sm font-bold rounded ${
                  position.yesWon
                    ? 'bg-[--accent-green]/20 text-[--accent-green]'
                    : 'bg-[--accent-red]/20 text-[--accent-red]'
                }`}>
                  {position.yesWon ? 'YES WON' : 'NO WON'}
                </span>
              )}
              {hasWinningPosition && (
                <button
                  onClick={onRedeem}
                  disabled={isRedeeming}
                  className="px-4 py-2 bg-[--accent-green] text-white text-sm font-semibold rounded-lg hover:bg-[--accent-green]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRedeeming ? 'Redeeming...' : `Redeem $${redeemableAmount.toFixed(2)}`}
                </button>
              )}
            </div>
          ) : canResolve ? (
            <button
              onClick={onResolve}
              disabled={isResolving}
              className="px-4 py-2 bg-[--accent-orange] text-white text-sm font-semibold rounded-lg hover:bg-[--accent-orange]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResolving ? 'Resolving...' : 'Resolve Market'}
            </button>
          ) : (
            <span className="px-2 py-1 bg-[--accent-green] text-white text-xs rounded">Active</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {position.yesBalance > 0 && (
          <div className={`p-4 rounded-lg border ${
            position.resolved
              ? position.yesWon
                ? 'bg-[--accent-green]/20 border-[--accent-green]/40'
                : 'bg-gray-500/10 border-gray-500/20 opacity-60'
              : 'bg-[--accent-green]/10 border-[--accent-green]/20'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${position.resolved && !position.yesWon ? 'text-gray-400' : 'text-[--accent-green]'}`}>
                YES {position.resolved && (position.yesWon ? '(Winner)' : '(Lost)')}
              </span>
              {!position.resolved && (
                <span className="text-sm text-[--text-muted]">@ {(position.yesPrice * 100).toFixed(0)}¢</span>
              )}
            </div>
            <div className="text-2xl font-bold">{position.yesBalance.toFixed(2)}</div>
            <div className="text-sm text-[--text-secondary]">shares</div>
            <div className="mt-2 pt-2 border-t border-[--border-color]">
              {position.resolved ? (
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Payout</span>
                  <span className={`font-bold ${position.yesWon ? 'text-[--accent-green]' : 'text-gray-400'}`}>
                    ${position.yesWon ? position.yesBalance.toFixed(2) : '0.00'}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--text-muted]">Value</span>
                    <span className="font-medium">${position.yesValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--text-muted]">If YES wins</span>
                    <span className="font-medium text-[--accent-green]">${position.yesBalance.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {position.noBalance > 0 && (
          <div className={`p-4 rounded-lg border ${
            position.resolved
              ? !position.yesWon
                ? 'bg-[--accent-red]/20 border-[--accent-red]/40'
                : 'bg-gray-500/10 border-gray-500/20 opacity-60'
              : 'bg-[--accent-red]/10 border-[--accent-red]/20'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${position.resolved && position.yesWon ? 'text-gray-400' : 'text-[--accent-red]'}`}>
                NO {position.resolved && (!position.yesWon ? '(Winner)' : '(Lost)')}
              </span>
              {!position.resolved && (
                <span className="text-sm text-[--text-muted]">@ {(position.noPrice * 100).toFixed(0)}¢</span>
              )}
            </div>
            <div className="text-2xl font-bold">{position.noBalance.toFixed(2)}</div>
            <div className="text-sm text-[--text-secondary]">shares</div>
            <div className="mt-2 pt-2 border-t border-[--border-color]">
              {position.resolved ? (
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Payout</span>
                  <span className={`font-bold ${!position.yesWon ? 'text-[--accent-red]' : 'text-gray-400'}`}>
                    ${!position.yesWon ? position.noBalance.toFixed(2) : '0.00'}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--text-muted]">Value</span>
                    <span className="font-medium">${position.noValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--text-muted]">If NO wins</span>
                    <span className="font-medium text-[--accent-red]">${position.noBalance.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for redeemed history items
function RedeemedHistoryCard({ item }: { item: RedeemedPosition }) {
  return (
    <div className="card bg-[--bg-secondary]/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{item.market.icon}</span>
          <div>
            <Link href={`/markets/${item.market.slug}`} className="font-semibold hover:text-[--accent-blue]">
              {item.market.title}
            </Link>
            <div className="flex items-center gap-2 text-sm text-[--text-muted]">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                item.yesWon
                  ? 'bg-[--accent-green]/20 text-[--accent-green]'
                  : 'bg-[--accent-red]/20 text-[--accent-red]'
              }`}>
                {item.yesWon ? 'YES WON' : 'NO WON'}
              </span>
              <span>•</span>
              <a
                href={`https://coston2-explorer.flare.network/tx/${item.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[--accent-blue] hover:underline"
              >
                View tx
              </a>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[--accent-green]">+${item.payout.toFixed(2)}</div>
          <div className="text-xs text-[--text-muted]">Redeemed</div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [resolvingMarketId, setResolvingMarketId] = useState<string | null>(null);
  const [redeemingMarketId, setRedeemingMarketId] = useState<string | null>(null);
  const [redeemedHistory, setRedeemedHistory] = useState<RedeemedPosition[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Build contracts array for reading all market data
  const marketContracts = useMemo(() => {
    if (!address) return [];

    return MARKETS.flatMap((market) => [
      // Get position IDs from FPMM
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'yesPositionId' },
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'noPositionId' },
      // Get prices
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'getYesPrice' },
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'getNoPrice' },
      // Get resolved status
      { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'resolved' },
      // Get payout numerator for YES outcome (to know who won)
      { address: CONTRACTS.conditionalTokens as `0x${string}`, abi: CONDITIONAL_TOKENS_ABI, functionName: 'getPayoutNumerator', args: [market.conditionId as `0x${string}`, BigInt(0)] },
    ]);
  }, [address]);

  const { data: marketData, isLoading: isLoadingMarkets } = useReadContracts({
    contracts: marketContracts,
  });

  // Fetch redeemed history from blockchain events
  useEffect(() => {
    async function fetchRedeemedHistory() {
      if (!address) {
        setRedeemedHistory([]);
        return;
      }

      setIsLoadingHistory(true);
      try {
        // PayoutRedemption(address indexed,bytes32 indexed,uint256[],uint256) event topic
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

        // Filter for user's redemptions (topic1 is redeemer)
        const userRedemptions = (data.result || [])
          .filter((log: LogEntry) => log.topics[1]?.toLowerCase() === userPadded)
          .map((log: LogEntry) => {
            // Parse conditionId from topics[2]
            const conditionId = log.topics[2];
            // Data format: [offset (32 bytes)][payout (32 bytes)][indexSets array...]
            // Payout is in bytes 32-64 of data (after the offset)
            const payout = BigInt('0x' + log.data.slice(66, 130));

            // Find matching market
            const market = MARKETS.find(m => m.conditionId.toLowerCase() === conditionId?.toLowerCase());

            return {
              conditionId,
              payout: Number(formatUnits(payout, 6)),
              txHash: log.transactionHash,
              blockNumber: parseInt(log.blockNumber, 16),
              market,
            };
          })
          .filter((r: { market: Market | undefined; payout: number }) => r.market && r.payout > 0); // Only include known markets with positive payout

        // Now we need to determine yesWon for each redemption
        // We'll fetch this from the marketData we already have
        const processedRedemptions: RedeemedPosition[] = [];
        for (const r of userRedemptions) {
          // Find the market index
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

  // Build contracts for user balances (needs position IDs from previous query)
  const balanceContracts = useMemo(() => {
    if (!address || !marketData) return [];

    return MARKETS.flatMap((market, index) => {
      const baseIndex = index * 6; // Now 6 items per market
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

  // Process all data into positions
  const positions = useMemo((): MarketPosition[] => {
    if (!marketData || !balanceData) return [];

    const result: MarketPosition[] = [];
    let balanceIndex = 0;

    MARKETS.forEach((market, index) => {
      const baseIndex = index * 6; // Now 6 items per market
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

      // Determine who won (yesPayoutNumerator == 1 means YES won, == 0 means NO won)
      // Only valid if market is resolved
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

  // Categorize positions
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

  // Calculate totals
  const totals = useMemo(() => {
    let yesValue = 0;
    let noValue = 0;

    for (const pos of positions) {
      yesValue += pos.yesValue;
      noValue += pos.noValue;
    }

    // Add total redeemed
    const totalRedeemed = redeemedHistory.reduce((sum, item) => sum + item.payout, 0);

    return { yesValue, noValue, totalValue: yesValue + noValue, totalRedeemed };
  }, [positions, redeemedHistory]);

  // Resolve market transaction
  const { writeContract: writeResolve, data: resolveTxHash } = useWriteContract();
  const { isLoading: isConfirmingResolve } = useWaitForTransactionReceipt({
    hash: resolveTxHash,
  });

  // Redeem transaction
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
        <p className="text-[--text-secondary] mb-8">Your prediction market positions</p>

        {!isConnected ? (
          <div className="card text-center py-12">
            <p className="text-[--text-secondary] mb-4">Connect your wallet to view your positions</p>
          </div>
        ) : isLoading ? (
          <>
            {/* Loading skeleton for portfolio summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </div>
            {/* Loading skeleton for positions */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-[--bg-secondary] rounded animate-pulse" />
                <div className="w-32 h-6 bg-[--bg-secondary] rounded animate-pulse" />
              </div>
              <div className="space-y-4">
                <PositionCardSkeleton />
                <PositionCardSkeleton />
              </div>
            </section>
          </>
        ) : !hasPositions ? (
          <div className="card text-center py-12">
            <p className="text-[--text-secondary] mb-4">You don&apos;t have any positions yet</p>
            <a href="/" className="text-[--accent-blue] hover:underline">Browse markets to place your first bet</a>
          </div>
        ) : (
          <>
            {/* Portfolio Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="card text-center">
                <div className="text-sm text-[--text-muted]">Active Value</div>
                <div className="text-2xl font-bold">${totals.totalValue.toFixed(2)}</div>
              </div>
              <div className="card text-center">
                <div className="text-sm text-[--text-muted]">YES Positions</div>
                <div className="text-2xl font-bold text-[--accent-green]">${totals.yesValue.toFixed(2)}</div>
              </div>
              <div className="card text-center">
                <div className="text-sm text-[--text-muted]">NO Positions</div>
                <div className="text-2xl font-bold text-[--accent-red]">${totals.noValue.toFixed(2)}</div>
              </div>
              <div className="card text-center">
                <div className="text-sm text-[--text-muted]">Total Redeemed</div>
                <div className="text-2xl font-bold text-[--accent-green]">
                  {isLoadingHistory ? (
                    <span className="inline-block w-16 h-7 bg-[--bg-secondary] rounded animate-pulse" />
                  ) : (
                    `$${totals.totalRedeemed.toFixed(2)}`
                  )}
                </div>
              </div>
            </div>

            {/* Active Positions */}
            {activePositions.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-lg">⚡</span> Active Positions
                </h2>
                <div className="space-y-4">
                  {activePositions.map((pos) => (
                    <PositionCard
                      key={pos.market.slug}
                      position={pos}
                      onResolve={() => handleResolve(pos.market)}
                      onRedeem={() => handleRedeem(pos.market)}
                      isResolving={resolvingMarketId === pos.market.marketId && isConfirmingResolve}
                      isRedeeming={redeemingMarketId === pos.market.marketId && isConfirmingRedeem}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Awaiting Resolution */}
            {awaitingPositions.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-lg">⏳</span> Awaiting Resolution
                  <span className="text-sm font-normal text-[--text-muted]">- Click to resolve and claim winnings</span>
                </h2>
                <div className="space-y-4">
                  {awaitingPositions.map((pos) => (
                    <PositionCard
                      key={pos.market.slug}
                      position={pos}
                      onResolve={() => handleResolve(pos.market)}
                      onRedeem={() => handleRedeem(pos.market)}
                      isResolving={resolvingMarketId === pos.market.marketId && isConfirmingResolve}
                      isRedeeming={redeemingMarketId === pos.market.marketId && isConfirmingRedeem}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Awaiting Redemption */}
            {resolvedPositions.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-lg">🎁</span> Awaiting Redemption
                  <span className="text-sm font-normal text-[--text-muted]">- Claim your winnings</span>
                </h2>
                <div className="space-y-4">
                  {resolvedPositions.map((pos) => (
                    <PositionCard
                      key={pos.market.slug}
                      position={pos}
                      onResolve={() => handleResolve(pos.market)}
                      onRedeem={() => handleRedeem(pos.market)}
                      isResolving={false}
                      isRedeeming={redeemingMarketId === pos.market.marketId && isConfirmingRedeem}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Redeemed History */}
            {(isLoadingHistory || redeemedHistory.length > 0) && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-lg">✅</span> Redeemed History
                </h2>
                {isLoadingHistory ? (
                  <div className="space-y-3">
                    <div className="card bg-[--bg-secondary]/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton width={32} height={32} rounded="lg" />
                          <div>
                            <Skeleton width={200} height={18} className="mb-2" />
                            <Skeleton width={120} height={14} />
                          </div>
                        </div>
                        <Skeleton width={80} height={24} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {redeemedHistory.map((item, i) => (
                      <RedeemedHistoryCard key={`${item.txHash}-${i}`} item={item} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
