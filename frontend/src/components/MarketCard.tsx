'use client';

import Image from 'next/image';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { FPMM_ABI } from '@/config/contracts';
import { PriceChart } from './PriceChart';
import { MarketCardSkeleton } from './Skeleton';

interface MarketCardProps {
  selectedSide: 'yes' | 'no';
  onSelectSide: (side: 'yes' | 'no') => void;
  fpmmAddress: string;
  title: string;
  resolutionDate: string;
  resolved?: boolean;
  yesWon?: boolean | null;
  isPastResolution?: boolean;
}

export function MarketCard({
  selectedSide,
  onSelectSide,
  fpmmAddress,
  title,
  resolutionDate,
  resolved = false,
  yesWon = null,
  isPastResolution = false,
}: MarketCardProps) {
  const { data: yesPriceRaw, isLoading: isLoadingYes } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getYesPrice',
  });

  const { data: noPriceRaw, isLoading: isLoadingNo } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getNoPrice',
  });

  const { data: yesReserve, isLoading: isLoadingYesReserve } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'yesReserve',
  });

  const { data: noReserve, isLoading: isLoadingNoReserve } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'noReserve',
  });

  const isLoading = isLoadingYes || isLoadingNo || isLoadingYesReserve || isLoadingNoReserve;

  // Show skeleton while loading
  if (isLoading) {
    return <MarketCardSkeleton />;
  }

  // Real data from contract
  const yesPrice = yesPriceRaw ? Number(formatUnits(yesPriceRaw as bigint, 18)) * 100 : 50;
  const noPrice = noPriceRaw ? Number(formatUnits(noPriceRaw as bigint, 18)) * 100 : 50;
  const totalLiquidity = yesReserve && noReserve
    ? Number(formatUnits((yesReserve as bigint) + (noReserve as bigint), 6))
    : 0;

  const yesPercent = yesPrice.toFixed(0);
  const noPercent = noPrice.toFixed(0);

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-black">
          <Image src="/xrp-logo.webp" alt="XRP" width={56} height={56} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="tag tag-crypto">Crypto</span>
            {resolved ? (
              <span className={`tag ${yesWon ? 'bg-[--accent-green]/20 text-[--accent-green]' : 'bg-[--accent-red]/20 text-[--accent-red]'}`}>
                {yesWon ? 'YES WON' : 'NO WON'}
              </span>
            ) : isPastResolution ? (
              <span className="tag bg-[--accent-orange]/20 text-[--accent-orange]">
                AWAITING
              </span>
            ) : (
              <span className="tag tag-live">
                <span className="live-dot"></span>
                LIVE
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-[--text-primary] mb-1">
            {title}
          </h2>
          <p className="text-sm text-[--text-secondary]">
            Resolves {resolutionDate}
          </p>
        </div>
      </div>

      {/* Main Probability Display */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-sm text-[--text-muted] mb-1">Chance</div>
            <div className="text-4xl font-bold text-[--accent-green]">{yesPercent}%</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-[--text-muted] mb-1">Liquidity</div>
            <div className="text-lg font-semibold">${totalLiquidity.toFixed(2)}</div>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="prob-bar">
          <div className="prob-bar-fill" style={{ width: `${yesPercent}%` }} />
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <PriceChart yesPrice={yesPrice / 100} fpmmAddress={fpmmAddress} />
      </div>

      {/* Yes/No Buttons - Polymarket style */}
      {resolved ? (
        <div className="flex gap-3 mb-6">
          <div className={`flex-1 py-3 rounded-lg text-center ${
            yesWon
              ? 'bg-[--accent-green]/20 border-2 border-[--accent-green]'
              : 'bg-gray-500/10 border border-gray-500/20 opacity-50'
          }`}>
            <div className="font-semibold">{yesWon ? 'YES Won' : 'YES Lost'}</div>
            <div className="text-sm text-[--text-muted]">Paid $1.00</div>
          </div>
          <div className={`flex-1 py-3 rounded-lg text-center ${
            !yesWon
              ? 'bg-[--accent-red]/20 border-2 border-[--accent-red]'
              : 'bg-gray-500/10 border border-gray-500/20 opacity-50'
          }`}>
            <div className="font-semibold">{!yesWon ? 'NO Won' : 'NO Lost'}</div>
            <div className="text-sm text-[--text-muted]">Paid $1.00</div>
          </div>
        </div>
      ) : isPastResolution ? (
        <div className="flex gap-3 mb-6">
          <div className="flex-1 py-3 rounded-lg text-center bg-[--accent-orange]/10 border border-[--accent-orange]/30">
            <div className="font-semibold text-[--accent-orange]">Trading Closed</div>
            <div className="text-sm text-[--text-muted]">Awaiting oracle resolution</div>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => onSelectSide('yes')}
            className={`btn btn-yes flex-1 py-3 ${selectedSide === 'yes' ? 'active' : ''}`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-semibold">Buy Yes</span>
              <span className="opacity-75">{yesPercent}%</span>
            </div>
          </button>
          <button
            onClick={() => onSelectSide('no')}
            className={`btn btn-no flex-1 py-3 ${selectedSide === 'no' ? 'active' : ''}`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-semibold">Buy No</span>
              <span className="opacity-75">{noPercent}%</span>
            </div>
          </button>
        </div>
      )}

      {/* Stats Row - Only real data */}
      <div className="flex items-center gap-4 text-sm border-t border-[--border-color] pt-4">
        <div>
          <span className="text-[--text-muted]">Liquidity: </span>
          <span className="font-medium">${totalLiquidity.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[--text-muted]">Fee: </span>
          <span className="font-medium">0.2%</span>
        </div>
        <div>
          <span className="text-[--text-muted]">Oracle: </span>
          <span className="font-medium">Flare FTSO</span>
        </div>
      </div>

      {/* Resolution Info */}
      <div className="mt-4 p-3 bg-[--bg-secondary] rounded-lg text-sm">
        <span className="font-semibold text-[--text-primary]">Resolution: </span>
        <span className="text-[--text-secondary]">
          Resolves YES if XRP/USD is above $3.00 at resolution time, verified by Flare FTSO oracle.
        </span>
      </div>
    </div>
  );
}
