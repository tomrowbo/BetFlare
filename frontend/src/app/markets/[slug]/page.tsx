'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { MarketCard } from '@/components/MarketCard';
import { BetSlip } from '@/components/BetSlip';
import { PositionView } from '@/components/PositionView';
import { getMarketBySlug, FPMM_ABI, CONTRACTS, CONDITIONAL_TOKENS_ABI, FTSO_RESOLVER_ABI } from '@/config/contracts';
import { MarketCardSkeleton, BetSlipSkeleton, PositionCardSkeleton } from '@/components/Skeleton';
import { formatUnits } from 'viem';

export default function MarketPage() {
  const { address, isConnected } = useAccount();
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();
  const params = useParams();
  const slug = params.slug as string;

  const market = getMarketBySlug(slug);

  // Callback to refresh all data after a trade
  const handleTradeSuccess = useCallback(() => {
    // Invalidate all wagmi queries to refetch prices, balances, etc.
    queryClient.invalidateQueries();
    // Also trigger a key change to force re-render
    setRefreshKey(prev => prev + 1);
  }, [queryClient]);

  // Fetch market resolved status
  const { data: resolved } = useReadContract({
    address: market?.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'resolved',
  });

  // Fetch payout numerator to know who won
  const { data: yesPayoutNumerator } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'getPayoutNumerator',
    args: market ? [market.conditionId as `0x${string}`, BigInt(0)] : undefined,
  });

  // Fetch user's position IDs
  const { data: yesPositionId } = useReadContract({
    address: market?.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'yesPositionId',
  });

  const { data: noPositionId } = useReadContract({
    address: market?.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'noPositionId',
  });

  // Fetch user's balances
  const { data: yesBalance } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'balanceOf',
    args: address && yesPositionId ? [address, yesPositionId as bigint] : undefined,
  });

  const { data: noBalance } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'balanceOf',
    args: address && noPositionId ? [address, noPositionId as bigint] : undefined,
  });

  // Transaction handlers
  const { writeContract: writeResolve, data: resolveTxHash } = useWriteContract();
  const { isLoading: isResolving, isSuccess: resolveSuccess } = useWaitForTransactionReceipt({ hash: resolveTxHash });

  const { writeContract: writeRedeem, data: redeemTxHash } = useWriteContract();
  const { isLoading: isRedeeming, isSuccess: redeemSuccess } = useWaitForTransactionReceipt({ hash: redeemTxHash });

  // Auto-refresh after resolve or redeem transactions succeed
  useEffect(() => {
    if (resolveSuccess || redeemSuccess) {
      // Invalidate all queries to refetch resolved status, balances, etc.
      queryClient.invalidateQueries();
      setRefreshKey(prev => prev + 1);
    }
  }, [resolveSuccess, redeemSuccess, queryClient]);

  if (!market) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Market Not Found</h1>
            <p className="text-[--text-secondary] mb-4">
              The market &quot;{slug}&quot; does not exist.
            </p>
            <Link href="/" className="text-[--accent-blue] hover:underline">
              ← Back to markets
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= market.resolutionTime;
  const isResolved = resolved === true;
  const yesWon = isResolved && yesPayoutNumerator !== undefined ? yesPayoutNumerator === BigInt(1) : null;

  // Calculate user's redeemable amount
  const userYesBalance = yesBalance ? Number(formatUnits(yesBalance as bigint, 6)) : 0;
  const userNoBalance = noBalance ? Number(formatUnits(noBalance as bigint, 6)) : 0;
  const hasWinningPosition = isResolved && yesWon !== null && (
    (yesWon && userYesBalance > 0) || (!yesWon && userNoBalance > 0)
  );
  const redeemableAmount = isResolved && yesWon !== null
    ? (yesWon ? userYesBalance : userNoBalance)
    : 0;

  const handleResolve = () => {
    writeResolve({
      address: market.resolver as `0x${string}`,
      abi: FTSO_RESOLVER_ABI,
      functionName: 'resolve',
      args: [market.marketId as `0x${string}`],
    });
  };

  const handleRedeem = () => {
    writeRedeem({
      address: CONTRACTS.conditionalTokens as `0x${string}`,
      abi: CONDITIONAL_TOKENS_ABI,
      functionName: 'redeemPositions',
      args: [market.conditionId as `0x${string}`],
    });
  };

  const resolutionDate = new Date(market.resolutionTime * 1000).toLocaleString();

  return (
    <main className="min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="text-sm text-[--accent-blue] hover:underline mb-4 inline-flex items-center gap-1"
        >
          ← Back to markets
        </Link>

        {/* Resolution Status Banner */}
        {isResolved && (
          <div className={`mt-4 p-4 rounded-xl border-2 ${
            yesWon
              ? 'bg-[--accent-green]/10 border-[--accent-green]/30'
              : 'bg-[--accent-red]/10 border-[--accent-red]/30'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{yesWon ? '✅' : '❌'}</span>
                <div>
                  <div className={`text-xl font-bold ${yesWon ? 'text-[--accent-green]' : 'text-[--accent-red]'}`}>
                    {yesWon ? 'YES' : 'NO'} Won
                  </div>
                  <div className="text-sm text-[--text-secondary]">
                    Market resolved • {market.title}
                  </div>
                </div>
              </div>
              {isConnected && hasWinningPosition && (
                <button
                  onClick={handleRedeem}
                  disabled={isRedeeming}
                  className="px-6 py-3 bg-[--accent-green] text-white font-bold rounded-xl hover:bg-[--accent-green]/80 transition disabled:opacity-50"
                >
                  {isRedeeming ? 'Redeeming...' : `Redeem $${redeemableAmount.toFixed(2)}`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Awaiting Resolution Banner */}
        {isPastResolution && !isResolved && (
          <div className="mt-4 p-4 rounded-xl border-2 bg-[--accent-orange]/10 border-[--accent-orange]/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⏳</span>
                <div>
                  <div className="text-xl font-bold text-[--accent-orange]">
                    Awaiting Resolution
                  </div>
                  <div className="text-sm text-[--text-secondary]">
                    Resolution time passed • Click to resolve using FTSO oracle
                  </div>
                </div>
              </div>
              <button
                onClick={handleResolve}
                disabled={isResolving}
                className="px-6 py-3 bg-[--accent-orange] text-white font-bold rounded-xl hover:bg-[--accent-orange]/80 transition disabled:opacity-50"
              >
                {isResolving ? 'Resolving...' : 'Resolve Market'}
              </button>
            </div>
          </div>
        )}

        {/* Market Detail View */}
        <div className="grid lg:grid-cols-3 gap-6 mt-4">
          <div className="lg:col-span-2">
            <MarketCard
              key={`market-${refreshKey}`}
              selectedSide={selectedSide}
              onSelectSide={setSelectedSide}
              fpmmAddress={market.fpmm}
              title={market.title}
              resolutionDate={resolutionDate}
              resolved={isResolved}
              yesWon={yesWon}
              isPastResolution={isPastResolution}
            />
          </div>
          <div className="space-y-4">
            {!isResolved ? (
              <>
                <BetSlip
                  side={selectedSide}
                  disabled={!isConnected || isPastResolution}
                  fpmmAddress={market.fpmm}
                  resolved={isResolved}
                  isPastResolution={isPastResolution}
                  onTradeSuccess={handleTradeSuccess}
                />
                <PositionView
                  key={`position-${refreshKey}`}
                  fpmmAddress={market.fpmm}
                  conditionId={market.conditionId}
                  resolved={isResolved}
                  yesWon={yesWon}
                  onRedeem={handleRedeem}
                  isRedeeming={isRedeeming}
                />
              </>
            ) : (
              <PositionView
                key={`position-resolved-${refreshKey}`}
                fpmmAddress={market.fpmm}
                conditionId={market.conditionId}
                resolved={isResolved}
                yesWon={yesWon}
                onRedeem={handleRedeem}
                isRedeeming={isRedeeming}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
