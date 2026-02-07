'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, FPMM_ABI, CONDITIONAL_TOKENS_ABI } from '@/config/contracts';
import { Skeleton } from './Skeleton';

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

  // Calculate redeemable amount for resolved markets
  const hasWinningPosition = resolved && yesWon !== null && (
    (yesWon && Number(formattedYesBalance) > 0) || (!yesWon && Number(formattedNoBalance) > 0)
  );
  const redeemableAmount = resolved && yesWon !== null
    ? (yesWon ? Number(formattedYesBalance) : Number(formattedNoBalance))
    : 0;

  if (!isConnected) {
    return null;
  }

  // Show skeleton while loading
  if (isLoadingPositions) {
    return (
      <div className="card">
        <Skeleton width={100} height={14} className="mb-3" />
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[--border-color]">
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
    <div className="card">
      <h3 className="text-sm font-semibold text-[--text-secondary] mb-3">
        {resolved ? 'Your Results' : 'Your Positions'}
      </h3>

      <div className="space-y-2">
        {Number(formattedYesBalance) > 0 && (
          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            resolved
              ? yesWon
                ? 'bg-[--accent-green]/20 border-[--accent-green]/40'
                : 'bg-gray-500/10 border-gray-500/20 opacity-60'
              : 'bg-green-50 border-green-100'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                resolved && !yesWon ? 'bg-gray-400' : 'bg-green-500'
              }`}></span>
              <div>
                <span className={`font-semibold ${
                  resolved && !yesWon ? 'text-gray-400' : 'text-green-800'
                }`}>
                  YES {resolved && (yesWon ? '(Winner!)' : '(Lost)')}
                </span>
                <span className={`text-sm ml-2 ${
                  resolved && !yesWon ? 'text-gray-400' : 'text-green-600'
                }`}>
                  {Number(formattedYesBalance).toFixed(2)} shares
                </span>
              </div>
            </div>
            <div className="text-right">
              {resolved ? (
                <div className={`font-semibold ${yesWon ? 'text-[--accent-green]' : 'text-gray-400'}`}>
                  ${yesWon ? Number(formattedYesBalance).toFixed(2) : '0.00'}
                </div>
              ) : (
                <>
                  <div className="font-semibold">${yesValue.toFixed(2)}</div>
                  <div className="text-xs text-[--text-muted]">
                    Max ${Number(formattedYesBalance).toFixed(2)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {Number(formattedNoBalance) > 0 && (
          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            resolved
              ? !yesWon
                ? 'bg-[--accent-red]/20 border-[--accent-red]/40'
                : 'bg-gray-500/10 border-gray-500/20 opacity-60'
              : 'bg-red-50 border-red-100'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                resolved && yesWon ? 'bg-gray-400' : 'bg-red-500'
              }`}></span>
              <div>
                <span className={`font-semibold ${
                  resolved && yesWon ? 'text-gray-400' : 'text-red-800'
                }`}>
                  NO {resolved && (!yesWon ? '(Winner!)' : '(Lost)')}
                </span>
                <span className={`text-sm ml-2 ${
                  resolved && yesWon ? 'text-gray-400' : 'text-red-600'
                }`}>
                  {Number(formattedNoBalance).toFixed(2)} shares
                </span>
              </div>
            </div>
            <div className="text-right">
              {resolved ? (
                <div className={`font-semibold ${!yesWon ? 'text-[--accent-red]' : 'text-gray-400'}`}>
                  ${!yesWon ? Number(formattedNoBalance).toFixed(2) : '0.00'}
                </div>
              ) : (
                <>
                  <div className="font-semibold">${noValue.toFixed(2)}</div>
                  <div className="text-xs text-[--text-muted]">
                    Max ${Number(formattedNoBalance).toFixed(2)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Redeem Button for resolved markets */}
      {resolved && hasWinningPosition && onRedeem && (
        <button
          onClick={onRedeem}
          disabled={isRedeeming}
          className="w-full mt-4 py-3 bg-[--accent-green] text-white font-bold rounded-xl hover:bg-[--accent-green]/80 transition disabled:opacity-50"
        >
          {isRedeeming ? 'Redeeming...' : `Redeem $${redeemableAmount.toFixed(2)}`}
        </button>
      )}
    </div>
  );
}
