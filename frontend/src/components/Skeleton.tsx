'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
      className={cn(
        'bg-gradient-to-r from-white/[0.03] via-white/[0.07] to-white/[0.03] bg-[length:200%_100%]',
        animate && 'animate-shimmer',
        roundedClasses[rounded],
        className
      )}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
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
    <div className={cn(
      'relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-5',
      className
    )}>
      {children}
    </div>
  );
}

export function MarketCardSkeleton() {
  return (
    <SkeletonCard>
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

      <Skeleton width="100%" height={160} className="mb-6" rounded="lg" />

      <div className="flex gap-3 mb-6">
        <Skeleton width="100%" height={48} rounded="lg" />
        <Skeleton width="100%" height={48} rounded="lg" />
      </div>

      <div className="flex gap-4 pt-4 border-t border-white/5">
        <Skeleton width={100} height={14} />
        <Skeleton width={80} height={14} />
        <Skeleton width={100} height={14} />
      </div>
    </SkeletonCard>
  );
}

export function FeaturedMarketSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton width={50} height={12} />
              <Skeleton width={45} height={18} rounded="sm" />
            </div>
            <Skeleton width="70%" height={28} className="mb-2" />
            <Skeleton width="45%" height={14} className="mb-5" />

            <div className="mb-5">
              <div className="flex justify-between mb-2">
                <Skeleton width={80} height={10} />
                <Skeleton width={60} height={12} />
              </div>
              <Skeleton width="100%" height={2} rounded="full" />
            </div>

            <div className="flex items-end justify-between">
              <div className="flex gap-6">
                <div>
                  <Skeleton width={24} height={10} className="mb-1" />
                  <Skeleton width={40} height={22} />
                </div>
                <div>
                  <Skeleton width={20} height={10} className="mb-1" />
                  <Skeleton width={40} height={22} />
                </div>
                <div>
                  <Skeleton width={30} height={10} className="mb-1" />
                  <Skeleton width={55} height={22} />
                </div>
              </div>
              <Skeleton width={128} height={48} rounded="lg" />
            </div>
          </div>
        </div>
      </div>
      <div className="h-[2px] w-full bg-white/[0.03]" />
    </div>
  );
}

export function MarketListItemSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-4">
      <div className="flex items-center gap-4">
        <Skeleton width={32} height={32} rounded="lg" />
        <div className="flex-1 min-w-0">
          <Skeleton width="60%" height={18} className="mb-2" />
          <Skeleton width="40%" height={14} />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <Skeleton width={30} height={10} className="mb-1" />
            <Skeleton width={40} height={18} />
          </div>
          <div className="text-center">
            <Skeleton width={30} height={10} className="mb-1" />
            <Skeleton width={40} height={18} />
          </div>
          <Skeleton width={50} height={18} rounded="sm" />
        </div>
      </div>
    </div>
  );
}

export function PositionCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton width={50} height={12} />
            <Skeleton width={55} height={18} rounded="sm" />
          </div>
          <Skeleton width={220} height={22} className="mb-1.5" />
          <Skeleton width={160} height={14} />
        </div>
        <Skeleton width={100} height={36} rounded="lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton width={24} height={24} rounded="full" />
            <Skeleton width={50} height={16} />
          </div>
          <Skeleton width={80} height={28} className="mb-0.5" />
          <Skeleton width={40} height={10} className="mb-3" />
          <div className="pt-3 border-t border-white/5 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton width={35} height={10} />
              <Skeleton width={50} height={14} />
            </div>
            <div className="flex justify-between">
              <Skeleton width={55} height={10} />
              <Skeleton width={50} height={14} />
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton width={24} height={24} rounded="full" />
            <Skeleton width={40} height={16} />
          </div>
          <Skeleton width={80} height={28} className="mb-0.5" />
          <Skeleton width={40} height={10} className="mb-3" />
          <div className="pt-3 border-t border-white/5 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton width={35} height={10} />
              <Skeleton width={50} height={14} />
            </div>
            <div className="flex justify-between">
              <Skeleton width={55} height={10} />
              <Skeleton width={50} height={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <Skeleton width={14} height={14} rounded="full" />
        <Skeleton width={70} height={10} />
      </div>
      <Skeleton width={90} height={26} className="mx-auto" />
    </div>
  );
}

export function BetSlipSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={80} height={20} />
        <Skeleton width={40} height={24} rounded="sm" />
      </div>
      <div className="mb-4">
        <Skeleton width={100} height={10} className="mb-2" />
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
    </SkeletonCard>
  );
}

export function LiquidityPageSkeleton() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <Skeleton width={80} height={24} className="mx-auto mb-4" rounded="sm" />
          <Skeleton width={300} height={40} className="mx-auto mb-3" />
          <Skeleton width={360} height={16} className="mx-auto" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>

        <div className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-5 mb-6">
          <div className="flex justify-between items-start mb-5">
            <div>
              <Skeleton width={80} height={10} className="mb-1" />
              <Skeleton width={120} height={36} />
            </div>
            <div className="text-right">
              <Skeleton width={70} height={10} className="mb-1" />
              <Skeleton width={80} height={24} />
            </div>
          </div>
          <Skeleton width="100%" height={128} rounded="lg" />
        </div>

        <div className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-5">
          <div className="flex gap-2 mb-6">
            <Skeleton width="100%" height={48} rounded="lg" />
            <Skeleton width="100%" height={48} rounded="lg" />
          </div>
          <Skeleton width={100} height={10} className="mb-2" />
          <Skeleton width="100%" height={52} rounded="lg" className="mb-2" />
          <Skeleton width={150} height={12} className="mb-6" />
          <Skeleton width="100%" height={52} rounded="lg" />
        </div>
      </div>
    </div>
  );
}
