'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Header } from '@/components/Header';
import { CONTRACTS, FPMM_ABI, CONDITIONAL_TOKENS_ABI } from '@/config/contracts';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();

  // Get position IDs from FPMM
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

  // Get user's token balances
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

  // Get current prices
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

  // Check if market is resolved
  const { data: resolved } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: 'resolved',
  });

  const formattedYesBalance = yesBalance ? Number(formatUnits(yesBalance as bigint, 6)) : 0;
  const formattedNoBalance = noBalance ? Number(formatUnits(noBalance as bigint, 6)) : 0;
  const formattedYesPrice = yesPrice ? Number(formatUnits(yesPrice as bigint, 18)) : 0.5;
  const formattedNoPrice = noPrice ? Number(formatUnits(noPrice as bigint, 18)) : 0.5;

  const yesValue = formattedYesBalance * formattedYesPrice;
  const noValue = formattedNoBalance * formattedNoPrice;
  const totalValue = yesValue + noValue;

  const hasPositions = formattedYesBalance > 0 || formattedNoBalance > 0;

  return (
    <main className="min-h-screen">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
        <p className="text-[--text-secondary] mb-8">Your prediction market positions</p>

        {!isConnected ? (
          <div className="card text-center py-12">
            <p className="text-[--text-secondary] mb-4">Connect your wallet to view your positions</p>
          </div>
        ) : !hasPositions ? (
          <div className="card text-center py-12">
            <p className="text-[--text-secondary] mb-4">You don&apos;t have any positions yet</p>
            <a href="/" className="text-[--accent-blue] hover:underline">Browse markets to place your first bet</a>
          </div>
        ) : (
          <>
            {/* Portfolio Summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="card text-center">
                <div className="text-sm text-[--text-muted]">Total Value</div>
                <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
              </div>
              <div className="card text-center">
                <div className="text-sm text-[--text-muted]">YES Positions</div>
                <div className="text-2xl font-bold text-[--accent-green]">${yesValue.toFixed(2)}</div>
              </div>
              <div className="card text-center">
                <div className="text-sm text-[--text-muted]">NO Positions</div>
                <div className="text-2xl font-bold text-[--accent-red]">${noValue.toFixed(2)}</div>
              </div>
            </div>

            {/* Positions List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Active Positions</h2>

              {/* XRP Market Position */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-lg font-bold">XRP above $3.00?</div>
                    <div className="text-sm text-[--text-secondary]">Resolves Feb 7, 2026 at 7:00 PM UTC</div>
                  </div>
                  {resolved ? (
                    <span className="px-2 py-1 bg-[--text-muted] text-white text-xs rounded">Resolved</span>
                  ) : (
                    <span className="px-2 py-1 bg-[--accent-green] text-white text-xs rounded">Active</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {formattedYesBalance > 0 && (
                    <div className="p-4 bg-[--accent-green]/10 rounded-lg border border-[--accent-green]/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[--accent-green]">YES</span>
                        <span className="text-sm text-[--text-muted]">@ {(formattedYesPrice * 100).toFixed(0)}¢</span>
                      </div>
                      <div className="text-2xl font-bold">{formattedYesBalance.toFixed(2)}</div>
                      <div className="text-sm text-[--text-secondary]">shares</div>
                      <div className="mt-2 pt-2 border-t border-[--border-color]">
                        <div className="flex justify-between text-sm">
                          <span className="text-[--text-muted]">Value</span>
                          <span className="font-medium">${yesValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[--text-muted]">If YES wins</span>
                          <span className="font-medium text-[--accent-green]">${formattedYesBalance.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {formattedNoBalance > 0 && (
                    <div className="p-4 bg-[--accent-red]/10 rounded-lg border border-[--accent-red]/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[--accent-red]">NO</span>
                        <span className="text-sm text-[--text-muted]">@ {(formattedNoPrice * 100).toFixed(0)}¢</span>
                      </div>
                      <div className="text-2xl font-bold">{formattedNoBalance.toFixed(2)}</div>
                      <div className="text-sm text-[--text-secondary]">shares</div>
                      <div className="mt-2 pt-2 border-t border-[--border-color]">
                        <div className="flex justify-between text-sm">
                          <span className="text-[--text-muted]">Value</span>
                          <span className="font-medium">${noValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[--text-muted]">If NO wins</span>
                          <span className="font-medium text-[--accent-red]">${formattedNoBalance.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
