'use client';

import dynamic from 'next/dynamic';

const SolarSystem = dynamic(() => import('@/components/visual/SolarSystem'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-black">
      <div className="animate-pulse text-muted-foreground text-sm">Loading visualization…</div>
    </div>
  ),
});

export default function LiveDashboardClient() {
  return (
    <div className="flex-1 w-full h-full relative">
      <SolarSystem />
    </div>
  );
}
