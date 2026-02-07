"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Clock, BarChart3 } from "lucide-react";
import { MiniPriceChart } from "@/components/MiniPriceChart";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { Market } from "@/config/contracts";

interface FeaturedMarketCardProps {
  market: Market;
  yesPrice: number;
  volume: number;
  resolved: boolean;
}

function getStatusVariant(resolved: boolean, isPastResolution: boolean) {
  if (resolved) return "resolved" as const;
  if (isPastResolution) return "pending" as const;
  return "live" as const;
}

export function FeaturedMarketCard({
  market,
  yesPrice,
  volume,
  resolved,
}: FeaturedMarketCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= market.resolutionTime;
  const yesPercent = Math.round(yesPrice * 100);

  return (
    <Link href={`/markets/${market.slug}`} className="block">
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="group relative overflow-hidden bg-card/80 backdrop-blur-md border border-white/5 hover:border-primary/30 transition-colors duration-300 cursor-pointer"
      >
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-5 h-5 text-primary" />
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30 font-display">
                  {market.category}
                </span>
                <StatusBadge variant={getStatusVariant(resolved, isPastResolution)} />
              </div>

              <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-1 leading-tight uppercase tracking-tighter group-hover:text-primary transition-colors">
                {market.title}
              </h3>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-5">
                <Clock className="w-3 h-3" />
                {resolved
                  ? "Resolved"
                  : isPastResolution
                  ? "Awaiting Resolution"
                  : `Resolves ${new Date(market.resolutionTime * 1000).toLocaleString()}`}
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">
                    Market Sentiment
                  </span>
                  <span className="text-sm font-mono text-primary font-bold">
                    {yesPercent}% YES
                  </span>
                </div>
                <div className="h-0.5 w-full bg-white/5 relative">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${yesPercent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-0 left-0 h-full bg-primary"
                  />
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">
                      YES
                    </div>
                    <div className="text-lg font-mono font-bold text-green-400">
                      {(yesPrice * 100).toFixed(0)}¢
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">
                      NO
                    </div>
                    <div className="text-lg font-mono font-bold text-red-400">
                      {((1 - yesPrice) * 100).toFixed(0)}¢
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" /> Vol
                    </div>
                    <div className="text-lg font-mono font-semibold text-white/60">
                      ${volume.toFixed(2)}
                    </div>
                  </div>
                </div>

                <MiniPriceChart
                  yesPrice={yesPrice}
                  width={128}
                  height={48}
                  fpmmAddress={market.fpmm}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="h-[2px] w-full bg-primary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
      </motion.div>
    </Link>
  );
}

