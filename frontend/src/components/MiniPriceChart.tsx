'use client';

import { useEffect, useState } from 'react';
import { formatUnits, decodeAbiParameters, parseAbiParameters } from 'viem';

const BUY_EVENT_TOPIC = '0xe417997ad0a1c7dd102d3158fdf23af437ae25ed1926b1b069dc8e436fd16fb6';

interface MiniPriceChartProps {
  yesPrice: number;
  height?: number;
  width?: number;
  fpmmAddress: string;
}

export function MiniPriceChart({ yesPrice, height = 48, width = 120, fpmmAddress }: MiniPriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch(
          `https://coston2-explorer.flare.network/api/v2/addresses/${fpmmAddress}/logs`
        );
        const data = await response.json();

        const buyLogs = (data.items || []).filter(
          (log: { topics: string[] }) => log.topics[0] === BUY_EVENT_TOPIC
        );

        if (buyLogs.length === 0) {
          setPriceHistory([0.5, yesPrice]);
        } else {
          const prices: number[] = [0.5];
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
            prices.push(clampedPrice);
          }

          prices.push(yesPrice);
          setPriceHistory(prices);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setPriceHistory([0.5, yesPrice]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [yesPrice, fpmmAddress]);

  const data = priceHistory.length >= 2 ? priceHistory : [0.5, yesPrice];

  const trend = data[data.length - 1] > data[0] ? 'up' : data[data.length - 1] < data[0] ? 'down' : 'neutral';
  const strokeColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : 'rgba(255,255,255,0.3)';

  const chartPadding = 4;
  const chartWidth = width - chartPadding * 2;
  const chartHeight = height - chartPadding * 2;

  const minPrice = Math.min(...data) * 0.95;
  const maxPrice = Math.max(...data) * 1.05;
  const priceRange = maxPrice - minPrice || 0.1;

  const xScale = (i: number) => chartPadding + (i / (data.length - 1)) * chartWidth;
  const yScale = (v: number) => chartPadding + (1 - (v - minPrice) / priceRange) * chartHeight;

  const linePath = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`)
    .join(' ');

  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${height - chartPadding} L ${xScale(0)} ${height - chartPadding} Z`;

  if (loading) {
    return (
      <div style={{ width, height }} className="bg-white/[0.03] rounded animate-pulse" />
    );
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={areaPath}
        fill={strokeColor}
        opacity={0.1}
      />

      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx={xScale(data.length - 1)}
        cy={yScale(data[data.length - 1])}
        r={3}
        fill={strokeColor}
      />
    </svg>
  );
}
