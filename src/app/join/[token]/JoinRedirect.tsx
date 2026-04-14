'use client';

import { useEffect } from 'react';
import { joinTableAction } from './actions';

/**
 * Client component that auto-triggers the server action to set cookie and redirect.
 * Shows a brief loading state while the redirect happens.
 */
export default function JoinRedirect({ cookieData }: { cookieData: string }) {
  useEffect(() => {
    joinTableAction(cookieData);
  }, [cookieData]);

  return (
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>🍽️</div>
        <h1 style={{ fontSize: 20, marginBottom: 8, fontWeight: 600 }}>Masaya Yönlendiriliyorsunuz...</h1>
        <p style={{ color: '#6B6B6B', fontSize: 14 }}>Lütfen bekleyin</p>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
