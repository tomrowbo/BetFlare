'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, FPMM_ABI, ERC20_ABI } from '@/config/contracts';
import { BetSlipSkeleton } from './Skeleton';

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

  // Show skeleton if loading initial data and we have an address
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

  // Single-click buy with approval if needed
  const handleBuy = async () => {
    if (!amount || parseFloat(amount) <= 0 || !publicClient) return;

    setIsProcessing(true);

    try {
      // Step 1: Approve if needed
      if (needsApproval) {
        setProcessingStep('approving');
        const approveHash = await writeContractAsync({
          address: CONTRACTS.usdt as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [fpmmAddress as `0x${string}`, parseUnits('1000000', 6)],
        });
        // Wait for approval to be mined
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      // Step 2: Execute buy
      setProcessingStep('buying');
      const buyHash = await writeContractAsync({
        address: fpmmAddress as `0x${string}`,
        abi: FPMM_ABI,
        functionName: side === 'yes' ? 'buyYes' : 'buyNo',
        args: [parseUnits(amount, 6)],
      });

      // Wait for buy to be mined
      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      // Success!
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

  // Show skeleton while loading initial data
  if (isInitialLoading) {
    return <BetSlipSkeleton />;
  }

  // Show resolved message if market is resolved
  if (resolved) {
    return (
      <div className="card">
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-lg font-bold mb-2">Market Resolved</h3>
          <p className="text-sm text-[--text-secondary]">
            Trading has ended. Check your positions below to redeem winnings.
          </p>
        </div>
      </div>
    );
  }

  // Show awaiting resolution message if past resolution time
  if (isPastResolution) {
    return (
      <div className="card">
        <div className="text-center py-6">
          <div className="text-4xl mb-3">⏳</div>
          <h3 className="text-lg font-bold mb-2 text-[--accent-orange]">Trading Closed</h3>
          <p className="text-sm text-[--text-secondary]">
            Resolution time has passed. Click &quot;Resolve Market&quot; above to trigger the FTSO oracle and settle the market.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Buy {side.toUpperCase()}</h3>
        <div className={`px-2 py-1 rounded text-xs font-bold ${
          side === 'yes'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {side.toUpperCase()}
        </div>
      </div>

      {/* Success Message */}
      {txSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="text-green-800 font-semibold text-sm mb-1">Order filled!</div>
          <a
            href={`https://coston2-explorer.flare.network/tx/${txSuccess}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[--accent-blue] hover:underline"
          >
            View transaction →
          </a>
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-4">
        <label className="text-sm text-[--text-secondary] block mb-2">Amount (USDT0)</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="input text-lg font-semibold"
            disabled={disabled}
            step="0.01"
            min="0"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[--text-muted]">
          <span>Balance: ${Number(formattedBalance).toFixed(2)}</span>
          <button
            onClick={() => setAmount(formattedBalance)}
            className="text-[--accent-blue] hover:underline"
            disabled={disabled}
          >
            Max
          </button>
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="flex gap-2 mb-4">
        {quickAmounts.map((qa) => (
          <button
            key={qa}
            onClick={() => setAmount(qa)}
            className="btn btn-outline flex-1 py-2 text-sm"
            disabled={disabled}
          >
            ${qa}
          </button>
        ))}
      </div>

      {/* Order Summary */}
      {amount && parseFloat(amount) > 0 && (
        <div className="bg-[--bg-secondary] rounded-lg p-3 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[--text-secondary]">Avg price</span>
            <span className="font-medium">${avgPrice}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[--text-secondary]">Shares</span>
            <span className="font-medium">{Number(formattedExpected).toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[--border-color]">
            <span className="text-[--text-secondary]">Potential return</span>
            <span className="font-bold text-[--accent-green]">
              ${Number(formattedExpected).toFixed(2)} (+{potentialProfit > 0 ? potentialProfit.toFixed(2) : '0.00'})
            </span>
          </div>
        </div>
      )}

      {/* Action Button */}
      {disabled ? (
        <button className="btn btn-outline w-full py-3">
          Connect Wallet
        </button>
      ) : (
        <button
          onClick={handleBuy}
          disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
          className={`btn w-full py-3 ${side === 'yes' ? 'btn-yes active' : 'btn-no active'}`}
        >
          {getButtonText()}
        </button>
      )}
    </div>
  );
}
