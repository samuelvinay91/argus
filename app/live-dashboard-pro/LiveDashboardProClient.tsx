'use client';

import dynamic from 'next/dynamic';

const DataMeshNetwork = dynamic(() => import('@/components/visual/pro/DataMeshNetwork'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-[#050505]">
      <div className="animate-pulse text-white/40 text-sm">Loading mesh…</div>
    </div>
  ),
});

export default function LiveDashboardProClient() {
  return (
    <div className="flex-1 w-full h-full relative">
      <DataMeshNetwork />
    </div>
  );
}
