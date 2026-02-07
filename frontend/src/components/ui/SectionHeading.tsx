"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  tag?: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  tag,
  title,
  highlight,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "mb-10",
        align === "center" && "text-center",
        className
      )}
    >
      {tag && (
        <span className="inline-block px-3 py-1 border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-4 tracking-wider uppercase">
          {tag}
        </span>
      )}

      <h2 className="text-3xl md:text-5xl font-display font-bold text-white uppercase tracking-tighter leading-[1.1]">
        {title}
        {highlight && (
          <>
            <br />
            <span className="text-primary">{highlight}</span>
          </>
        )}
      </h2>

      {description && (
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl font-light leading-relaxed mt-4 mx-auto">
          {description}
        </p>
      )}
    </motion.div>
  );
}

