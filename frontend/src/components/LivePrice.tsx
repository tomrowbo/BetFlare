'use client';

import { useEffect, useState } from 'react';

export function LivePrice() {
  const [price, setPrice] = useState(2.48);
  const [change, setChange] = useState(0.05);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate live price updates (in production, fetch from CoinGecko or FTSO)
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
    <div className="card card-glow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* XRP Price */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <span className="text-2xl">⟐</span>
            </div>
            <div>
              <div className="text-sm text-[--text-secondary]">XRP/USD</div>
              <div className="text-3xl font-bold price-ticker">
                ${price.toFixed(4)}
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isPositive
              ? 'bg-[--accent-green]/20 text-[--accent-green]'
              : 'bg-[--accent-red]/20 text-[--accent-red]'
          }`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change * 100).toFixed(2)}%
          </div>
        </div>

        {/* Market Target */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-sm text-[--text-secondary]">Target Price</div>
            <div className="text-2xl font-bold text-[--accent-orange]">$3.00</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-[--text-secondary]">Distance</div>
            <div className="text-2xl font-bold">
              {((3.00 - price) / price * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center hidden sm:block">
            <div className="text-sm text-[--text-secondary]">Updated</div>
            <div className="text-lg font-medium text-[--text-secondary]">
              {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
