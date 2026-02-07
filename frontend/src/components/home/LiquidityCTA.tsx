"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Droplets, ArrowRight, Check } from "lucide-react";

const FEATURES = ["Instant deposits", "No lock-up", "Auto-compounding"];

export function LiquidityCTA() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mt-12"
    >
      <div className="relative overflow-hidden border border-white/5 bg-card/60 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/[0.04] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-green-500/[0.03] rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 p-8">
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-3 justify-center sm:justify-start mb-3">
              <div className="w-10 h-10 flex items-center justify-center bg-primary/10 border border-primary/20">
                <Droplets className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight">
                Provide Liquidity
              </h3>
            </div>
            <p className="text-muted-foreground font-light mb-4">
              Earn{" "}
              <span className="text-green-400 font-semibold">0.2% fees</span>{" "}
              on every trade across all markets
            </p>
            <div className="flex items-center gap-4 text-xs text-white/30 justify-center sm:justify-start">
              {FEATURES.map((f) => (
                <span key={f} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-primary/50" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          <Link
            href="/liquidity"
            className="group flex items-center gap-2 px-8 py-4 bg-primary text-white font-display font-bold uppercase tracking-wide text-sm hover:bg-primary/90 transition-all shadow-[0_0_25px_rgba(237,126,39,0.2)] hover:shadow-[0_0_35px_rgba(237,126,39,0.3)] whitespace-nowrap"
          >
            Add Liquidity
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="h-[2px] w-full bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
      </div>
    </motion.section>
  );
}

