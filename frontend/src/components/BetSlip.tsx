'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, FPMM_ABI, ERC20_ABI } from '@/config/contracts';
import { BetSlipSkeleton } from './Skeleton';
import { cn } from '@/lib/utils';
import { Lock, Clock, ExternalLink, Wallet } from 'lucide-react';

interface BetSlipProps {
  side: 'yes' | 'no';
  disabled: boolean;
  fpmmAddress: string;
  resolved?: boolean;
  isPastResolution?: boolean;
  onTradeSuccess?: () => void;
}

export function BetSlip({ side, disabled, fpmmAddress, resolved = false, isPastResolution = false, onTradeSuccess }: BetSlipProps) {
  const [amount, setAmount] = useState('');
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'idle' | 'approving' | 'buying'>('idle');
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const { data: usdtBalance, refetch: refetchBalance, isLoading: isLoadingBalance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: allowance, refetch: refetchAllowance, isLoading: isLoadingAllowance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, fpmmAddress as `0x${string}`] : undefined,
  });

  const isInitialLoading = address && (isLoadingBalance || isLoadingAllowance);

  const { data: expectedTokens } = useReadContract({
    address: fpmmAddress as `0x${string}`,
    abi: FPMM_ABI,
    functionName: side === 'yes' ? 'calcBuyYes' : 'calcBuyNo',
    args: amount && parseFloat(amount) > 0 ? [parseUnits(amount, 6)] : undefined,
  });

  const { writeContractAsync } = useWriteContract();

  const formattedBalance = usdtBalance ? formatUnits(usdtBalance as bigint, 6) : '0';
  const formattedExpected = expectedTokens ? formatUnits(expectedTokens as bigint, 6) : '0';
  const needsApproval = amount && parseFloat(amount) > 0 && allowance !== undefined &&
    (allowance as bigint) < parseUnits(amount, 6);

  const potentialProfit = Number(formattedExpected) - Number(amount);
  const avgPrice = Number(amount) > 0 ? (Number(amount) / Number(formattedExpected)).toFixed(2) : '0';

  const handleBuy = async () => {
    if (!amount || parseFloat(amount) <= 0 || !publicClient) return;

    setIsProcessing(true);

    try {
      if (needsApproval) {
        setProcessingStep('approving');
        const approveHash = await writeContractAsync({
          address: CONTRACTS.usdt as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [fpmmAddress as `0x${string}`, parseUnits('1000000', 6)],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      setProcessingStep('buying');
      const buyHash = await writeContractAsync({
        address: fpmmAddress as `0x${string}`,
        abi: FPMM_ABI,
        functionName: side === 'yes' ? 'buyYes' : 'buyNo',
        args: [parseUnits(amount, 6)],
      });

      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      setTxSuccess(buyHash);
      refetchBalance();
      setAmount('');
      if (onTradeSuccess) {
        onTradeSuccess();
      }
      setTimeout(() => setTxSuccess(null), 5000);
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStep('idle');
    }
  };

  const getButtonText = () => {
    if (processingStep === 'approving') return 'Approving...';
    if (processingStep === 'buying') return 'Buying...';
    if (needsApproval) return `Approve & Buy ${side.toUpperCase()}`;
    return `Buy ${side.toUpperCase()}`;
  };

  const quickAmounts = ['1', '5', '10', '25'];

  if (isInitialLoading) {
    return <BetSlipSkeleton />;
  }

  if (resolved) {
    return (
      <div className="card p-6">
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold font-display uppercase tracking-tight text-white mb-2">Market Resolved</h3>
          <p className="text-sm text-muted-foreground">
            Trading has ended. Check your positions below to redeem winnings.
          </p>
        </div>
      </div>
    );
  }

  if (isPastResolution) {
    return (
      <div className="card p-6">
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold font-display uppercase tracking-tight text-primary mb-2">Trading Closed</h3>
          <p className="text-sm text-muted-foreground">
            Resolution time has passed. Click &quot;Resolve Market&quot; above to trigger the FTSO oracle and settle the market.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold font-display uppercase tracking-tight text-white">
          Buy {side.toUpperCase()}
        </h3>
        <span className={cn(
          "px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-bold font-display border",
          side === 'yes'
            ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        )}>
          {side.toUpperCase()}
        </span>
      </div>

      {txSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
          <div className="text-green-400 font-semibold text-sm mb-1 font-display">Order filled!</div>
          <a
            href={`https://coston2-explorer.flare.network/tx/${txSuccess}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            View transaction <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display block mb-2">
          Amount (USDT0)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="input text-lg font-semibold font-mono"
            disabled={disabled}
            step="0.01"
            min="0"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="font-mono">Balance: ${Number(formattedBalance).toFixed(2)}</span>
          <button
            onClick={() => setAmount(formattedBalance)}
            className="text-primary hover:text-primary/80 transition-colors font-display font-bold uppercase text-[10px] tracking-[0.15em]"
            disabled={disabled}
          >
            Max
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {quickAmounts.map((qa) => (
          <button
            key={qa}
            onClick={() => setAmount(qa)}
            className="btn btn-outline flex-1 py-2 text-sm font-mono"
            disabled={disabled}
          >
            ${qa}
          </button>
        ))}
      </div>

      {amount && parseFloat(amount) > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-display text-xs uppercase tracking-wider">Avg price</span>
            <span className="font-medium font-mono text-white">${avgPrice}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-display text-xs uppercase tracking-wider">Shares</span>
            <span className="font-medium font-mono text-white">{Number(formattedExpected).toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-white/5">
            <span className="text-muted-foreground font-display text-xs uppercase tracking-wider">Potential return</span>
            <span className="font-bold font-mono text-green-400">
              ${Number(formattedExpected).toFixed(2)} (+{potentialProfit > 0 ? potentialProfit.toFixed(2) : '0.00'})
            </span>
          </div>
        </div>
      )}

      {disabled ? (
        <button className="btn w-full py-3 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors inline-flex items-center justify-center gap-2">
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      ) : (
        <button
          onClick={handleBuy}
          disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
          className={cn(
            "btn w-full py-3 font-display uppercase tracking-wide",
            side === 'yes' ? "btn-yes active" : "btn-no active"
          )}
        >
          {getButtonText()}
        </button>
      )}
    </div>
  );
}
