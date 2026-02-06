'use client';

import Image from 'next/image';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, FPMM_ABI } from '@/config/contracts';
import { PriceChart } from './PriceChart';

interface MarketCardProps {
  selectedSide: 'yes' | 'no';
  onSelectSide: (side: 'yes' | 'no') => void;
}

export function MarketCard({ selectedSide, onSelectSide }: MarketCardProps) {
  const { data: yesPriceRaw } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getYesPrice',
  });

  const { data: noPriceRaw } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'getNoPrice',
  });

  const { data: yesReserve } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'yesReserve',
  });

  const { data: noReserve } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'noReserve',
  });

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
            <span className="tag tag-live">
              <span className="live-dot"></span>
              LIVE
            </span>
          </div>
          <h2 className="text-xl font-bold text-[--text-primary] mb-1">
            Will XRP be above $3.00?
          </h2>
          <p className="text-sm text-[--text-secondary]">
            Resolves Feb 7, 2026 at 19:00 UTC
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
        <PriceChart yesPrice={yesPrice / 100} />
      </div>

      {/* Yes/No Buttons - Polymarket style */}
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
