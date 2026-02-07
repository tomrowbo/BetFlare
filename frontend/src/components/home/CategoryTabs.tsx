"use client";

import { TrendingUp, Landmark, Globe, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  All: LayoutGrid,
  Price: TrendingUp,
  DeFi: Landmark,
  Ecosystem: Globe,
} as const;

interface CategoryTabsProps {
  categories: readonly string[];
  active: string;
  onChange: (category: string) => void;
}

export function CategoryTabs({
  categories,
  active,
  onChange,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] ?? LayoutGrid;
        const isActive = active === cat;

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-display font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all duration-200",
              "border",
              isActive
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card/40 text-white/30 border-white/5 hover:text-white/60 hover:border-white/10"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {cat}
          </button>
        );
      })}
    </div>
  );
}

