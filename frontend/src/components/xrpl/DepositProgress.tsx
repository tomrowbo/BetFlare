'use client';

import { CheckCircle2, Loader2, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DepositStep =
  | 'idle'
  | 'building'
  | 'signing_collateral'
  | 'waiting_collateral'
  | 'signing_mint'
  | 'waiting_mint'
  | 'registering_swap'
  | 'signing_swap'
  | 'waiting_swap'
  | 'complete'
  | 'error';

interface DepositProgressProps {
  currentStep: DepositStep;
  txHash?: string;
  txHashes?: {
    collateral?: string;
    mint?: string;
    swap?: string;
  };
  error?: string;
  shares?: string;
}

// Step mapping - 3 phases: Reserve, Mint, Swap+Deposit
function getPhase(step: DepositStep): { phase: number; total: number; label: string; isWaiting: boolean } {
  switch (step) {
    case 'signing_collateral':
      return { phase: 1, total: 3, label: 'Sign in wallet', isWaiting: false };
    case 'waiting_collateral':
      return { phase: 1, total: 3, label: 'Reserving collateral...', isWaiting: true };
    case 'signing_mint':
      return { phase: 2, total: 3, label: 'Sign in wallet', isWaiting: false };
    case 'waiting_mint':
      return { phase: 2, total: 3, label: 'Minting FXRP...', isWaiting: true };
    case 'registering_swap':
      return { phase: 3, total: 3, label: 'Registering swap...', isWaiting: true };
    case 'signing_swap':
      return { phase: 3, total: 3, label: 'Sign in wallet', isWaiting: false };
    case 'waiting_swap':
      return { phase: 3, total: 3, label: 'Swapping to vault...', isWaiting: true };
    case 'complete':
      return { phase: 3, total: 3, label: 'Complete', isWaiting: false };
    default:
      return { phase: 0, total: 3, label: '', isWaiting: false };
  }
}

export function DepositProgress({
  currentStep,
  txHashes,
  error,
  shares,
}: DepositProgressProps) {
  if (currentStep === 'idle' || currentStep === 'building') {
    return null;
  }

  const isError = currentStep === 'error';
  const isComplete = currentStep === 'complete';
  const { phase, total, label, isWaiting } = getPhase(currentStep);

  // Calculate progress (0-100)
  const progress = isComplete ? 100 : isError ? 0 : Math.round((phase / total) * 100);

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4 space-y-4">
      {/* Progress bar */}
      {!isComplete && !isError && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm font-display font-semibold text-white">
                {label}
              </span>
            </div>
            <span className="text-xs font-mono text-white/40">
              Step {phase}/{total}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isWaiting && (
            <p className="text-[10px] text-white/30 text-center">
              This may take up to 3 minutes
            </p>
          )}
        </div>
      )}

      {/* Success state */}
      {isComplete && (
        <div className="text-center py-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-lg font-display font-bold text-green-400">
            Deposit Successful!
          </p>
          {shares && (
            <p className="text-sm text-white/60 mt-1">
              Received <span className="font-mono text-white">{shares}</span>
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {isError && error && (
        <div className="text-center py-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-3">
            <XCircle className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-lg font-display font-bold text-red-400">
            Transaction Failed
          </p>
          <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto">
            {error}
          </p>
        </div>
      )}

      {/* Transaction links - only show on complete */}
      {isComplete && txHashes && (txHashes.collateral || txHashes.mint) && (
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-center gap-4">
            {txHashes.collateral && (
              <a
                href={`https://testnet.xrpl.org/transactions/${txHashes.collateral}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Tx 1</span>
              </a>
            )}
            {txHashes.mint && (
              <a
                href={`https://testnet.xrpl.org/transactions/${txHashes.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Tx 2</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
