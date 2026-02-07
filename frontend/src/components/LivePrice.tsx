'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Target, Ruler, Clock } from 'lucide-react';

export function LivePrice() {
  const [price, setPrice] = useState(2.48);
  const [change, setChange] = useState(0.05);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.5) * 0.02;
      setPrice(prev => {
        const newPrice = prev + delta;
        setChange(delta);
        return Math.max(0.01, newPrice);
      });
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const isPositive = change >= 0;

  return (
    <div className="card p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-2xl">⟐</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display block">
                XRP/USD
              </span>
              <span className="text-3xl font-bold font-mono text-white tracking-tight">
                ${price.toFixed(4)}
              </span>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium font-mono ${
            isPositive
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(change * 100).toFixed(2)}%
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display">
                Target
              </span>
            </div>
            <span className="text-2xl font-bold font-mono text-primary">$3.00</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Ruler className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display">
                Distance
              </span>
            </div>
            <span className="text-2xl font-bold font-mono text-white">
              {((3.00 - price) / price * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-center hidden sm:block">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display">
                Updated
              </span>
            </div>
            <span className="text-lg font-medium font-mono text-muted-foreground">
              {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
