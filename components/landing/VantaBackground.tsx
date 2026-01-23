'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { useTheme } from 'next-themes';

interface VantaBackgroundProps {
  effect?: 'rings' | 'net' | 'waves';
}

export function VantaBackground({
  effect = 'rings',
}: VantaBackgroundProps) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState({ three: false, vanta: false });
  const { resolvedTheme } = useTheme();

  // Theme-aware colors for Vanta
  // Default to dark theme colors during SSR/hydration when resolvedTheme is undefined
  const isDark = resolvedTheme === 'dark' || resolvedTheme === undefined;
  const backgroundColor = isDark ? 0x0a0a0f : 0xf8fafc;
  const color = isDark ? 0x14b8a6 : 0x0d9488;

  const initVanta = useCallback(() => {
    if (!vantaRef.current) return;
    // @ts-expect-error - Vanta.js adds VANTA and THREE to window
    if (!window.VANTA || !window.THREE) return;

    try {
      // @ts-expect-error - Vanta.js RINGS effect
      const VantaEffect = window.VANTA.RINGS;
      if (!VantaEffect) return;

      const effectInstance = VantaEffect({
        el: vantaRef.current,
        // @ts-expect-error - THREE.js global
        THREE: window.THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color: color,
        backgroundColor: backgroundColor,
      });
      setVantaEffect(effectInstance);
    } catch (e) {
      console.error('Vanta init error:', e);
    }
  }, [color, backgroundColor]);

  // Initialize or reinitialize Vanta when scripts are loaded or theme changes
  useEffect(() => {
    if (scriptsLoaded.three && scriptsLoaded.vanta && resolvedTheme !== undefined) {
      // Destroy existing effect before creating a new one
      if (vantaEffect) {
        vantaEffect.destroy();
        setVantaEffect(null);
      }
      // Small delay to ensure cleanup is complete
      const timeoutId = setTimeout(initVanta, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [scriptsLoaded, resolvedTheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
  }, [vantaEffect]);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, three: true }))}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.rings.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, vanta: true }))}
      />
      <div
        ref={vantaRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: isDark ? '#0a0a0f' : '#f8fafc' }}
      />
    </>
  );
}
