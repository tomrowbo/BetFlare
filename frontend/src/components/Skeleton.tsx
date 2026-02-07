'use client';

import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animate?: boolean;
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
  animate = true,
}: SkeletonProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-gradient-to-r from-[--bg-secondary] via-[--bg-hover] to-[--bg-secondary] bg-[length:200%_100%] ${
        animate ? 'animate-shimmer' : ''
      } ${roundedClasses[rounded]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton components for common patterns
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 && lines > 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`card animate-pulse ${className}`}>
      {children}
    </div>
  );
}

// Market card skeleton
export function MarketCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start gap-4 mb-6">
        <Skeleton width={56} height={56} rounded="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton width={60} height={20} rounded="full" />
            <Skeleton width={50} height={20} rounded="full" />
          </div>
          <Skeleton width="80%" height={24} className="mb-2" />
          <Skeleton width="40%" height={14} />
        </div>
      </div>

      {/* Probability display */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <Skeleton width={50} height={14} className="mb-1" />
            <Skeleton width={80} height={40} />
          </div>
          <div className="text-right">
            <Skeleton width={60} height={14} className="mb-1" />
            <Skeleton width={70} height={24} />
          </div>
        </div>
        <Skeleton width="100%" height={8} rounded="full" />
      </div>

      {/* Chart placeholder */}
      <Skeleton width="100%" height={160} className="mb-6" rounded="lg" />

      {/* Buttons */}
      <div className="flex gap-3 mb-6">
        <Skeleton width="100%" height={48} rounded="lg" />
        <Skeleton width="100%" height={48} rounded="lg" />
      </div>

      {/* Stats row */}
      <div className="flex gap-4 pt-4 border-t border-[--border-color]">
        <Skeleton width={100} height={14} />
        <Skeleton width={80} height={14} />
        <Skeleton width={100} height={14} />
      </div>
    </div>
  );
}

// Featured market skeleton for home page
export function FeaturedMarketSkeleton() {
  return (
    <div className="card bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="flex items-start gap-4">
        <Skeleton width={48} height={48} rounded="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Skeleton width="70%" height={24} className="mb-2" />
              <Skeleton width="50%" height={14} />
            </div>
            <Skeleton width={60} height={24} rounded="full" />
          </div>
          <div className="flex items-end justify-between mt-4">
            <div className="flex gap-6">
              <div>
                <Skeleton width={30} height={12} className="mb-1" />
                <Skeleton width={50} height={32} />
              </div>
              <div>
                <Skeleton width={30} height={12} className="mb-1" />
                <Skeleton width={50} height={32} />
              </div>
              <div>
                <Skeleton width={45} height={12} className="mb-1" />
                <Skeleton width={60} height={24} />
              </div>
            </div>
            <Skeleton width={128} height={48} rounded="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Market list item skeleton
export function MarketListItemSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <Skeleton width={32} height={32} rounded="lg" />
        <div className="flex-1 min-w-0">
          <Skeleton width="60%" height={18} className="mb-2" />
          <Skeleton width="40%" height={14} />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <Skeleton width={30} height={12} className="mb-1" />
            <Skeleton width={40} height={18} />
          </div>
          <div className="text-center">
            <Skeleton width={30} height={12} className="mb-1" />
            <Skeleton width={40} height={18} />
          </div>
          <Skeleton width={60} height={24} rounded="full" />
        </div>
      </div>
    </div>
  );
}

// Position card skeleton for portfolio
export function PositionCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton width={32} height={32} rounded="lg" />
          <div>
            <Skeleton width={200} height={20} className="mb-2" />
            <Skeleton width={150} height={14} />
          </div>
        </div>
        <Skeleton width={80} height={28} rounded="full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-[--border-color]">
          <Skeleton width={60} height={18} className="mb-2" />
          <Skeleton width={80} height={32} className="mb-1" />
          <Skeleton width={50} height={14} />
          <div className="mt-2 pt-2 border-t border-[--border-color]">
            <Skeleton width="100%" height={14} className="mb-1" />
            <Skeleton width="100%" height={14} />
          </div>
        </div>
        <div className="p-4 rounded-lg border border-[--border-color]">
          <Skeleton width={60} height={18} className="mb-2" />
          <Skeleton width={80} height={32} className="mb-1" />
          <Skeleton width={50} height={14} />
          <div className="mt-2 pt-2 border-t border-[--border-color]">
            <Skeleton width="100%" height={14} className="mb-1" />
            <Skeleton width="100%" height={14} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="card text-center">
      <Skeleton width={80} height={14} className="mx-auto mb-2" />
      <Skeleton width={100} height={28} className="mx-auto" />
    </div>
  );
}

// Bet slip skeleton
export function BetSlipSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={80} height={20} />
        <Skeleton width={40} height={24} rounded="full" />
      </div>
      <div className="mb-4">
        <Skeleton width={100} height={14} className="mb-2" />
        <Skeleton width="100%" height={48} rounded="lg" />
        <div className="flex justify-between mt-2">
          <Skeleton width={100} height={12} />
          <Skeleton width={30} height={12} />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="100%" height={36} rounded="lg" />
        ))}
      </div>
      <Skeleton width="100%" height={48} rounded="lg" />
    </div>
  );
}

// Liquidity page skeleton
export function LiquidityPageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="text-center mb-8">
        <Skeleton width={200} height={36} className="mx-auto mb-2" />
        <Skeleton width={350} height={18} className="mx-auto" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart card */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Skeleton width={100} height={14} className="mb-2" />
            <Skeleton width={120} height={36} />
          </div>
          <div className="text-right">
            <Skeleton width={80} height={14} className="mb-2" />
            <Skeleton width={80} height={24} />
          </div>
        </div>
        <Skeleton width="100%" height={128} rounded="lg" />
      </div>

      {/* Deposit/Withdraw card */}
      <div className="card">
        <div className="flex gap-2 mb-6">
          <Skeleton width="100%" height={48} rounded="lg" />
          <Skeleton width="100%" height={48} rounded="lg" />
        </div>
        <Skeleton width={100} height={14} className="mb-2" />
        <Skeleton width="100%" height={56} rounded="lg" className="mb-2" />
        <Skeleton width={150} height={14} className="mb-6" />
        <Skeleton width="100%" height={56} rounded="lg" />
      </div>
    </div>
  );
}
