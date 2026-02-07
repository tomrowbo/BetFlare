'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, decodeAbiParameters, parseAbiParameters } from 'viem';
import { FPMM_ABI } from '@/config/contracts';
import { Activity } from 'lucide-react';

const BUY_EVENT_TOPIC = '0xe417997ad0a1c7dd102d3158fdf23af437ae25ed1926b1b069dc8e436fd16fb6';

interface PriceChartProps {
  yesPrice: number;
  fpmmAddress: string;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

export function PriceChart({ yesPrice, fpmmAddress }: PriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    async function fetchEvents() {
      if (!publicClient) return;

      try {
        const response = await fetch(
          `https://coston2-explorer.flare.network/api/v2/addresses/${fpmmAddress}/logs`
        );
        const data = await response.json();

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

          for (const log of buyLogs.reverse()) {
            const decoded = decodeAbiParameters(
              parseAbiParameters('bool isYes, uint256 investmentAmount, uint256 tokensReceived'),
              log.data as `0x${string}`
            );

            const isYes = decoded[0];
            const investmentAmount = decoded[1];
            const amount = Number(formatUnits(investmentAmount, 6));

            cumulativeYesBias += isYes ? amount : -amount;
            const normalizedPrice = 0.5 + (cumulativeYesBias / 10) * 0.4;
            const clampedPrice = Math.max(0.1, Math.min(0.9, normalizedPrice));

            prices.push({
              timestamp: Date.now() - (buyLogs.length - prices.length) * 60000,
              price: clampedPrice,
            });
          }

          prices.push({ timestamp: Date.now(), price: yesPrice });
          setPriceHistory(prices);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setPriceHistory([
          { timestamp: Date.now() - 86400000, price: 0.5 },
          { timestamp: Date.now(), price: yesPrice },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [publicClient, yesPrice, fpmmAddress]);

  const width = 400;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const data = priceHistory.length >= 2
    ? priceHistory.map(p => p.price)
    : Array(24).fill(0).map((_, i) => {
        if (i === 23) return yesPrice;
        return 0.5 + (yesPrice - 0.5) * (i / 23) + (Math.random() - 0.5) * 0.05;
      });

  const xScale = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const yScale = (v: number) => padding.top + (1 - v) * chartHeight;

  const linePath = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`)
    .join(' ');

  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;

  const yLabels = [0, 0.25, 0.5, 0.75, 1];

  const hasRealData = priceHistory.length > 2;

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground font-display">
            Price History
          </span>
          {loading ? (
            <span className="text-[10px] text-muted-foreground animate-pulse">Loading...</span>
          ) : hasRealData ? (
            <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 font-bold uppercase tracking-wider">
              Live
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground bg-white/5 border border-white/10 px-1.5 py-0.5 font-bold uppercase tracking-wider">
              Demo
            </span>
          )}
        </div>
        <span className="text-sm font-bold font-mono text-primary">{(yesPrice * 100).toFixed(0)}%</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {yLabels.map((label) => (
          <g key={label}>
            <line
              x1={padding.left}
              y1={yScale(label)}
              x2={width - padding.right}
              y2={yScale(label)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="2,2"
            />
            <text
              x={padding.left - 8}
              y={yScale(label)}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-[10px]"
              fill="rgba(255,255,255,0.3)"
            >
              {(label * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        <path
          d={areaPath}
          fill="url(#chartGradient)"
          opacity={0.3}
        />

        <path
          d={linePath}
          fill="none"
          stroke="hsl(26 85% 54%)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hasRealData && data.map((v, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(v)}
            r={i === data.length - 1 ? 4 : 2}
            fill="hsl(26 85% 54%)"
          />
        ))}

        {!hasRealData && (
          <circle
            cx={xScale(data.length - 1)}
            cy={yScale(yesPrice)}
            r={4}
            fill="hsl(26 85% 54%)"
          />
        )}

        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(26 85% 54%)" />
            <stop offset="100%" stopColor="hsl(26 85% 54%)" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex justify-between mt-1 text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground font-display">
        <span>Start</span>
        <span>Now</span>
      </div>
    </div>
  );
}
