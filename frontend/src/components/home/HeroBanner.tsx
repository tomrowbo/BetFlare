"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp } from "lucide-react";

interface HeroBannerProps {
  tvl: number;
  marketCount: number;
  isLoading: boolean;
}

export function HeroBanner({ tvl, marketCount, isLoading }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[100px]" />

      <div className="relative max-w-5xl mx-auto px-4 py-14 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white uppercase tracking-tighter leading-[0.95] mb-4">
            Predict. Trade.{" "}
            <span className="text-primary">Win.</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg font-light max-w-xl mx-auto mb-10">
            Decentralized prediction markets powered by Flare FTSO oracle feeds
          </p>

          <div className="flex items-center justify-center gap-8 md:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary/60" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
                  TVL
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white">
                {isLoading ? (
                  <span className="inline-block w-20 h-8 bg-white/5 rounded animate-pulse" />
                ) : (
                  `$${tvl.toFixed(2)}`
                )}
              </div>
            </motion.div>

            <div className="w-px h-12 bg-white/10" />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-primary/60" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
                  Markets
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-white">
                {marketCount}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

