"use client";

import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const maxWidthMap = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
};

export function PageContainer({
  children,
  maxWidth = "lg",
  className,
}: PageContainerProps) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div
        className={cn(
          "relative z-10 mx-auto px-4 py-8",
          maxWidthMap[maxWidth],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

