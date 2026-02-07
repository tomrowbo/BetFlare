"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Market } from "@/config/contracts";

export interface RedeemedPosition {
  market: Market;
  payout: number;
  yesWon: boolean;
  txHash: string;
  blockNumber: number;
}

interface RedeemedHistoryCardProps {
  item: RedeemedPosition;
  index?: number;
}

export function RedeemedHistoryCard({
  item,
  index = 0,
}: RedeemedHistoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative overflow-hidden rounded-lg bg-card/50 backdrop-blur-md border border-white/5 hover:border-primary/20 transition-colors duration-300"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>

          <div className="min-w-0">
            <Link
              href={`/markets/${item.market.slug}`}
              className="block text-sm font-display font-bold text-white uppercase tracking-tight leading-tight hover:text-primary transition-colors truncate"
            >
              {item.market.title}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge variant={item.yesWon ? "won" : "lost"} />
              <span className="text-white/10">•</span>
              <a
                href={`https://coston2-explorer.flare.network/tx/${item.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-bold text-primary/70 hover:text-primary transition-colors"
              >
                View tx
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 ml-4">
          <div className="text-lg font-mono font-bold text-green-400">
            +${item.payout.toFixed(2)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
            Redeemed
          </div>
        </div>
      </div>

      <div className="h-[2px] w-full bg-green-500/40 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
    </motion.div>
  );
}

