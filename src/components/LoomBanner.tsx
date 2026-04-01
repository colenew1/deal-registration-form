'use client'

import { useState } from 'react'

const LOOM_URL = 'https://www.loom.com/share/ca0ce8b3401644b0ae55e4cd7c09ac2a'

export default function LoomBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        position: 'relative',
        animation: 'pulse-glow 2s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 2px 12px rgba(37, 99, 235, 0.3); }
          50% { box-shadow: 0 2px 20px rgba(124, 58, 237, 0.5); }
        }
        @keyframes bounce-arrow {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
      `}</style>

      <span style={{ fontSize: 18 }}>🎉</span>

      <a
        href={LOOM_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#ffffff',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>
          <strong>New Form!</strong>{' '}
          <span style={{ fontWeight: 400, opacity: 0.95 }}>
            Click here for a quick walkthrough video
          </span>
        </span>
        <span style={{ animation: 'bounce-arrow 1s ease-in-out infinite', display: 'inline-block' }}>→</span>
      </a>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  )
}
