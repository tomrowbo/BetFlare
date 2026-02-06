'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, FPMM_ABI, ERC20_ABI } from '@/config/contracts';

interface BetSlipProps {
  side: 'yes' | 'no';
  disabled: boolean;
}

export function BetSlip({ side, disabled }: BetSlipProps) {
  const [amount, setAmount] = useState('');
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const { address } = useAccount();

  const { data: usdtBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.fpmm as `0x${string}`] : undefined,
  });

  const { data: expectedTokens } = useReadContract({
    address: CONTRACTS.fpmm as `0x${string}`,
    abi: FPMM_ABI,
    functionName: side === 'yes' ? 'calcBuyYes' : 'calcBuyNo',
    args: amount && parseFloat(amount) > 0 ? [parseUnits(amount, 6)] : undefined,
  });

  const { writeContract: approve, data: approveHash, reset: resetApprove } = useWriteContract();
  const { writeContract: buy, data: buyHash, reset: resetBuy } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isBuying, isSuccess: buySuccess } = useWaitForTransactionReceipt({ hash: buyHash });

  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
      resetApprove();
    }
  }, [approveSuccess, refetchAllowance, resetApprove]);

  useEffect(() => {
    if (buySuccess && buyHash) {
      setTxSuccess(buyHash);
      refetchBalance();
      setAmount('');
      resetBuy();
      setTimeout(() => setTxSuccess(null), 5000);
    }
  }, [buySuccess, buyHash, refetchBalance, resetBuy]);

  const formattedBalance = usdtBalance ? formatUnits(usdtBalance as bigint, 6) : '0';
  const formattedExpected = expectedTokens ? formatUnits(expectedTokens as bigint, 6) : '0';
  const needsApproval = amount && parseFloat(amount) > 0 && allowance !== undefined &&
    (allowance as bigint) < parseUnits(amount, 6);

  const potentialProfit = Number(formattedExpected) - Number(amount);
  const avgPrice = Number(amount) > 0 ? (Number(amount) / Number(formattedExpected)).toFixed(2) : '0';

  const handleApprove = () => {
    approve({
      address: CONTRACTS.usdt as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.fpmm as `0x${string}`, parseUnits('1000000', 6)],
    });
  };

  const handleBuy = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    buy({
      address: CONTRACTS.fpmm as `0x${string}`,
      abi: FPMM_ABI,
      functionName: side === 'yes' ? 'buyYes' : 'buyNo',
      args: [parseUnits(amount, 6)],
    });
  };

  const quickAmounts = ['1', '5', '10', '25'];

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
      ) : needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={isApproving}
          className="btn btn-primary w-full py-3"
        >
          {isApproving ? 'Approving...' : 'Approve USDT0'}
        </button>
      ) : (
        <button
          onClick={handleBuy}
          disabled={!amount || parseFloat(amount) <= 0 || isBuying}
          className={`btn w-full py-3 ${side === 'yes' ? 'btn-yes active' : 'btn-no active'}`}
        >
          {isBuying ? 'Processing...' : `Buy ${side.toUpperCase()}`}
        </button>
      )}
    </div>
  );
}
