'use client';

import { useEffect } from 'react';

/**
 * Loads third-party tracking scripts AFTER hydration to avoid blocking FCP.
 * Previously these were synchronous <script> tags in <head>.
 */
export function DeferredScripts() {
  useEffect(() => {
    // ReB2B Analytics — load after hydration
    if (!(window as any).reb2b) {
      (window as any).reb2b = { loaded: true };
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://ddwl4m2hdecbv.cloudfront.net/b/4O7Z0HE8RXNX/4O7Z0HE8RXNX.js.gz';
      document.body.appendChild(s);
    }

    // Apollo.io Tracking — load after hydration
    const n = Math.random().toString(36).substring(7);
    const o = document.createElement('script');
    o.src = `https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=${n}`;
    o.async = true;
    o.defer = true;
    o.onload = () => {
      (window as any).trackingFunctions?.onLoad?.({ appId: '698433f8b8d9480011c24307' });
    };
    document.body.appendChild(o);
  }, []);

  return null;
}
