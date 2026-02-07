'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, FPMM_ABI, CONDITIONAL_TOKENS_ABI } from '@/config/contracts';
import { Skeleton } from './Skeleton';
import { cn } from '@/lib/utils';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

interface PositionViewProps {
  fpmmAddress: string;
  conditionId?: string;
  resolved?: boolean;
  yesWon?: boolean | null;
  onRedeem?: () => void;
  isRedeeming?: boolean;
}

export function PositionView({
  fpmmAddress,
  conditionId,
  resolved = false,
  yesWon = null,
  onRedeem,
  isRedeeming = false,
}: PositionViewProps) {
  const { address, isConnected } = useAccount();

  const { data: yesPositionId, isLoading: isLoadingYesId } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'yesPositionId',
  });

  const { data: noPositionId, isLoading: isLoadingNoId } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'noPositionId',
  });

  const { data: yesBalance, isLoading: isLoadingYesBal } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'balanceOf',
    args: address && yesPositionId ? [address, yesPositionId] : undefined,
  });

  const { data: noBalance, isLoading: isLoadingNoBal } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'balanceOf',
    args: address && noPositionId ? [address, noPositionId] : undefined,
  });

  const { data: yesPrice } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getYesPrice',
  });

  const { data: noPrice } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getNoPrice',
  });

  const isLoadingPositions = isLoadingYesId || isLoadingNoId || isLoadingYesBal || isLoadingNoBal;

  const formattedYesBalance = yesBalance ? formatUnits(yesBalance as bigint, 6) : '0';
  const formattedNoBalance = noBalance ? formatUnits(noBalance as bigint, 6) : '0';

  const yesPriceNum = yesPrice ? Number(formatUnits(yesPrice as bigint, 18)) : 0.5;
  const noPriceNum = noPrice ? Number(formatUnits(noPrice as bigint, 18)) : 0.5;

  const yesValue = Number(formattedYesBalance) * yesPriceNum;
  const noValue = Number(formattedNoBalance) * noPriceNum;

  const hasPositions = Number(formattedYesBalance) > 0 || Number(formattedNoBalance) > 0;

  const hasWinningPosition = resolved && yesWon !== null && (
    (yesWon && Number(formattedYesBalance) > 0) || (!yesWon && Number(formattedNoBalance) > 0)
  );
  const redeemableAmount = resolved && yesWon !== null
    ? (yesWon ? Number(formattedYesBalance) : Number(formattedNoBalance))
    : 0;

  if (!isConnected) {
    return null;
  }

  if (isLoadingPositions) {
    return (
      <div className="card p-5">
        <Skeleton width={100} height={14} className="mb-3" />
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              <Skeleton width={8} height={8} rounded="full" />
              <div>
                <Skeleton width={80} height={16} className="mb-1" />
                <Skeleton width={60} height={12} />
              </div>
            </div>
            <div className="text-right">
              <Skeleton width={50} height={18} className="mb-1" />
              <Skeleton width={40} height={12} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPositions) {
    return null;
  }

  return (
    <div className="card p-5">
      <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display mb-3">
        {resolved ? 'Your Results' : 'Your Positions'}
      </h3>

      <div className="space-y-2">
        {Number(formattedYesBalance) > 0 && (
          <div className={cn(
            "flex items-center justify-between p-3 rounded-lg border",
            resolved
              ? yesWon
                ? "bg-green-500/10 border-green-500/25"
                : "bg-white/[0.02] border-white/5 opacity-60"
              : "bg-green-500/5 border-green-500/15"
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                resolved && !yesWon ? "bg-white/5" : "bg-green-500/15"
              )}>
                {resolved ? (
                  yesWon ? <Trophy className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-white/30" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                )}
              </div>
              <div>
                <span className={cn(
                  "font-semibold font-display text-sm",
                  resolved && !yesWon ? "text-white/30" : "text-green-400"
                )}>
                  YES {resolved && (yesWon ? '(Winner!)' : '(Lost)')}
                </span>
                <span className={cn(
                  "text-xs ml-2 font-mono",
                  resolved && !yesWon ? "text-white/20" : "text-green-400/60"
                )}>
                  {Number(formattedYesBalance).toFixed(2)} shares
                </span>
              </div>
            </div>
            <div className="text-right">
              {resolved ? (
                <div className={cn(
                  "font-semibold font-mono",
                  yesWon ? "text-green-400" : "text-white/30"
                )}>
                  ${yesWon ? Number(formattedYesBalance).toFixed(2) : '0.00'}
                </div>
              ) : (
                <>
                  <div className="font-semibold font-mono text-white">${yesValue.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Max ${Number(formattedYesBalance).toFixed(2)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {Number(formattedNoBalance) > 0 && (
          <div className={cn(
            "flex items-center justify-between p-3 rounded-lg border",
            resolved
              ? !yesWon
                ? "bg-red-500/10 border-red-500/25"
                : "bg-white/[0.02] border-white/5 opacity-60"
              : "bg-red-500/5 border-red-500/15"
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                resolved && yesWon ? "bg-white/5" : "bg-red-500/15"
              )}>
                {resolved ? (
                  !yesWon ? <Trophy className="w-3 h-3 text-red-400" /> : <TrendingDown className="w-3 h-3 text-white/30" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
              </div>
              <div>
                <span className={cn(
                  "font-semibold font-display text-sm",
                  resolved && yesWon ? "text-white/30" : "text-red-400"
                )}>
                  NO {resolved && (!yesWon ? '(Winner!)' : '(Lost)')}
                </span>
                <span className={cn(
                  "text-xs ml-2 font-mono",
                  resolved && yesWon ? "text-white/20" : "text-red-400/60"
                )}>
                  {Number(formattedNoBalance).toFixed(2)} shares
                </span>
              </div>
            </div>
            <div className="text-right">
              {resolved ? (
                <div className={cn(
                  "font-semibold font-mono",
                  !yesWon ? "text-red-400" : "text-white/30"
                )}>
                  ${!yesWon ? Number(formattedNoBalance).toFixed(2) : '0.00'}
                </div>
              ) : (
                <>
                  <div className="font-semibold font-mono text-white">${noValue.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Max ${Number(formattedNoBalance).toFixed(2)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {resolved && hasWinningPosition && onRedeem && (
        <button
          onClick={onRedeem}
          disabled={isRedeeming}
          className="w-full mt-4 py-3 bg-green-500 text-white font-bold font-display uppercase tracking-wide rounded-lg hover:bg-green-500/80 transition-colors disabled:opacity-50"
        >
          {isRedeeming ? 'Redeeming...' : `Redeem $${redeemableAmount.toFixed(2)}`}
        </button>
      )}
    </div>
  );
}
