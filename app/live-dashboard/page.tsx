import React from 'react';
import { Metadata } from 'next';
import LiveDashboardClient from './LiveDashboardClient';

export const metadata: Metadata = {
    title: 'Live Agent Ecosystem | Skopaq',
    description: 'Real-time 3D visualization of the Skopaq agent ecosystem.',
};

export default function LiveDashboardPage() {
    return (
        <div className="flex flex-col h-screen w-full bg-black overflow-hidden relative">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[hsl(173,80%,40%)] to-[hsl(185,85%,50%)] drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                        Skopaq System Core
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-md text-sm">
                        Live visualization of autonomous agents and their interconnections.
                        Real-time telemetry monitoring active.
                    </p>
                </div>

                <div className="flex gap-4 pointer-events-auto">
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-4 text-center min-w-[100px]">
                        <div className="text-2xl font-bold text-white">5</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-widest">Active Agents</div>
                    </div>
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-4 text-center min-w-[100px]">
                        <div className="text-2xl font-bold text-[hsl(160,84%,39%)]">98%</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-widest">System Health</div>
                    </div>
                </div>
            </div>

            {/* 3D Scene */}
            <LiveDashboardClient />
        </div>
    );
}
