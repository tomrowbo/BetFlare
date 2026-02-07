'use client';

import Image from 'next/image';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { FPMM_ABI } from '@/config/contracts';
import { PriceChart } from './PriceChart';
import { MarketCardSkeleton } from './Skeleton';
import { StatusBadge } from './ui/StatusBadge';
import { cn } from '@/lib/utils';
import { Tag, Droplets, Shield, Clock } from 'lucide-react';

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

  if (isLoading) {
    return <MarketCardSkeleton />;
  }

  const yesPrice = yesPriceRaw ? Number(formatUnits(yesPriceRaw as bigint, 18)) * 100 : 50;
  const noPrice = noPriceRaw ? Number(formatUnits(noPriceRaw as bigint, 18)) * 100 : 50;
  const totalLiquidity = yesReserve && noReserve
    ? Number(formatUnits((yesReserve as bigint) + (noReserve as bigint), 6))
    : 0;

  const yesPercent = yesPrice.toFixed(0);
  const noPercent = noPrice.toFixed(0);

  const statusBadge = resolved ? (
    <StatusBadge variant={yesWon ? 'won' : 'lost'} />
  ) : isPastResolution ? (
    <StatusBadge variant="pending" />
  ) : (
    <StatusBadge variant="live" />
  );

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-black/50 ring-1 ring-white/10">
          <Image src="/xrp-logo.webp" alt="XRP" width={56} height={56} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-primary/20 bg-primary/10 text-primary text-[10px] uppercase tracking-[0.15em] font-bold font-display">
              <Tag className="w-3 h-3" />
              Crypto
            </span>
            {statusBadge}
          </div>
          <h2 className="text-xl font-bold font-display uppercase tracking-tight text-white mb-1">
            {title}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Resolves {resolutionDate}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display block mb-1">
              Chance
            </span>
            <span className="text-4xl font-bold font-display text-green-400 tracking-tight">
              {yesPercent}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display block mb-1">
              Liquidity
            </span>
            <span className="text-lg font-semibold font-mono text-white">
              ${totalLiquidity.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        <PriceChart yesPrice={yesPrice / 100} fpmmAddress={fpmmAddress} />
      </div>

      {resolved ? (
        <div className="flex gap-3 mb-6">
          <div className={cn(
            "flex-1 py-3 rounded-lg text-center border",
            yesWon
              ? "bg-green-500/15 border-green-500/30"
              : "bg-white/[0.02] border-white/5 opacity-50"
          )}>
            <div className={cn("font-semibold font-display", yesWon ? "text-green-400" : "text-white/40")}>
              {yesWon ? 'YES Won' : 'YES Lost'}
            </div>
            <div className="text-sm text-muted-foreground font-mono">Paid $1.00</div>
          </div>
          <div className={cn(
            "flex-1 py-3 rounded-lg text-center border",
            !yesWon
              ? "bg-red-500/15 border-red-500/30"
              : "bg-white/[0.02] border-white/5 opacity-50"
          )}>
            <div className={cn("font-semibold font-display", !yesWon ? "text-red-400" : "text-white/40")}>
              {!yesWon ? 'NO Won' : 'NO Lost'}
            </div>
            <div className="text-sm text-muted-foreground font-mono">Paid $1.00</div>
          </div>
        </div>
      ) : isPastResolution ? (
        <div className="flex gap-3 mb-6">
          <div className="flex-1 py-3 rounded-lg text-center bg-primary/10 border border-primary/30">
            <div className="font-semibold font-display text-primary">Trading Closed</div>
            <div className="text-sm text-muted-foreground">Awaiting oracle resolution</div>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => onSelectSide('yes')}
            className={cn(
              "btn btn-yes flex-1 py-3",
              selectedSide === 'yes' && "active"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-semibold font-display">Buy Yes</span>
              <span className="opacity-75 font-mono">{yesPercent}%</span>
            </div>
          </button>
          <button
            onClick={() => onSelectSide('no')}
            className={cn(
              "btn btn-no flex-1 py-3",
              selectedSide === 'no' && "active"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-semibold font-display">Buy No</span>
              <span className="opacity-75 font-mono">{noPercent}%</span>
            </div>
          </button>
        </div>
      )}

      <div className="flex items-center gap-5 text-sm border-t border-white/5 pt-4">
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground font-display">Liquidity</span>
          <span className="font-medium font-mono text-white">${totalLiquidity.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground font-display">Fee</span>
          <span className="font-medium font-mono text-white">0.2%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground font-display">Oracle</span>
          <span className="font-medium text-white">Flare FTSO</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-white/[0.02] rounded-lg border border-white/5 text-sm">
        <span className="font-semibold font-display text-white">Resolution: </span>
        <span className="text-muted-foreground">
          Resolves YES if XRP/USD is above $3.00 at resolution time, verified by Flare FTSO oracle.
        </span>
      </div>
    </div>
  );
}
