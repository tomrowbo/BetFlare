'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, FPMM_ABI, CONDITIONAL_TOKENS_ABI } from '@/config/contracts';

export function PositionView() {
  const { address, isConnected } = useAccount();

  const { data: yesPositionId } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'yesPositionId',
  });

  const { data: noPositionId } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'noPositionId',
  });

  const { data: yesBalance } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'balanceOf',
    args: address && yesPositionId ? [address, yesPositionId] : undefined,
  });

  const { data: noBalance } = useReadContract({
    address: CONTRACTS.conditionalTokens as `0x${string}`,
    abi: CONDITIONAL_TOKENS_ABI,
    functionName: 'balanceOf',
    args: address && noPositionId ? [address, noPositionId] : undefined,
  });

  const { data: yesPrice } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getYesPrice',
  });

  const { data: noPrice } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getNoPrice',
  });

  const formattedYesBalance = yesBalance ? formatUnits(yesBalance as bigint, 6) : '0';
  const formattedNoBalance = noBalance ? formatUnits(noBalance as bigint, 6) : '0';

  const yesPriceNum = yesPrice ? Number(formatUnits(yesPrice as bigint, 18)) : 0.5;
  const noPriceNum = noPrice ? Number(formatUnits(noPrice as bigint, 18)) : 0.5;

  const yesValue = Number(formattedYesBalance) * yesPriceNum;
  const noValue = Number(formattedNoBalance) * noPriceNum;

  const hasPositions = Number(formattedYesBalance) > 0 || Number(formattedNoBalance) > 0;

  if (!isConnected) {
    return null;
  }

  if (!hasPositions) {
    return null;
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-[--text-secondary] mb-3">Your Positions</h3>

      <div className="space-y-2">
        {Number(formattedYesBalance) > 0 && (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <div>
                <span className="font-semibold text-green-800">YES</span>
                <span className="text-sm text-green-600 ml-2">
                  {Number(formattedYesBalance).toFixed(2)} shares
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">${yesValue.toFixed(2)}</div>
              <div className="text-xs text-[--text-muted]">
                Max ${Number(formattedYesBalance).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {Number(formattedNoBalance) > 0 && (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <div>
                <span className="font-semibold text-red-800">NO</span>
                <span className="text-sm text-red-600 ml-2">
                  {Number(formattedNoBalance).toFixed(2)} shares
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">${noValue.toFixed(2)}</div>
              <div className="text-xs text-[--text-muted]">
                Max ${Number(formattedNoBalance).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
