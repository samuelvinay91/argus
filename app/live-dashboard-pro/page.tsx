import React from 'react';
import { Metadata } from 'next';
import LiveDashboardProClient from './LiveDashboardProClient';

export const metadata: Metadata = {
    title: 'Skopaq Neural Mesh',
    description: 'Real-time abstract data mesh visualization.',
};

export default function LiveDashboardProPage() {
    return (
        <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden relative font-sans text-white/90 selection:bg-purple-500/30">

            {/* Minimal Header */}
            <div className="absolute top-0 left-0 w-full p-8 z-10 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">Skopaq Neural Mesh</span>
                    </div>
                    <h1 className="text-2xl font-light tracking-tight text-white">
                        System Overview
                    </h1>
                </div>

                {/* Minimal Metrics - Right Aligned */}
                <div className="flex flex-col gap-1 pointer-events-auto text-right">
                    <div className="group flex items-center justify-end gap-3 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-default">
                        <span className="text-[10px] uppercase tracking-wider text-white/40">Throughput</span>
                        <span className="font-mono text-sm">4.2 TB/s</span>
                    </div>
                    <div className="group flex items-center justify-end gap-3 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-default">
                        <span className="text-[10px] uppercase tracking-wider text-white/40">Latency</span>
                        <span className="font-mono text-sm text-[hsl(160,84%,50%)]">12ms</span>
                    </div>
                    <div className="group flex items-center justify-end gap-3 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-default">
                        <span className="text-[10px] uppercase tracking-wider text-white/40">Active Nodes</span>
                        <span className="font-mono text-sm">124</span>
                    </div>
                </div>
            </div>

            {/* 3D Scene Container */}
            <LiveDashboardProClient />

            {/* Footer / Status Line */}
            <div className="absolute bottom-0 left-0 w-full px-8 py-6 z-10 pointer-events-none flex justify-between items-end border-t border-white/5">
                <div className="flex gap-6 pointer-events-auto">
                    <button className="text-[11px] text-white/40 hover:text-white transition-colors uppercase tracking-widest">Topology</button>
                    <button className="text-[11px] text-white/40 hover:text-white transition-colors uppercase tracking-widest">Logs</button>
                    <button className="text-[11px] text-white/40 hover:text-white transition-colors uppercase tracking-widest">Trace</button>
                </div>
                <div className="bg-white/5 backdrop-blur px-3 py-1 rounded text-[10px] font-mono text-white/30">
                    LIVE_CONNECTION // STABLE
                </div>
            </div>
        </div>
    );
}
