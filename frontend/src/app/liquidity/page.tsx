'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Header } from '@/components/Header';
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

  // Fetch user's deposit/withdraw history for chart
  const [chartData, setChartData] = useState<{ time: string; value: number; type: string }[]>([]);
  const [netDeposited, setNetDeposited] = useState(0);

  // Calculate actual profit = current balance - net deposits
  const userProfit = useMemo(() => {
    const currentBalance = Number(formattedShareValue);
    return currentBalance - netDeposited;
  }, [formattedShareValue, netDeposited]);

  useEffect(() => {
    async function fetchUserHistory() {
      if (!address) {
        setChartData([]);
        return;
      }

      try {
        // Use Coston2 explorer API (RPC has 30-block limit which misses older events)
        const DEPOSIT_TOPIC = '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7';
        const WITHDRAW_TOPIC = '0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db';

        const userAddressPadded = `0x000000000000000000000000${address.slice(2).toLowerCase()}`;

        // Fetch all deposit events (filter client-side as explorer topic filtering unreliable)
        const depositResponse = await fetch(
          `https://coston2-explorer.flare.network/api?module=logs&action=getLogs&address=${CONTRACTS.universalVault}&topic0=${DEPOSIT_TOPIC}&fromBlock=0&toBlock=latest`
        );
        const depositData = await depositResponse.json();

        // Fetch all withdraw events
        const withdrawResponse = await fetch(
          `https://coston2-explorer.flare.network/api?module=logs&action=getLogs&address=${CONTRACTS.universalVault}&topic0=${WITHDRAW_TOPIC}&fromBlock=0&toBlock=latest`
        );
        const withdrawData = await withdrawResponse.json();

        // Parse and filter events for this user
        interface LogEntry {
          blockNumber: string;
          transactionIndex: string;
          data: string;
          topics: string[];
        }

        const depositEvents = (depositData.result || [])
          .filter((log: LogEntry) => {
            // topic2 is owner for Deposit event
            return log.topics[2]?.toLowerCase() === userAddressPadded;
          })
          .map((log: LogEntry) => ({
            block: parseInt(log.blockNumber, 16),
            txIndex: parseInt(log.transactionIndex, 16),
            // data contains: assets (uint256) + shares (uint256) = 64 bytes each
            assets: BigInt('0x' + log.data.slice(2, 66)),
            type: 'deposit' as const,
          }));

        const withdrawEvents = (withdrawData.result || [])
          .filter((log: LogEntry) => {
            // topic3 is owner for Withdraw event
            return log.topics[3]?.toLowerCase() === userAddressPadded;
          })
          .map((log: LogEntry) => ({
            block: parseInt(log.blockNumber, 16),
            txIndex: parseInt(log.transactionIndex, 16),
            // data contains: assets (uint256) + shares (uint256)
            assets: BigInt('0x' + log.data.slice(2, 66)),
            type: 'withdraw' as const,
          }));

        const allEvents = [...depositEvents, ...withdrawEvents].sort((a, b) => {
          if (a.block !== b.block) return a.block - b.block;
          return a.txIndex - b.txIndex;
        });

        console.log('Found events from explorer:', allEvents.length, allEvents);

        // Build cumulative balance history and track net deposited
        let balance = 0;
        let totalDeposited = 0;
        let totalWithdrawn = 0;
        const data: { time: string; value: number; type: string }[] = [
          { time: 'Start', value: 0, type: 'start' }
        ];

        allEvents.forEach((event) => {
          const amount = Number(formatUnits(event.assets, 6));
          if (event.type === 'deposit') {
            balance += amount;
            totalDeposited += amount;
          } else {
            balance -= amount;
            totalWithdrawn += amount;
          }
          data.push({
            time: event.type === 'deposit' ? `+$${amount.toFixed(2)}` : `-$${amount.toFixed(2)}`,
            value: Math.max(0, balance),
            type: event.type,
          });
        });

        // Track net deposited for profit calculation
        setNetDeposited(totalDeposited - totalWithdrawn);

        // Add current balance as final point if different (shows profit/loss)
        const currentBalance = Number(formattedShareValue);
        if (data.length === 1 || Math.abs(data[data.length - 1].value - currentBalance) > 0.01) {
          data.push({ time: 'Now', value: currentBalance, type: 'current' });
        }

        setChartData(data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setChartData([
          { time: 'Start', value: 0, type: 'start' },
          { time: 'Now', value: Number(formattedShareValue), type: 'current' }
        ]);
      }
    }

    fetchUserHistory();
  }, [address, formattedShareValue, depositSuccess, withdrawSuccess]);

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
      <Header />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Liquidity Pool</h1>
          <p className="text-[--text-secondary]">
            Deposit USDT0 to provide liquidity. Funds are immediately deployed to all markets.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <div className="text-sm text-[--text-muted]">Pool TVL</div>
            <div className="text-xl font-bold">${Number(formattedTotalAssets).toFixed(2)}</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-[--text-muted]">Total Fees</div>
            <div className="text-xl font-bold text-[--accent-green]">${Number(formattedTotalFees).toFixed(4)}</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-[--text-muted]">Fee Rate</div>
            <div className="text-xl font-bold">0.2%</div>
          </div>
        </div>

        {/* Chart */}
        <div className="card mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-sm text-[--text-muted]">Your Balance</div>
              <div className="text-3xl font-bold">${Number(formattedShareValue).toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[--text-muted]">Your Profit</div>
              <div className={`text-xl font-bold ${userProfit >= 0 ? 'text-[--accent-green]' : 'text-[--accent-red]'}`}>
                {userProfit >= 0 ? '+' : ''}{userProfit.toFixed(4)}
              </div>
              <div className="text-xs text-[--text-muted]">
                (deposited: ${netDeposited.toFixed(2)})
              </div>
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
    </main>
  );
}
