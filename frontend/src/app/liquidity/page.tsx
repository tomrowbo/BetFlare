'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, parseAbiItem } from 'viem';
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  CONTRACTS,
  ERC20_ABI,
  UNIVERSAL_VAULT_ABI,
  FPMM_ABI,
} from '@/config/contracts';

export default function LiquidityPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');

  // User balances
  const { data: usdtBalance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: shareBalance } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: shareValue } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'convertToAssets',
    args: shareBalance ? [shareBalance as bigint] : undefined,
  });

  // Vault stats
  const { data: totalAssets } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'totalAssets',
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: [{ name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] }],
    functionName: 'totalSupply',
  });

  const { data: totalFeesReceived } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'totalFeesReceived',
  });

  // Market liquidity (from FPMM)
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

  // Allowance check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.universalVault as `0x${string}`] : undefined,
  });

  // Write functions
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { writeContract: withdraw, data: withdrawHash } = useWriteContract();

  const [isApproving, setIsApproving] = useState(false);
  const { isLoading: isDepositing, isSuccess: depositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: isWithdrawing, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const publicClient = usePublicClient();

  // Format values
  const formattedUsdtBalance = usdtBalance ? formatUnits(usdtBalance as bigint, 6) : '0';
  const formattedShareValue = shareValue ? formatUnits(shareValue as bigint, 6) : '0';
  const formattedTotalAssets = totalAssets ? formatUnits(totalAssets as bigint, 6) : '0';
  const formattedTotalFees = totalFeesReceived ? formatUnits(totalFeesReceived as bigint, 6) : '0';

  // Calculate user's share of fees
  const userEarnings = useMemo(() => {
    if (!shareBalance || !totalSupply || !totalFeesReceived) return 0;
    const shares = shareBalance as bigint;
    const supply = totalSupply as bigint;
    const fees = totalFeesReceived as bigint;
    if (supply === 0n) return 0;
    return Number(formatUnits((fees * shares) / supply, 6));
  }, [shareBalance, totalSupply, totalFeesReceived]);

  // Fetch real deposit events for chart
  const [chartData, setChartData] = useState<{ time: string; value: number }[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      if (!publicClient) return;

      try {
        // Get deposit events from vault
        const logs = await publicClient.getLogs({
          address: CONTRACTS.universalVault as `0x${string}`,
          event: parseAbiItem('event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)'),
          fromBlock: 'earliest',
        });

        // Build cumulative TVL over time
        let cumulative = 0;
        const data: { time: string; value: number; block: bigint }[] = [];

        for (const log of logs) {
          const assets = (log.args as { assets?: bigint }).assets || 0n;
          cumulative += Number(formatUnits(assets, 6));
          data.push({
            time: '',
            value: cumulative,
            block: log.blockNumber,
          });
        }

        // Add current value as final point
        const currentTvl = Number(formattedTotalAssets);
        if (data.length === 0 || data[data.length - 1].value !== currentTvl) {
          data.push({ time: 'Now', value: currentTvl, block: 0n });
        }

        // Format times (use block numbers as labels for simplicity)
        const formatted = data.map((d, i) => ({
          time: i === data.length - 1 ? 'Now' : `#${i + 1}`,
          value: d.value,
        }));

        setChartData(formatted.length > 0 ? formatted : [{ time: 'Now', value: currentTvl }]);
      } catch (err) {
        // Fallback to current value only
        setChartData([{ time: 'Now', value: Number(formattedTotalAssets) }]);
      }
    }

    fetchEvents();
  }, [publicClient, formattedTotalAssets]);

  const marketLiquidity = yesReserve && noReserve
    ? Number(formatUnits((yesReserve as bigint) + (noReserve as bigint), 6))
    : 0;

  const needsApproval = useMemo(() => {
    if (!amount || allowance === undefined) return false;
    try {
      return (allowance as bigint) < parseUnits(amount, 6);
    } catch {
      return false;
    }
  }, [amount, allowance]);

  const handleDeposit = async () => {
    if (!amount || !address) return;

    const depositAmount = parseUnits(amount, 6);

    // Check if we need approval first
    if (needsApproval) {
      setIsApproving(true);
      try {
        // Approve max amount
        const hash = await approveAsync({
          address: CONTRACTS.usdt as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.universalVault as `0x${string}`, parseUnits('1000000', 6)],
        });

        // Wait for approval to be mined
        await publicClient?.waitForTransactionReceipt({ hash });
        await refetchAllowance();
      } catch (err) {
        console.error('Approval failed:', err);
        setIsApproving(false);
        return;
      }
      setIsApproving(false);
    }

    // Now deposit
    deposit({
      address: CONTRACTS.universalVault as `0x${string}`,
      abi: UNIVERSAL_VAULT_ABI,
      functionName: 'deposit',
      args: [depositAmount, address],
    });
  };

  const handleWithdraw = () => {
    if (!amount || !address) return;
    withdraw({
      address: CONTRACTS.universalVault as `0x${string}`,
      abi: UNIVERSAL_VAULT_ABI,
      functionName: 'withdraw',
      args: [parseUnits(amount, 6), address, address],
    });
  };

  const isLoading = isApproving || isDepositing || isWithdrawing;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#ffb80c] to-[#ff9500]">
        <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Image src="/betflare-logo.png" alt="BetFlare" width={140} height={32} className="h-8 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link href="/" className="text-black/70 hover:text-black">Markets</Link>
              <Link href="/liquidity" className="text-black/90 hover:text-black px-3 py-1 bg-black/10 rounded">Liquidity</Link>
            </nav>
          </div>
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
              const connected = mounted && account && chain;
              return (
                <button
                  onClick={connected ? openAccountModal : openConnectModal}
                  className="px-4 py-2 bg-black text-white font-semibold rounded-lg hover:bg-black/80 transition text-sm"
                >
                  {connected ? account.displayName : 'Connect Wallet'}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Liquidity Pool</h1>
          <p className="text-[--text-secondary]">
            Deposit USDT0 to provide liquidity. Funds are immediately deployed to all markets.
          </p>
        </div>

        {/* Chart */}
        <div className="card mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-sm text-[--text-muted]">Total Pool Value</div>
              <div className="text-3xl font-bold text-[--accent-green]">${Number(formattedTotalAssets).toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[--text-muted]">Total Fees Earned</div>
              <div className="text-xl font-bold text-[--accent-green]">+${Number(formattedTotalFees).toFixed(4)}</div>
            </div>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis hide domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#888' }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'TVL']}
                />
                <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card text-center">
            <div className="text-sm text-[--text-muted] mb-1">Your Share</div>
            <div className="text-2xl font-bold">${Number(formattedShareValue).toFixed(2)}</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-[--text-muted] mb-1">Your Earnings</div>
            <div className="text-2xl font-bold text-[--accent-green]">+${userEarnings.toFixed(4)}</div>
          </div>
        </div>

        {/* Deposit/Withdraw Card */}
        <div className="card">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('deposit')}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                mode === 'deposit'
                  ? 'bg-[--accent-green] text-white'
                  : 'bg-[--bg-secondary] text-[--text-secondary] hover:bg-[--bg-hover]'
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setMode('withdraw')}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                mode === 'withdraw'
                  ? 'bg-[--accent-red] text-white'
                  : 'bg-[--bg-secondary] text-[--text-secondary] hover:bg-[--bg-hover]'
              }`}
            >
              Withdraw
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-[--text-secondary] mb-2">
              Amount (USDT0)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input text-xl pr-20"
                disabled={!isConnected}
              />
              <button
                onClick={() => setAmount(mode === 'deposit' ? formattedUsdtBalance : formattedShareValue)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[--accent-blue] hover:underline"
              >
                MAX
              </button>
            </div>
            <div className="text-sm text-[--text-muted] mt-2">
              {mode === 'deposit'
                ? `Balance: ${Number(formattedUsdtBalance).toFixed(2)} USDT0`
                : `Available: ${Number(formattedShareValue).toFixed(2)} USDT0`
              }
            </div>
          </div>

          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button onClick={openConnectModal} className="btn btn-outline w-full py-4 text-lg">
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
          ) : (
            <button
              onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={!amount || isLoading}
              className={`btn w-full py-4 text-lg ${mode === 'deposit' ? 'btn-yes active' : 'btn-no active'}`}
            >
              {isApproving
                ? 'Approving...'
                : isDepositing
                ? 'Depositing...'
                : isWithdrawing
                ? 'Withdrawing...'
                : mode === 'deposit'
                ? 'Deposit'
                : 'Withdraw'}
            </button>
          )}

          {(depositSuccess || withdrawSuccess) && (
            <div className="mt-4 p-3 bg-[--accent-green]/10 text-[--accent-green] rounded text-center">
              Transaction successful!
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-[--bg-secondary] rounded-lg text-sm text-[--text-secondary] text-center">
          Earn 0.2% fee on every trade. Liquidity is split equally across all active markets.
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[--border-color] bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-[--text-secondary]">
              Powered by Flare FTSO Oracle
            </div>
            <a href="https://faucet.flare.network/coston2" target="_blank" rel="noopener noreferrer" className="text-sm text-[--text-secondary] hover:text-[--accent-blue]">
              Get Testnet Tokens
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
