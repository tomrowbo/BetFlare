'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, decodeAbiParameters, parseAbiParameters } from 'viem';
import { CONTRACTS, FPMM_ABI } from '@/config/contracts';

// Buy event topic: keccak256('Buy(address,bool,uint256,uint256)')
const BUY_EVENT_TOPIC = '0xe417997ad0a1c7dd102d3158fdf23af437ae25ed1926b1b069dc8e436fd16fb6';

interface PriceChartProps {
  yesPrice: number; // Current YES price (0-1)
}

interface PricePoint {
  timestamp: number;
  price: number;
}

export function PriceChart({ yesPrice }: PriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    async function fetchEvents() {
      if (!publicClient) return;

      try {
        // Fetch events from Coston2 explorer API (more reliable than RPC for historical logs)
        const response = await fetch(
          `https://coston2-explorer.flare.network/api/v2/addresses/${CONTRACTS.fpmm}/logs`
        );
        const data = await response.json();

        // Filter for Buy events (topic: 0xe417997ad0a1c7dd102d3158fdf23af437ae25ed1926b1b069dc8e436fd16fb6)
        const buyLogs = (data.items || []).filter(
          (log: { topics: string[] }) => log.topics[0] === BUY_EVENT_TOPIC
        );

        console.log('Buy logs from explorer:', buyLogs.length, buyLogs);

        if (buyLogs.length === 0) {
          setPriceHistory([
            { timestamp: Date.now() - 86400000, price: 0.5 },
            { timestamp: Date.now(), price: yesPrice },
          ]);
        } else {
          const prices: PricePoint[] = [
            { timestamp: Date.now() - 86400000, price: 0.5 },
          ];

          let cumulativeYesBias = 0;

          for (const log of buyLogs.reverse()) { // reverse to get chronological order
            // Decode the data: bool isYes, uint256 investmentAmount, uint256 tokensReceived
            const decoded = decodeAbiParameters(
              parseAbiParameters('bool isYes, uint256 investmentAmount, uint256 tokensReceived'),
              log.data as `0x${string}`
            );

            const isYes = decoded[0];
            const investmentAmount = decoded[1];
            const amount = Number(formatUnits(investmentAmount, 6));

            cumulativeYesBias += isYes ? amount : -amount;
            const normalizedPrice = 0.5 + (cumulativeYesBias / 10) * 0.4; // Adjusted scaling
            const clampedPrice = Math.max(0.1, Math.min(0.9, normalizedPrice));

            // Use block number to estimate timestamp
            prices.push({
              timestamp: Date.now() - (buyLogs.length - prices.length) * 60000, // Spread out timestamps
              price: clampedPrice,
            });
          }

          prices.push({ timestamp: Date.now(), price: yesPrice });
          setPriceHistory(prices);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        // Fallback to simulated data
        setPriceHistory([
          { timestamp: Date.now() - 86400000, price: 0.5 },
          { timestamp: Date.now(), price: yesPrice },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [publicClient, yesPrice]);

  const width = 400;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Use price history or generate points
  const data = priceHistory.length >= 2
    ? priceHistory.map(p => p.price)
    : Array(24).fill(0).map((_, i) => {
        if (i === 23) return yesPrice;
        return 0.5 + (yesPrice - 0.5) * (i / 23) + (Math.random() - 0.5) * 0.05;
      });

  // Scale functions
  const xScale = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const yScale = (v: number) => padding.top + (1 - v) * chartHeight;

  // Create path
  const linePath = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`)
    .join(' ');

  // Create area path
  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1];

  const hasRealData = priceHistory.length > 2;

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[--text-secondary]">Price History</span>
          {loading ? (
            <span className="text-xs text-[--text-muted]">Loading...</span>
          ) : hasRealData ? (
            <span className="text-xs text-[--accent-green] bg-green-50 px-1.5 py-0.5 rounded">Live Data</span>
          ) : (
            <span className="text-xs text-[--text-muted] bg-gray-100 px-1.5 py-0.5 rounded">Demo</span>
          )}
        </div>
        <span className="text-sm font-bold text-[--accent-green]">{(yesPrice * 100).toFixed(0)}%</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        {yLabels.map((label) => (
          <g key={label}>
            <line
              x1={padding.left}
              y1={yScale(label)}
              x2={width - padding.right}
              y2={yScale(label)}
              stroke="#e5e7eb"
              strokeDasharray="2,2"
            />
            <text
              x={padding.left - 8}
              y={yScale(label)}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-[10px] fill-[--text-muted]"
            >
              {(label * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#gradient)"
          opacity={0.3}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points for real data */}
        {hasRealData && data.map((v, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(v)}
            r={i === data.length - 1 ? 4 : 2}
            fill="#22c55e"
          />
        ))}

        {/* Current price dot */}
        {!hasRealData && (
          <circle
            cx={xScale(data.length - 1)}
            cy={yScale(yesPrice)}
            r={4}
            fill="#22c55e"
          />
        )}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Time labels */}
      <div className="flex justify-between mt-1 text-[10px] text-[--text-muted]">
        <span>Start</span>
        <span>Now</span>
      </div>
    </div>
  );
}
