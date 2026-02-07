'use client';

import { useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseUnits, formatUnits } from 'viem';
import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { Vault, Percent, Coins, ArrowDownToLine, ArrowUpFromLine, Wallet, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { cn } from '@/lib/utils';
import {
  CONTRACTS,
  MARKETS,
  ERC20_ABI,
  UNIVERSAL_VAULT_ABI,
  FPMM_ABI,
} from '@/config/contracts';
import { LiquidityPageSkeleton } from '@/components/Skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useSmartTransaction, TransactionRequest } from '@/hooks/useSmartTransaction';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';

export default function LiquidityPage() {
  const { address, isConnected, isSmartAccount } = useWallet();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [refreshKey, setRefreshKey] = useState(0);
  const [txSuccess, setTxSuccess] = useState(false);
  const queryClient = useQueryClient();
  const { execute, isLoading: isProcessing } = useSmartTransaction();

  const { data: usdtBalance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
  });

  const { data: shareBalance } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
  });

  const { data: shareValue } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'convertToAssets',
    args: shareBalance ? [shareBalance as bigint] : undefined,
  });

  const { data: totalAssets, isLoading: isLoadingAssets } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'totalAssets',
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: [{ name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] }],
    functionName: 'totalSupply',
  });

  const { data: totalFeesReceived, isLoading: isLoadingFees } = useReadContract({
    address: CONTRACTS.universalVault as `0x${string}`,
    abi: UNIVERSAL_VAULT_ABI,
    functionName: 'totalFeesReceived',
  });

  const isLoadingVaultStats = isLoadingAssets || isLoadingFees;

  const marketLiquidityContracts = MARKETS.flatMap((market) => [
    { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'yesReserve' },
    { address: market.fpmm as `0x${string}`, abi: FPMM_ABI, functionName: 'noReserve' },
  ]);

  const { data: marketLiquidityData } = useReadContracts({
    contracts: marketLiquidityContracts,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.usdt as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, CONTRACTS.universalVault as `0x${string}`] : undefined,
  });

  const formattedUsdtBalance = usdtBalance ? formatUnits(usdtBalance as bigint, 6) : '0';
  const formattedShareValue = shareValue ? formatUnits(shareValue as bigint, 6) : '0';
  const formattedTotalAssets = totalAssets ? formatUnits(totalAssets as bigint, 6) : '0';
  const formattedTotalFees = totalFeesReceived ? formatUnits(totalFeesReceived as bigint, 6) : '0';

  const [chartData, setChartData] = useState<{ time: string; value: number; type: string }[]>([]);
  const [netDeposited, setNetDeposited] = useState(0);

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
        const DEPOSIT_TOPIC = '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7';
        const WITHDRAW_TOPIC = '0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db';

        const userAddressPadded = `0x000000000000000000000000${address.slice(2).toLowerCase()}`;

        const depositResponse = await fetch(
          `https://coston2-explorer.flare.network/api?module=logs&action=getLogs&address=${CONTRACTS.universalVault}&topic0=${DEPOSIT_TOPIC}&fromBlock=0&toBlock=latest`
        );
        const depositData = await depositResponse.json();

        const withdrawResponse = await fetch(
          `https://coston2-explorer.flare.network/api?module=logs&action=getLogs&address=${CONTRACTS.universalVault}&topic0=${WITHDRAW_TOPIC}&fromBlock=0&toBlock=latest`
        );
        const withdrawData = await withdrawResponse.json();

        interface LogEntry {
          blockNumber: string;
          transactionIndex: string;
          data: string;
          topics: string[];
        }

        const depositEvents = (depositData.result || [])
          .filter((log: LogEntry) => {
            return log.topics[2]?.toLowerCase() === userAddressPadded;
          })
          .map((log: LogEntry) => ({
            block: parseInt(log.blockNumber, 16),
            txIndex: parseInt(log.transactionIndex, 16),
            assets: BigInt('0x' + log.data.slice(2, 66)),
            type: 'deposit' as const,
          }));

        const withdrawEvents = (withdrawData.result || [])
          .filter((log: LogEntry) => {
            return log.topics[3]?.toLowerCase() === userAddressPadded;
          })
          .map((log: LogEntry) => ({
            block: parseInt(log.blockNumber, 16),
            txIndex: parseInt(log.transactionIndex, 16),
            assets: BigInt('0x' + log.data.slice(2, 66)),
            type: 'withdraw' as const,
          }));

        const allEvents = [...depositEvents, ...withdrawEvents].sort((a, b) => {
          if (a.block !== b.block) return a.block - b.block;
          return a.txIndex - b.txIndex;
        });

        console.log('Found events from explorer:', allEvents.length, allEvents);

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

        setNetDeposited(totalDeposited - totalWithdrawn);

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
  }, [address, formattedShareValue, txSuccess]);

  const marketLiquidity = useMemo(() => {
    if (!marketLiquidityData) return 0;
    let total = 0n;
    for (let i = 0; i < marketLiquidityData.length; i += 2) {
      const yes = marketLiquidityData[i]?.result as bigint | undefined;
      const no = marketLiquidityData[i + 1]?.result as bigint | undefined;
      if (yes) total += yes;
      if (no) total += no;
    }
    return Number(formatUnits(total, 6));
  }, [marketLiquidityData]);

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

    try {
      const transactions: TransactionRequest[] = [];

      // Add approval if needed
      if (needsApproval) {
        transactions.push({
          address: CONTRACTS.usdt as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.universalVault as `0x${string}`, parseUnits('1000000', 6)],
        });
      }

      // Add deposit transaction
      transactions.push({
        address: CONTRACTS.universalVault as `0x${string}`,
        abi: UNIVERSAL_VAULT_ABI,
        functionName: 'deposit',
        args: [parseUnits(amount, 6), address as `0x${string}`],
      });

      await execute(transactions);
      setTxSuccess(true);
      queryClient.invalidateQueries();
      refetchAllowance();
      setRefreshKey(prev => prev + 1);
      setAmount('');
      setTimeout(() => setTxSuccess(false), 5000);
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !address) return;

    try {
      await execute([{
        address: CONTRACTS.universalVault as `0x${string}`,
        abi: UNIVERSAL_VAULT_ABI,
        functionName: 'withdraw',
        args: [parseUnits(amount, 6), address as `0x${string}`, address as `0x${string}`],
      }]);
      setTxSuccess(true);
      queryClient.invalidateQueries();
      setRefreshKey(prev => prev + 1);
      setAmount('');
      setTimeout(() => setTxSuccess(false), 5000);
    } catch (error) {
      console.error('Withdraw failed:', error);
    }
  };


  if (isLoadingVaultStats) {
    return (
      <main className="min-h-screen">
        <Header />
        <LiquidityPageSkeleton />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />

      <PageContainer maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <span className="inline-block px-3 py-1 border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-4 tracking-wider uppercase">
            Liquidity
          </span>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white uppercase tracking-tighter leading-[1.1]">
            Liquidity <span className="text-primary">Pool</span>
          </h1>
          <p className="text-muted-foreground text-base font-light leading-relaxed mt-3 max-w-md mx-auto">
            Deposit USDT0 to provide liquidity. Funds are immediately deployed to all markets.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <VaultStatCard
            icon={<Vault className="w-3.5 h-3.5 text-primary/60" />}
            label="Pool TVL"
            value={`$${Number(formattedTotalAssets).toFixed(2)}`}
          />
          <VaultStatCard
            icon={<Coins className="w-3.5 h-3.5 text-green-400/60" />}
            label="Total Fees"
            value={`$${Number(formattedTotalFees).toFixed(4)}`}
            valueColor="text-green-400"
          />
          <VaultStatCard
            icon={<Percent className="w-3.5 h-3.5 text-primary/60" />}
            label="Fee Rate"
            value="0.2%"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-5 mb-6"
        >
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 mb-1">
                Your Balance
              </div>
              <div className="text-3xl font-display font-bold text-white">
                ${Number(formattedShareValue).toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 mb-1">
                Your Profit
              </div>
              <div className={cn(
                "text-xl font-mono font-bold",
                userProfit >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {userProfit >= 0 ? '+' : ''}{userProfit.toFixed(4)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/20 mt-0.5">
                deposited: ${netDeposited.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="h-32">
            <ResponsiveContainer key={`chart-${refreshKey}`} width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(26, 85%, 54%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(26, 85%, 54%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'var(--font-display)' }}
                />
                <YAxis hide domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0, 0%, 8%)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(12px)',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}
                  itemStyle={{ color: 'hsl(26, 85%, 54%)' }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Value']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(26, 85%, 54%)"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-5"
        >
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('deposit')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-display font-bold text-sm uppercase tracking-wide transition-all",
                mode === 'deposit'
                  ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                  : 'bg-white/[0.03] border border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
              )}
            >
              <ArrowDownToLine className="w-4 h-4" />
              Deposit
            </button>
            <button
              onClick={() => setMode('withdraw')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-display font-bold text-sm uppercase tracking-wide transition-all",
                mode === 'withdraw'
                  ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                  : 'bg-white/[0.03] border border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
              )}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Withdraw
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 mb-2">
              Amount (USDT0)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3.5 text-xl font-mono text-white placeholder:text-white/15 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all pr-20"
                disabled={!isConnected}
              />
              <button
                onClick={() => setAmount(mode === 'deposit' ? formattedUsdtBalance : formattedShareValue)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.15em] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="text-xs text-white/30 mt-2 font-mono">
              {mode === 'deposit'
                ? `Balance: ${Number(formattedUsdtBalance).toFixed(2)} USDT0`
                : `Available: ${Number(formattedShareValue).toFixed(2)} USDT0`
              }
            </div>
          </div>

          {!isConnected ? (
            <div className="w-full flex justify-center">
              <ConnectWalletButton />
            </div>
          ) : (
            <button
              onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={!amount || isProcessing}
              className={cn(
                "w-full py-4 rounded-lg font-display font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2",
                mode === 'deposit'
                  ? 'bg-green-500 text-white hover:bg-green-500/80 shadow-[0_0_25px_rgba(34,197,94,0.15)]'
                  : 'bg-red-500 text-white hover:bg-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.15)]'
              )}
            >
              {isSmartAccount && <Sparkles className="w-4 h-4" />}
              {isProcessing
                ? (isSmartAccount ? 'Processing (Gasless)...' : 'Processing...')
                : mode === 'deposit'
                ? (isSmartAccount ? 'Deposit (Gasless)' : 'Deposit')
                : (isSmartAccount ? 'Withdraw (Gasless)' : 'Withdraw')}
            </button>
          )}

          {txSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
            >
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-display font-semibold text-green-400">
                Transaction successful!
              </span>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 flex items-center justify-center gap-2 p-4 rounded-lg bg-white/[0.02] border border-white/5"
        >
          <Info className="w-3.5 h-3.5 text-white/20 shrink-0" />
          <span className="text-xs text-white/30 font-light">
            Earn 0.2% fee on every trade. Liquidity is split equally across all active markets.
          </span>
        </motion.div>
      </PageContainer>
    </main>
  );
}

function VaultStatCard({
  icon,
  label,
  value,
  valueColor = "text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
          {label}
        </span>
      </div>
      <div className={cn("text-xl font-display font-bold", valueColor)}>
        {value}
      </div>
    </div>
  );
}
