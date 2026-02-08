'use client';

import { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { getSwapQuote, calculateMinOutput } from '@/lib/smart-accounts';

interface XrpAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  xrpBalance: string | null;
  fxrpDecimals: number;
  slippageBps: number;
  onSlippageChange: (bps: number) => void;
  disabled?: boolean;
}

export function XrpAmountInput({
  value,
  onChange,
  xrpBalance,
  fxrpDecimals,
  slippageBps,
  onSlippageChange,
  disabled,
}: XrpAmountInputProps) {
  const [estimatedUsdt, setEstimatedUsdt] = useState<string>('0');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // Fetch swap quote when amount changes
  useEffect(() => {
    if (!value || parseFloat(value) <= 0) {
      setEstimatedUsdt('0');
      return;
    }

    const fetchQuote = async () => {
      setIsLoadingQuote(true);
      try {
        // Convert XRP to FXRP amount (they should be 1:1 minus fees)
        const fxrpAmount = parseUnits(value, fxrpDecimals);
        const usdtOut = await getSwapQuote(fxrpAmount);
        const minOut = calculateMinOutput(usdtOut, slippageBps);
        setEstimatedUsdt(formatUnits(minOut, 6)); // USDT has 6 decimals
      } catch (error) {
        console.error('Failed to get swap quote:', error);
        setEstimatedUsdt('0');
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [value, fxrpDecimals, slippageBps]);

  const handleMaxClick = () => {
    if (xrpBalance) {
      // Leave some XRP for fees
      const maxAmount = Math.max(0, parseFloat(xrpBalance) - 2);
      onChange(maxAmount.toFixed(6));
    }
  };

  return (
    <div className="space-y-4">
      {/* Amount Input */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">You deposit</span>
          {xrpBalance && (
            <span className="text-sm text-gray-400">
              Balance: {xrpBalance} XRP
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            disabled={disabled}
            className="flex-1 bg-transparent text-2xl font-semibold outline-none disabled:text-gray-500"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleMaxClick}
              disabled={disabled || !xrpBalance}
              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
            <span className="text-lg font-medium text-gray-300">XRP</span>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
          <span className="text-gray-400">↓</span>
        </div>
      </div>

      {/* Output Estimate */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">You receive (estimated)</span>
          {isLoadingQuote && (
            <span className="text-sm text-gray-500 animate-pulse">Fetching quote...</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-2xl font-semibold text-gray-300">
            {parseFloat(estimatedUsdt).toFixed(2)}
          </span>
          <span className="text-lg font-medium text-gray-300">bfLP (Vault Shares)</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          XRP → FXRP → USDT → Vault Shares
        </p>
      </div>

      {/* Slippage Settings */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Slippage Tolerance</span>
        <div className="flex items-center gap-2">
          {[50, 100, 200].map((bps) => (
            <button
              key={bps}
              onClick={() => onSlippageChange(bps)}
              className={`px-2 py-1 rounded text-xs ${
                slippageBps === bps
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {bps / 100}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
