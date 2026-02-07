'use client';

import { useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { MarketCard } from '@/components/MarketCard';
import { BetSlip } from '@/components/BetSlip';
import { PositionView } from '@/components/PositionView';
import { getMarketBySlug, FPMM_ABI, CONTRACTS, CONDITIONAL_TOKENS_ABI, FTSO_RESOLVER_ABI } from '@/config/contracts';
import { formatUnits } from 'viem';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Zap, Sparkles } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useSmartTransaction } from '@/hooks/useSmartTransaction';

export default function MarketPage() {
  const { address, isConnected, isSmartAccount } = useWallet();
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const queryClient = useQueryClient();
  const params = useParams();
  const slug = params.slug as string;
  const { execute, isLoading: isProcessing } = useSmartTransaction();

  const market = getMarketBySlug(slug);

  const handleTradeSuccess = useCallback(() => {
    queryClient.invalidateQueries();
    setRefreshKey(prev => prev + 1);
  }, [queryClient]);

  const { data: resolved } = useReadContract({
    address: market?.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'resolved',
  });

  const { data: yesPayoutNumerator } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'getPayoutNumerator',
    args: market ? [market.conditionId as `0x${string}`, BigInt(0)] : undefined,
  });

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

  const { data: yesBalance } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'balanceOf',
    args: address && yesPositionId ? [address as `0x${string}`, yesPositionId as bigint] : undefined,
  });

  const { data: noBalance } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'balanceOf',
    args: address && noPositionId ? [address as `0x${string}`, noPositionId as bigint] : undefined,
  });


  if (!market) {
    return (
      <main className="min-h-screen">
        <Header />
        <PageContainer maxWidth="xl">
          <div className="card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-display uppercase tracking-tight text-white mb-4">Market Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The market &quot;{slug}&quot; does not exist.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-display font-medium uppercase text-sm tracking-wide"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to markets
            </Link>
          </div>
        </PageContainer>
      </main>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= market.resolutionTime;
  const isResolved = resolved === true;
  const yesWon = isResolved && yesPayoutNumerator !== undefined ? yesPayoutNumerator === BigInt(1) : null;

  const userYesBalance = yesBalance ? Number(formatUnits(yesBalance as bigint, 6)) : 0;
  const userNoBalance = noBalance ? Number(formatUnits(noBalance as bigint, 6)) : 0;
  const hasWinningPosition = isResolved && yesWon !== null && (
    (yesWon && userYesBalance > 0) || (!yesWon && userNoBalance > 0)
  );
  const redeemableAmount = isResolved && yesWon !== null
    ? (yesWon ? userYesBalance : userNoBalance)
    : 0;

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await execute([{
        address: market.resolver as `0x${string}`,
        abi: FTSO_RESOLVER_ABI,
        functionName: 'resolve',
        args: [market.marketId as `0x${string}`],
      }]);
      queryClient.invalidateQueries();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Resolve failed:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleRedeem = async () => {
    setIsRedeeming(true);
    try {
      await execute([{
        address: CONTRACTS.conditionalTokens as `0x${string}`,
        abi: CONDITIONAL_TOKENS_ABI,
        functionName: 'redeemPositions',
        args: [market.conditionId as `0x${string}`],
      }]);
      queryClient.invalidateQueries();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Redeem failed:', error);
    } finally {
      setIsRedeeming(false);
    }
  };

  const resolutionDate = new Date(market.resolutionTime * 1000).toLocaleString();

  return (
    <main className="min-h-screen">
      <Header />

      <PageContainer maxWidth="xl" className="py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 font-display font-medium uppercase tracking-wide"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to markets
        </Link>

        {isResolved && (
          <div className={`mt-4 p-5 rounded-lg border ${
            yesWon
              ? 'bg-green-500/5 border-green-500/20'
              : 'bg-red-500/5 border-red-500/20'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  yesWon ? 'bg-green-500/15' : 'bg-red-500/15'
                }`}>
                  {yesWon
                    ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />
                  }
                </div>
                <div>
                  <div className={`text-xl font-bold font-display uppercase tracking-tight ${
                    yesWon ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {yesWon ? 'YES' : 'NO'} Won
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Market resolved · {market.title}
                  </div>
                </div>
              </div>
              {isConnected && hasWinningPosition && (
                <button
                  onClick={handleRedeem}
                  disabled={isRedeeming}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-bold font-display uppercase tracking-wide rounded-lg hover:bg-green-500/80 transition-colors disabled:opacity-50"
                >
                  {isSmartAccount && <Sparkles className="w-4 h-4" />}
                  {isRedeeming
                    ? (isSmartAccount ? 'Redeeming (Gasless)...' : 'Redeeming...')
                    : (isSmartAccount ? `Redeem $${redeemableAmount.toFixed(2)} (Gasless)` : `Redeem $${redeemableAmount.toFixed(2)}`)}
                </button>
              )}
            </div>
          </div>
        )}

        {isPastResolution && !isResolved && (
          <div className="mt-4 p-5 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-bold font-display uppercase tracking-tight text-primary">
                    Awaiting Resolution
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Resolution time passed · Click to resolve using FTSO oracle
                  </div>
                </div>
              </div>
              <button
                onClick={handleResolve}
                disabled={isResolving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold font-display uppercase tracking-wide rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {isSmartAccount ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                {isResolving
                  ? (isSmartAccount ? 'Resolving (Gasless)...' : 'Resolving...')
                  : (isSmartAccount ? 'Resolve Market (Gasless)' : 'Resolve Market')}
              </button>
            </div>
          </div>
        )}

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
      </PageContainer>
    </main>
  );
}
