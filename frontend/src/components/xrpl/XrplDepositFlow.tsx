'use client';

import { useState, useCallback } from 'react';
import { parseUnits } from 'viem';
import { ArrowDownToLine, Info, AlertCircle } from 'lucide-react';
import { useCrossmark } from '@/hooks/useCrossmark';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { CrossmarkConnect } from './CrossmarkConnect';
import { DepositProgress, type DepositStep } from './DepositProgress';
import { cn } from '@/lib/utils';
import {
  encodeCollateralReservation,
  getCollateralReservationFee,
  dropsToXrp,
  buildWrapperSwapAndDepositInstructions,
  encodeCustomInstruction,
  getCustomInstructionFee,
  watchForCustomInstructionExecuted,
  registerCustomInstruction,
} from '@/lib/smart-accounts';
import { sendInstructionPayment, sendMintPayment } from '@/lib/crossmark';

interface XrplDepositFlowProps {
  onDepositComplete?: () => void;
}

export function XrplDepositFlow({ onDepositComplete }: XrplDepositFlowProps) {
  const {
    isInstalled,
    isConnected,
    isConnecting,
    address: xrplAddress,
    balance: xrpBalance,
    error: crossmarkError,
    connect,
    disconnect,
    clearError,
  } = useCrossmark();

  const {
    personalAccountAddress,
    operatorAddresses,
    agentVaults,
    formattedFxrpBalance,
    formattedVaultBalance,
    isLoading: isLoadingAccount,
    watchForCollateralReserved,
    watchForMintingExecuted,
    refreshBalances,
  } = useSmartAccount(xrplAddress);

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<DepositStep>('idle');
  const [txHashes, setTxHashes] = useState<{
    collateral?: string;
    mint?: string;
    swap?: string;
  }>({});
  const [error, setError] = useState<string>();
  const [receivedShares, setReceivedShares] = useState<string>();

  const handleDeposit = useCallback(async () => {
    if (!personalAccountAddress || !amount || parseFloat(amount) <= 0) return;
    if (operatorAddresses.length === 0) {
      setError('No operator addresses available');
      setStep('error');
      return;
    }
    if (agentVaults.length === 0) {
      setError('No agent vaults available for minting');
      setStep('error');
      return;
    }

    setStep('building');
    setError(undefined);
    setTxHashes({});

    try {
      const xrpAmountFloat = parseFloat(amount);
      const walletId = 0; // Default wallet
      const agentVaultId = Number(agentVaults[0].id); // Use first available agent vault

      // Calculate lots from XRP amount (~10 XRP per lot)
      // Minimum 1 lot
      const mintLots = Math.max(1, Math.floor(xrpAmountFloat / 10));

      // ============ STEP 1: Collateral Reservation ============
      console.log('Step 1: Building collateral reservation instruction...');
      console.log('Minting', mintLots, 'lot(s) of FXRP');

      // Encode the collateral reservation instruction
      const collateralInstruction = encodeCollateralReservation(walletId, mintLots, agentVaultId);
      const collateralFee = await getCollateralReservationFee(walletId, mintLots, agentVaultId);

      console.log('Collateral instruction:', collateralInstruction);
      console.log('Collateral fee:', collateralFee, 'XRP');

      // Sign and send the collateral reservation payment
      setStep('signing_collateral');
      const collateralHash = await sendInstructionPayment(
        operatorAddresses[0],
        collateralFee,
        collateralInstruction as `0x${string}`
      );
      setTxHashes((prev) => ({ ...prev, collateral: collateralHash }));
      console.log('Collateral reservation tx:', collateralHash);

      // Wait for CollateralReserved event
      setStep('waiting_collateral');
      console.log('Waiting for CollateralReserved event...');
      const collateralEvent = await watchForCollateralReserved(180000);

      if (!collateralEvent) {
        throw new Error('Timeout waiting for collateral reservation. The operator may not be active.');
      }

      console.log('CollateralReserved event received:', collateralEvent);

      // ============ STEP 2: Mint Payment ============
      console.log('Step 2: Sending mint payment to agent vault...');

      // Calculate mint payment amount (valueUBA + feeUBA in drops)
      const mintAmountDrops = collateralEvent.valueUBA + collateralEvent.feeUBA;
      const mintAmountXrp = dropsToXrp(mintAmountDrops);

      console.log('Mint amount:', mintAmountXrp, 'XRP');
      console.log('Payment address:', collateralEvent.paymentAddress);
      console.log('Payment reference:', collateralEvent.paymentReference);

      // Sign and send the mint payment
      setStep('signing_mint');
      const mintHash = await sendMintPayment(
        collateralEvent.paymentAddress,
        mintAmountXrp,
        collateralEvent.paymentReference
      );
      setTxHashes((prev) => ({ ...prev, mint: mintHash }));
      console.log('Mint payment tx:', mintHash);

      // Wait for MintingExecuted event
      setStep('waiting_mint');
      console.log('Waiting for MintingExecuted event...');
      const mintEvent = await watchForMintingExecuted(collateralEvent.collateralReservationId, 180000);

      if (!mintEvent) {
        throw new Error('Timeout waiting for minting. The agent may not have processed the payment.');
      }

      console.log('MintingExecuted event received:', mintEvent);
      console.log('Minted amount (UBA):', mintEvent.mintedAmountUBA);

      // ============ STEP 3: Swap FXRP → USDT → Vault ============
      console.log('Step 3: Building swap and deposit custom instruction...');

      const fxrpAmount = mintEvent.mintedAmountUBA;
      const minUsdtOut = 0n; // No slippage protection for testnet
      console.log('FXRP to swap:', Number(fxrpAmount) / 1_000_000, 'FXRP');

      // Build the custom instruction (approve + swapAndDeposit)
      const customInstructions = await buildWrapperSwapAndDepositInstructions(
        fxrpAmount,
        minUsdtOut
      );
      console.log('Custom instructions:', customInstructions);

      // Register the instruction on-chain FIRST (using demo relayer)
      setStep('registering_swap');
      const customInstructionCallHash = await registerCustomInstruction(customInstructions);
      console.log('Custom instruction call hash:', customInstructionCallHash);

      // Encode the instruction for XRPL memo
      const encodedInstruction = await encodeCustomInstruction(customInstructions, walletId);
      const instructionFee = await getCustomInstructionFee(encodedInstruction);
      console.log('Encoded instruction:', encodedInstruction);
      console.log('Instruction fee:', instructionFee, 'XRP');

      // Sign and send the custom instruction payment
      setStep('signing_swap');
      const swapHash = await sendInstructionPayment(
        operatorAddresses[0],
        instructionFee,
        encodedInstruction
      );
      setTxHashes((prev) => ({ ...prev, swap: swapHash }));
      console.log('Custom instruction tx:', swapHash);

      // Wait for CustomInstructionExecuted event (takes ~80-160 seconds)
      setStep('waiting_swap');
      console.log('Waiting for CustomInstructionExecuted event (may take 2-3 minutes)...');

      const result = await watchForCustomInstructionExecuted(
        personalAccountAddress as `0x${string}`,
        encodedInstruction,
        240000 // 4 minute timeout
      );

      if (!result.success) {
        throw new Error('Timeout waiting for swap execution. The operator may be processing other transactions.');
      }

      console.log('🎉 Swap and deposit completed successfully!');

      await refreshBalances();
      setReceivedShares('Vault shares received!');
      setStep('complete');

      // Notify parent to refresh its state
      onDepositComplete?.();

    } catch (err) {
      console.error('Deposit error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    }
  }, [
    personalAccountAddress,
    operatorAddresses,
    agentVaults,
    amount,
    watchForCollateralReserved,
    watchForMintingExecuted,
    refreshBalances,
    onDepositComplete,
  ]);

  const isProcessing = step !== 'idle' && step !== 'complete' && step !== 'error';
  const xrpAmount = amount ? parseFloat(amount) : 0;
  const estimatedXrpNeeded = xrpAmount * 1.05; // XRP amount + ~5% buffer for fees
  const hasEnoughXrp = xrpBalance ? parseFloat(xrpBalance) >= estimatedXrpNeeded : false;
  const canDeposit =
    isConnected &&
    personalAccountAddress &&
    operatorAddresses.length > 0 &&
    agentVaults.length > 0 &&
    amount &&
    xrpAmount >= 10 && // Minimum 10 XRP
    hasEnoughXrp &&
    !isProcessing;

  const handleConnect = () => {
    clearError();
    connect();
  };

  const resetFlow = () => {
    setStep('idle');
    setAmount('');
    setTxHashes({});
    setError(undefined);
    setReceivedShares(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header with wallet connection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-primary/60" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
            Deposit XRP
          </span>
        </div>
        <CrossmarkConnect
          isInstalled={isInstalled}
          isConnected={isConnected}
          isConnecting={isConnecting}
          address={xrplAddress}
          balance={xrpBalance}
          error={crossmarkError}
          onConnect={handleConnect}
          onDisconnect={disconnect}
        />
      </div>

      {/* Operator/Agent Status Warning */}
      {isConnected && operatorAddresses.length === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-400">
            <span className="font-bold">No operator available.</span> The Smart Account operator may not be running on this testnet.
          </div>
        </div>
      )}

      {isConnected && agentVaults.length === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-400">
            <span className="font-bold">No agent vaults available.</span> Cannot mint FXRP without an agent vault.
          </div>
        </div>
      )}

      {/* Account Info - Compact */}
      {isConnected && personalAccountAddress && (
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
          <span className="text-xs text-white/40">
            Flare Account: <span className="font-mono text-white/60">{personalAccountAddress.slice(0, 6)}...{personalAccountAddress.slice(-4)}</span>
          </span>
          <span className="text-sm font-display font-bold text-white">
            {isLoadingAccount ? '...' : `${parseFloat(formattedVaultBalance).toFixed(2)} bfLP`}
          </span>
        </div>
      )}

      {/* Amount Input */}
      {isConnected && (
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 mb-2">
            Amount (XRP)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              className="w-full bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3.5 text-xl font-mono text-white placeholder:text-white/15 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all pr-20"
              disabled={isProcessing}
            />
            <button
              onClick={() => {
                if (xrpBalance) {
                  const maxAmount = Math.max(0, parseFloat(xrpBalance) - 5); // Keep 5 XRP for fees
                  setAmount(maxAmount.toFixed(2));
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.15em] font-bold text-primary hover:text-primary/80 transition-colors"
            >
              MAX
            </button>
          </div>
          <div className="text-xs text-white/30 mt-2 font-mono">
            Balance: {xrpBalance ?? '0'} XRP
          </div>
          {amount && xrpAmount >= 10 && !hasEnoughXrp && (
            <div className="text-xs text-red-400 mt-2">
              Insufficient XRP. Need ~{estimatedXrpNeeded.toFixed(1)} XRP (including fees)
            </div>
          )}
          {amount && xrpAmount > 0 && xrpAmount < 10 && (
            <div className="text-xs text-yellow-400 mt-2">
              Minimum deposit is 10 XRP
            </div>
          )}
        </div>
      )}


      {/* Deposit Button */}
      {isConnected && (
        <button
          onClick={handleDeposit}
          disabled={!canDeposit}
          className={cn(
            "w-full py-4 rounded-lg font-display font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed",
            canDeposit
              ? 'bg-green-500 text-white hover:bg-green-500/80 shadow-[0_0_25px_rgba(34,197,94,0.15)]'
              : 'bg-white/[0.03] border border-white/5 text-white/40'
          )}
        >
          {isProcessing ? 'Processing...' : 'Deposit XRP'}
        </button>
      )}

      {/* Progress */}
      <DepositProgress
        currentStep={step}
        txHashes={txHashes}
        error={error}
        shares={receivedShares}
      />

      {/* Reset button after completion/error */}
      {(step === 'complete' || step === 'error') && (
        <button
          onClick={resetFlow}
          className="w-full py-3 rounded-lg bg-white/[0.03] border border-white/5 text-white/60 font-display font-bold text-sm uppercase tracking-wide hover:border-white/10 hover:text-white transition-all"
        >
          Make Another Deposit
        </button>
      )}

      {/* Info Box - Compact */}
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
        <Info className="w-3 h-3 text-white/20 shrink-0" />
        <span className="text-[10px] text-white/30">
          Requires 2 wallet signatures. FXRP minted to your Flare Smart Account.
        </span>
      </div>
    </div>
  );
}
