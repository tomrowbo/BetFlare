'use client';

import { useAccount } from 'wagmi';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { MarketCard } from '@/components/MarketCard';
import { BetSlip } from '@/components/BetSlip';
import { PositionView } from '@/components/PositionView';

// Market data - in production this would come from a database/contract
const MARKETS: Record<string, { title: string; description: string; resolutionDate: string }> = {
  'xrp-above-3': {
    title: 'Will XRP be above $3.00?',
    description: 'Resolves YES if XRP/USD price is above $3.00 at resolution time according to Flare FTSO.',
    resolutionDate: 'Feb 7, 2026 at 7:00 PM UTC',
  },
};

export default function MarketPage() {
  const { isConnected } = useAccount();
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const params = useParams();
  const slug = params.slug as string;

  const market = MARKETS[slug];

  if (!market) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Market Not Found</h1>
            <Link href="/" className="text-[--accent-blue] hover:underline">
              ← Back to markets
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="text-sm text-[--accent-blue] hover:underline mb-4 inline-flex items-center gap-1"
        >
          ← Back to markets
        </Link>

        {/* Market Detail View */}
        <div className="grid lg:grid-cols-3 gap-6 mt-4">
          <div className="lg:col-span-2">
            <MarketCard
              selectedSide={selectedSide}
              onSelectSide={setSelectedSide}
            />
          </div>
          <div className="space-y-4">
            <BetSlip
              side={selectedSide}
              disabled={!isConnected}
            />
            <PositionView />
          </div>
        </div>
      </div>
    </main>
  );
}
