"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Trophy, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { Market } from "@/config/contracts";

export interface MarketPosition {
  market: Market;
  yesBalance: number;
  noBalance: number;
  yesPrice: number;
  noPrice: number;
  resolved: boolean;
  yesValue: number;
  noValue: number;
  yesPositionId: bigint;
  noPositionId: bigint;
  yesWon: boolean | null;
}

interface PositionCardProps {
  position: MarketPosition;
  onResolve: () => void;
  onRedeem: () => void;
  isResolving: boolean;
  isRedeeming: boolean;
  index?: number;
}

export function PositionCard({
  position,
  onResolve,
  onRedeem,
  isResolving,
  isRedeeming,
  index = 0,
}: PositionCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= position.market.resolutionTime;
  const canResolve = isPastResolution && !position.resolved;

  const hasWinningPosition =
    position.resolved &&
    position.yesWon !== null &&
    ((position.yesWon && position.yesBalance > 0) ||
      (!position.yesWon && position.noBalance > 0));
  const redeemableAmount =
    position.resolved && position.yesWon !== null
      ? position.yesWon
        ? position.yesBalance
        : position.noBalance
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative overflow-hidden rounded-lg bg-card/80 backdrop-blur-md border border-white/5 hover:border-primary/30 transition-colors duration-300"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30 font-display">
                {position.market.category}
              </span>
              {position.resolved ? (
                position.yesWon !== null && (
                  <StatusBadge variant={position.yesWon ? "won" : "lost"} />
                )
              ) : canResolve ? (
                <StatusBadge variant="pending" label="AWAITING RESOLUTION" />
              ) : (
                <StatusBadge variant="live" label="ACTIVE" />
              )}
            </div>

            <Link
              href={`/markets/${position.market.slug}`}
              className="block text-lg font-display font-bold text-white uppercase tracking-tighter leading-tight hover:text-primary transition-colors mb-1.5"
            >
              {position.market.title}
            </Link>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {position.resolved
                ? "Resolved"
                : isPastResolution
                ? `Resolution time passed — ${new Date(position.market.resolutionTime * 1000).toLocaleString()}`
                : `Resolves ${new Date(position.market.resolutionTime * 1000).toLocaleString()}`}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            {position.resolved ? (
              hasWinningPosition && (
                <button
                  onClick={onRedeem}
                  disabled={isRedeeming}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-sm font-display font-bold uppercase tracking-wide rounded-lg hover:bg-green-500/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                >
                  {isRedeeming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trophy className="w-4 h-4" />
                  )}
                  {isRedeeming
                    ? "Redeeming..."
                    : `Redeem $${redeemableAmount.toFixed(2)}`}
                </button>
              )
            ) : canResolve ? (
              <button
                onClick={onResolve}
                disabled={isResolving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-display font-bold uppercase tracking-wide rounded-lg hover:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(237,126,39,0.2)]"
              >
                {isResolving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isResolving ? "Resolving..." : "Resolve Market"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {position.yesBalance > 0 && (
            <div
              className={cn(
                "p-4 rounded-lg border transition-all",
                position.resolved
                  ? position.yesWon
                    ? "bg-green-500/10 border-green-500/25"
                    : "bg-white/[0.02] border-white/5 opacity-50"
                  : "bg-green-500/5 border-green-500/15"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      position.resolved && !position.yesWon
                        ? "bg-white/5"
                        : "bg-green-500/15"
                    )}
                  >
                    {position.resolved ? (
                      position.yesWon ? (
                        <Trophy className="w-3 h-3 text-green-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-white/30" />
                      )
                    ) : (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-display font-bold text-sm uppercase tracking-wide",
                      position.resolved && !position.yesWon
                        ? "text-white/30"
                        : "text-green-400"
                    )}
                  >
                    YES{" "}
                    {position.resolved &&
                      (position.yesWon ? "(Winner)" : "(Lost)")}
                  </span>
                </div>
                {!position.resolved && (
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30 font-mono">
                    @ {(position.yesPrice * 100).toFixed(0)}¢
                  </span>
                )}
              </div>

              <div className="text-2xl font-mono font-bold text-white mb-0.5">
                {position.yesBalance.toFixed(2)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
                Shares
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                {position.resolved ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30">
                      Payout
                    </span>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        position.yesWon
                          ? "text-green-400"
                          : "text-white/20"
                      )}
                    >
                      $
                      {position.yesWon
                        ? position.yesBalance.toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30">
                        Value
                      </span>
                      <span className="font-mono font-medium text-white">
                        ${position.yesValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30">
                        If YES wins
                      </span>
                      <span className="font-mono font-medium text-green-400">
                        ${position.yesBalance.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {position.noBalance > 0 && (
            <div
              className={cn(
                "p-4 rounded-lg border transition-all",
                position.resolved
                  ? !position.yesWon
                    ? "bg-red-500/10 border-red-500/25"
                    : "bg-white/[0.02] border-white/5 opacity-50"
                  : "bg-red-500/5 border-red-500/15"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      position.resolved && position.yesWon
                        ? "bg-white/5"
                        : "bg-red-500/15"
                    )}
                  >
                    {position.resolved ? (
                      !position.yesWon ? (
                        <Trophy className="w-3 h-3 text-red-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-white/30" />
                      )
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-display font-bold text-sm uppercase tracking-wide",
                      position.resolved && position.yesWon
                        ? "text-white/30"
                        : "text-red-400"
                    )}
                  >
                    NO{" "}
                    {position.resolved &&
                      (!position.yesWon ? "(Winner)" : "(Lost)")}
                  </span>
                </div>
                {!position.resolved && (
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30 font-mono">
                    @ {(position.noPrice * 100).toFixed(0)}¢
                  </span>
                )}
              </div>

              <div className="text-2xl font-mono font-bold text-white mb-0.5">
                {position.noBalance.toFixed(2)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
                Shares
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                {position.resolved ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30">
                      Payout
                    </span>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        !position.yesWon
                          ? "text-red-400"
                          : "text-white/20"
                      )}
                    >
                      $
                      {!position.yesWon
                        ? position.noBalance.toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30">
                        Value
                      </span>
                      <span className="font-mono font-medium text-white">
                        ${position.noValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30">
                        If NO wins
                      </span>
                      <span className="font-mono font-medium text-red-400">
                        ${position.noBalance.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-[2px] w-full bg-primary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
    </motion.div>
  );
}

