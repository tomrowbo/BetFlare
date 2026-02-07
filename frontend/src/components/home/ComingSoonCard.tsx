"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComingSoonCardProps {
  title: string;
  resolutionDate: string;
  category: string;
}

export function ComingSoonCard({
  title,
  resolutionDate,
  category,
}: ComingSoonCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "bg-card/30 backdrop-blur-sm border border-white/[0.03]",
        "opacity-40 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-white/60 truncate">
            {title}
          </h3>
          <div className="text-xs text-muted-foreground mt-0.5">
            <span className="text-primary/40">{category}</span>
            <span className="mx-1.5 text-white/5">·</span>
            {resolutionDate}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 border border-white/5 bg-white/[0.02]">
          <Lock className="w-3 h-3 text-white/20" />
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/25 font-display">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}

