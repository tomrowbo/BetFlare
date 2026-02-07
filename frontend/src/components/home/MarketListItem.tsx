"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { Market } from "@/config/contracts";

interface MarketListItemProps {
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

export function MarketListItem({
  market,
  yesPrice,
  volume,
  resolved,
}: MarketListItemProps) {
  const now = Math.floor(Date.now() / 1000);
  const isPastResolution = now >= market.resolutionTime;

  return (
    <Link href={`/markets/${market.slug}`} className="block">
      <motion.div
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "group relative overflow-hidden",
          "bg-card/60 backdrop-blur-sm border border-white/5",
          "hover:border-primary/20 transition-colors duration-300",
          "cursor-pointer",
          resolved && "opacity-50"
        )}
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-white group-hover:text-primary transition-colors truncate">
              {market.title}
            </h3>
            <div className="text-xs text-muted-foreground mt-0.5">
              <span className="text-primary/70">{market.category}</span>
              <span className="mx-1.5 text-white/10">·</span>
              {resolved
                ? "Resolved"
                : isPastResolution
                ? "Awaiting Resolution"
                : new Date(market.resolutionTime * 1000).toLocaleString()}
              <span className="mx-1.5 text-white/10">·</span>
              <span className="font-mono">Vol: ${volume.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[0.15em] text-white/25 font-bold">
                YES
              </div>
              <div className="font-mono font-bold text-green-400 text-sm">
                {(yesPrice * 100).toFixed(0)}¢
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[0.15em] text-white/25 font-bold">
                NO
              </div>
              <div className="font-mono font-bold text-red-400 text-sm">
                {((1 - yesPrice) * 100).toFixed(0)}¢
              </div>
            </div>

            <StatusBadge variant={getStatusVariant(resolved, isPastResolution)} />

            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary/50 transition-colors" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-px bg-primary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
      </motion.div>
    </Link>
  );
}

