'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Address, Log } from 'viem';
import { formatUnits } from 'viem';
import { coston2 } from '@flarenetwork/flare-wagmi-periphery-package';
import {
  getPersonalAccountAddress,
  getOperatorXrplAddresses,
  getAgentVaults,
  getFxrpBalance,
  getVaultBalance,
  convertSharesToAssets,
  getFxrpDecimals,
  publicClient,
  SMART_ACCOUNTS_CONFIG,
  getAssetManagerFXRPAddress,
  type AgentVault,
  type CollateralReservedEvent,
  type MintingExecutedEvent,
} from '@/lib/smart-accounts';

interface SmartAccountState {
  personalAccountAddress: Address | null;
  operatorAddresses: string[];
  agentVaults: AgentVault[];
  fxrpBalance: bigint;
  fxrpDecimals: number;
  vaultBalance: bigint;
  vaultValue: bigint; // USD value of vault shares
  isLoading: boolean;
  error: string | null;
}

interface DepositEvent {
  personalAccount: Address;
  vault: Address;
  amount: bigint;
  shares: bigint;
}

export function useSmartAccount(xrplAddress: string | null) {
  const [state, setState] = useState<SmartAccountState>({
    personalAccountAddress: null,
    operatorAddresses: [],
    agentVaults: [],
    fxrpBalance: 0n,
    fxrpDecimals: 6,
    vaultBalance: 0n,
    vaultValue: 0n,
    isLoading: false,
    error: null,
  });

  const [pendingDeposit, setPendingDeposit] = useState<DepositEvent | null>(null);

  // Fetch smart account data when XRPL address changes
  useEffect(() => {
    if (!xrplAddress) {
      setState((prev) => ({
        ...prev,
        personalAccountAddress: null,
        fxrpBalance: 0n,
        vaultBalance: 0n,
        vaultValue: 0n,
      }));
      return;
    }

    const fetchData = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const [personalAccountAddress, operatorAddresses, agentVaults, fxrpDecimals] = await Promise.all([
          getPersonalAccountAddress(xrplAddress),
          getOperatorXrplAddresses(),
          getAgentVaults(),
          getFxrpDecimals(),
        ]);

        // Get balances for the personal account
        const [fxrpBalance, vaultBalance] = await Promise.all([
          getFxrpBalance(personalAccountAddress),
          getVaultBalance(personalAccountAddress),
        ]);

        // Convert shares to USD value
        const vaultValue = await convertSharesToAssets(vaultBalance);

        setState({
          personalAccountAddress,
          operatorAddresses,
          agentVaults,
          fxrpBalance,
          fxrpDecimals,
          vaultBalance,
          vaultValue,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch smart account data',
        }));
      }
    };

    fetchData();
  }, [xrplAddress]);

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!state.personalAccountAddress) return;

    try {
      const [fxrpBalance, vaultBalance] = await Promise.all([
        getFxrpBalance(state.personalAccountAddress),
        getVaultBalance(state.personalAccountAddress),
      ]);

      // Convert shares to USD value
      const vaultValue = await convertSharesToAssets(vaultBalance);

      setState((prev) => ({ ...prev, fxrpBalance, vaultBalance, vaultValue }));
    } catch (error) {
      console.error('Failed to refresh balances:', error);
    }
  }, [state.personalAccountAddress]);

  // Watch for deposit events
  const watchForDeposit = useCallback(
    async (timeout = 120000): Promise<DepositEvent | null> => {
      if (!state.personalAccountAddress) return null;

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          unwatch();
          resolve(null);
        }, timeout);

        const unwatch = publicClient.watchContractEvent({
          address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
          abi: coston2.iMasterAccountControllerAbi,
          eventName: 'Deposited',
          onLogs: (logs: Log[]) => {
            for (const log of logs) {
              const args = (log as Log & { args: DepositEvent }).args;
              if (
                args.personalAccount.toLowerCase() ===
                state.personalAccountAddress!.toLowerCase()
              ) {
                clearTimeout(timeoutId);
                unwatch();
                setPendingDeposit(args);
                refreshBalances();
                resolve(args);
                return;
              }
            }
          },
        });
      });
    },
    [state.personalAccountAddress, refreshBalances]
  );

  // Watch for custom instruction executed
  const watchForCustomInstruction = useCallback(
    async (callHash: `0x${string}`, timeout = 120000): Promise<boolean> => {
      if (!state.personalAccountAddress) return false;

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          unwatch();
          resolve(false);
        }, timeout);

        const unwatch = publicClient.watchContractEvent({
          address: SMART_ACCOUNTS_CONFIG.MASTER_ACCOUNT_CONTROLLER,
          abi: coston2.iMasterAccountControllerAbi,
          eventName: 'InstructionExecuted',
          onLogs: (logs: Log[]) => {
            for (const log of logs) {
              const args = (log as Log & { args: { personalAccount: Address; callHash: `0x${string}` } }).args;
              if (
                args.personalAccount.toLowerCase() === state.personalAccountAddress!.toLowerCase() &&
                args.callHash.slice(6) === callHash.slice(6)
              ) {
                clearTimeout(timeoutId);
                unwatch();
                refreshBalances();
                resolve(true);
                return;
              }
            }
          },
        });
      });
    },
    [state.personalAccountAddress, refreshBalances]
  );

  // Watch for CollateralReserved event (step 1 of minting)
  const watchForCollateralReserved = useCallback(
    async (timeout = 180000): Promise<CollateralReservedEvent | null> => {
      if (!state.personalAccountAddress) return null;

      return new Promise(async (resolve) => {
        let found = false;
        const startTime = Date.now();

        const assetManagerAddress = await getAssetManagerFXRPAddress();

        const unwatch = publicClient.watchContractEvent({
          address: assetManagerAddress,
          abi: coston2.iAssetManagerAbi,
          eventName: 'CollateralReserved',
          onLogs: (logs) => {
            for (const log of logs) {
              const args = (log as unknown as { args: CollateralReservedEvent }).args;
              if (args.minter?.toLowerCase() === state.personalAccountAddress!.toLowerCase()) {
                found = true;
                unwatch();
                resolve(args);
                return;
              }
            }
          },
        });

        // Poll for timeout
        const checkTimeout = () => {
          if (found) return;
          if (Date.now() - startTime > timeout) {
            unwatch();
            resolve(null);
            return;
          }
          setTimeout(checkTimeout, 5000);
        };
        checkTimeout();
      });
    },
    [state.personalAccountAddress]
  );

  // Watch for MintingExecuted event (step 2 of minting)
  const watchForMintingExecuted = useCallback(
    async (collateralReservationId: bigint, timeout = 180000): Promise<MintingExecutedEvent | null> => {
      return new Promise(async (resolve) => {
        let found = false;
        const startTime = Date.now();

        const assetManagerAddress = await getAssetManagerFXRPAddress();

        const unwatch = publicClient.watchContractEvent({
          address: assetManagerAddress,
          abi: coston2.iAssetManagerAbi,
          eventName: 'MintingExecuted',
          onLogs: (logs) => {
            for (const log of logs) {
              const args = (log as unknown as { args: MintingExecutedEvent }).args;
              if (args.collateralReservationId === collateralReservationId) {
                found = true;
                unwatch();
                refreshBalances();
                resolve(args);
                return;
              }
            }
          },
        });

        // Poll for timeout
        const checkTimeout = () => {
          if (found) return;
          if (Date.now() - startTime > timeout) {
            unwatch();
            resolve(null);
            return;
          }
          setTimeout(checkTimeout, 5000);
        };
        checkTimeout();
      });
    },
    [refreshBalances]
  );

  // Formatted balances
  const formattedFxrpBalance = useMemo(() => {
    return formatUnits(state.fxrpBalance, state.fxrpDecimals);
  }, [state.fxrpBalance, state.fxrpDecimals]);

  const formattedVaultBalance = useMemo(() => {
    return formatUnits(state.vaultBalance, 6); // Vault shares are 6 decimals (same as USDT)
  }, [state.vaultBalance]);

  // USD value of vault shares
  const formattedVaultValue = useMemo(() => {
    return formatUnits(state.vaultValue, 6); // USDT has 6 decimals
  }, [state.vaultValue]);

  return {
    ...state,
    formattedFxrpBalance,
    formattedVaultBalance,
    formattedVaultValue,
    pendingDeposit,
    refreshBalances,
    watchForDeposit,
    watchForCustomInstruction,
    watchForCollateralReserved,
    watchForMintingExecuted,
    clearPendingDeposit: () => setPendingDeposit(null),
  };
}
