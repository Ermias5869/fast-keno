'use client';

import dynamic from 'next/dynamic';

const KenoGame = dynamic(() => import('@/app/components/KenoGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
      <div className="text-center">
        <div className="flex flex-col items-center gap-2 mb-4">
          <span className="text-lg font-black tracking-tighter italic" style={{ color: '#fbbf24' }}>FAST</span>
          <span className="text-3xl font-black tracking-tighter italic" style={{ color: '#4ade80' }}>KENO</span>
        </div>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#4ade80', borderTopColor: 'transparent' }} />
        <p className="text-sm mt-3" style={{ color: '#8b949e' }}>Loading game...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <KenoGame />;
}
