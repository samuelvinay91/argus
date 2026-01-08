'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#09090b',
        color: '#fafafa',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
          {/* Error Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          {/* Message */}
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
            Critical Error
          </h1>
          <p style={{ color: '#a1a1aa', marginBottom: '16px', lineHeight: '1.5' }}>
            A critical error occurred. We apologize for the inconvenience.
          </p>
          {error.digest && (
            <p style={{
              fontSize: '12px',
              color: '#71717a',
              fontFamily: 'monospace',
              backgroundColor: '#27272a',
              padding: '8px 12px',
              borderRadius: '4px',
              display: 'inline-block',
              marginBottom: '24px'
            }}>
              Error ID: {error.digest}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                backgroundColor: 'transparent',
                color: '#fafafa',
                border: '1px solid #3f3f46',
                padding: '10px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Go Home
            </a>
          </div>

          {/* Help */}
          <div style={{ borderTop: '1px solid #27272a', paddingTop: '24px' }}>
            <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '12px' }}>Need help?</p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://status.heyargus.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#a1a1aa', fontSize: '14px', textDecoration: 'none' }}
              >
                Status Page
              </a>
              <a
                href="mailto:support@heyargus.com"
                style={{ color: '#a1a1aa', fontSize: '14px', textDecoration: 'none' }}
              >
                support@heyargus.com
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
