"use client";

import { cn } from "@/lib/utils";

type StatusVariant = "live" | "pending" | "resolved" | "won" | "lost";

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  live: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-white/5 text-white/40 border-white/10",
  won: "bg-green-500/15 text-green-400 border-green-500/25",
  lost: "bg-red-500/15 text-red-400 border-red-500/25",
};

const defaultLabels: Record<StatusVariant, string> = {
  live: "LIVE",
  pending: "AWAITING",
  resolved: "RESOLVED",
  won: "YES WON",
  lost: "NO WON",
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-2.5 py-1 border",
        "text-[10px] uppercase tracking-[0.15em] font-bold",
        "font-display",
        variantStyles[variant],
        className
      )}
    >
      {variant === "live" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
        </span>
      )}
      {label ?? defaultLabels[variant]}
    </span>
  );
}

