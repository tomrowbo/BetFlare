'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, VAULT_ABI, ERC20_ABI, FPMM_ABI } from '@/config/contracts';

interface VaultPanelProps {
  disabled: boolean;
}

export function VaultPanel({ disabled }: VaultPanelProps) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const { address } = useAccount();

  const { data: usdtBalance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: shareBalance } = useReadContract({
    address: CONTRACTS.vault as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: totalAssets } = useReadContract({
    address: CONTRACTS.vault as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
  });

  // Get market liquidity from FPMM
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

  const { data: shareValue } = useReadContract({
    address: CONTRACTS.vault as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'convertToAssets',
    args: shareBalance ? [shareBalance as bigint] : undefined,
  });

  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { writeContract: withdraw, data: withdrawHash } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isDepositing } = useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const formattedBalance = usdtBalance ? formatUnits(usdtBalance as bigint, 6) : '0';
  const formattedTotalAssets = totalAssets ? formatUnits(totalAssets as bigint, 6) : '0';
  const formattedShareValue = shareValue ? formatUnits(shareValue as bigint, 6) : '0';

  // Calculate market liquidity from FPMM reserves
  const marketLiquidity = yesReserve && noReserve
    ? Number(formatUnits((yesReserve as bigint) + (noReserve as bigint), 6))
    : 0;

  const handleDeposit = () => {
    if (!amount || !address) return;
    deposit({
      address: CONTRACTS.vault as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 6), address],
    });
  };

  const handleWithdraw = () => {
    if (!amount || !address) return;
    withdraw({
      address: CONTRACTS.vault as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [parseUnits(amount, 6), address, address],
    });
  };

  const handleApprove = () => {
    approve({
      address: CONTRACTS.usdt as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.vault as `0x${string}`, parseUnits('1000000', 6)],
    });
  };

  const isLoading = isApproving || isDepositing || isWithdrawing;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">LP Vault</h3>
          <p className="text-sm text-[--text-secondary]">Provide liquidity and earn 0.2% on every trade</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-[--text-muted]">APY</div>
          <div className="text-xl font-bold text-[--accent-green]">~5.2%</div>
        </div>
      </div>

      {/* Vault Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[--bg-secondary] rounded-lg p-4 text-center">
          <div className="text-sm text-[--text-muted] mb-1">Market Liquidity</div>
          <div className="text-xl font-bold text-[--accent-green]">${marketLiquidity.toFixed(2)}</div>
        </div>
        <div className="bg-[--bg-secondary] rounded-lg p-4 text-center">
          <div className="text-sm text-[--text-muted] mb-1">Vault TVL</div>
          <div className="text-xl font-bold">${Number(formattedTotalAssets).toFixed(2)}</div>
        </div>
        <div className="bg-[--bg-secondary] rounded-lg p-4 text-center">
          <div className="text-sm text-[--text-muted] mb-1">Your Share</div>
          <div className="text-xl font-bold">${Number(formattedShareValue).toFixed(2)}</div>
        </div>
        <div className="bg-[--bg-secondary] rounded-lg p-4 text-center">
          <div className="text-sm text-[--text-muted] mb-1">Your Balance</div>
          <div className="text-xl font-bold">${Number(formattedBalance).toFixed(2)}</div>
        </div>
      </div>

      {/* Deposit/Withdraw Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('deposit')}
          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
            mode === 'deposit'
              ? 'bg-[--accent-green] text-white'
              : 'bg-[--bg-secondary] text-[--text-secondary] hover:bg-[--bg-hover]'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setMode('withdraw')}
          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
            mode === 'withdraw'
              ? 'bg-[--accent-red] text-white'
              : 'bg-[--bg-secondary] text-[--text-secondary] hover:bg-[--bg-hover]'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Amount Input */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="input"
            disabled={disabled}
          />
        </div>
        {disabled ? (
          <button className="btn btn-outline w-36">
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={!amount || isLoading}
            className={`btn w-36 ${mode === 'deposit' ? 'btn-yes active' : 'btn-no active'}`}
          >
            {isLoading ? 'Processing...' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-[--bg-secondary] rounded-lg text-sm text-[--text-secondary]">
        <strong className="text-[--text-primary]">How it works:</strong> LPs provide USDT0 liquidity that backs the market.
        You earn 0.2% of every trade as fees, proportional to your share of the pool.
      </div>
    </div>
  );
}
