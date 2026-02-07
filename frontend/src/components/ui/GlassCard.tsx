"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  accentBar?: boolean;
}

export function GlassCard({
  children,
  className,
  hoverEffect = true,
  accentBar = true,
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-lg",
        "bg-card/80 backdrop-blur-md",
        "border border-white/5",
        "hover:border-primary/30 transition-colors duration-300",
        className
      )}
    >
      {children}

      {accentBar && (
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
      )}
    </motion.div>
  );
}
