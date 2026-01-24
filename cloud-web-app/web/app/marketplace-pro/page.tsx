'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import to avoid SSR issues with complex component
const MarketplaceBrowser = dynamic(
  () => import('@/components/marketplace/MarketplaceBrowser'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white text-xl animate-pulse">
          Loading Marketplace Browser...
        </div>
      </div>
    ),
  }
);

export default function MarketplaceBrowserPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-black"><span className="text-white">Loading...</span></div>}>
      <MarketplaceBrowser />
    </Suspense>
  );
}
