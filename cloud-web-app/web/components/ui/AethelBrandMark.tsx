import React from 'react';

interface AethelBrandMarkProps {
  size?: number;
  className?: string;
  /** Animate: show a subtle scan-line sweep on mount/hover (default true) */
  animated?: boolean;
}

/**
 * Aethel Engine SVG Brand Mark — stylized "Æ" lettermark.
 *
 * Geometry:
 *   - Main "A" shape with sharp cyber diagonal strokes
 *   - "E" horizontal bars bleeding from the right leg
 *   - A bottom-right corner notch for the cyberpunk aesthetic
 *   - Apex cyan dot with radial glow
 *   - Scan-line sweep (optional CSS animation)
 */
export function AethelBrandMark({ size = 28, className = '', animated = true }: AethelBrandMarkProps) {
  const uid = React.useId().replace(/:/g, '-')
  const gradId  = `ae-grad-${uid}`
  const glowId  = `ae-glow-${uid}`
  const scanId  = `ae-scan-${uid}`
  const maskId  = `ae-mask-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Aethel Engine"
      role="img"
    >
      <defs>
        {/* Cyan → Indigo → Violet gradient — main fill */}
        <linearGradient id={gradId} x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="var(--aethel-brand-cyan)" />
          <stop offset="48%"  stopColor="var(--aethel-neon-indigo)" />
          <stop offset="100%" stopColor="var(--aethel-accent)" />
        </linearGradient>

        {/* Soft neon glow on the paths */}
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
          <feFlood floodColor="var(--aethel-brand-cyan)" floodOpacity="0.55" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Scan-line gradient — sweeps top→bottom */}
        <linearGradient id={scanId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--aethel-brand-cyan)" stopOpacity="0" />
          <stop offset="45%"  stopColor="var(--aethel-brand-cyan)" stopOpacity="0.18" />
          <stop offset="55%"  stopColor="var(--aethel-brand-cyan)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--aethel-brand-cyan)" stopOpacity="0" />
        </linearGradient>

        <clipPath id={maskId}>
          <rect x="0" y="0" width="32" height="32" rx="9" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${maskId})`}>
        {/* ── "Æ" Lettermark ── */}

        {/* Left diagonal stroke of A */}
        <path
          d="M3.5 27.5L13.6 4.8L15.8 9.2L8.2 27.5H3.5Z"
          fill={`url(#${gradId})`}
          filter={`url(#${glowId})`}
          fillOpacity="0.95"
        />
        {/* Right diagonal stroke of A */}
        <path
          d="M28.5 27.5L18.4 4.8L16.2 9.2L23.8 27.5H28.5Z"
          fill={`url(#${gradId})`}
          filter={`url(#${glowId})`}
          fillOpacity="0.95"
        />
        {/* Crossbar */}
        <path
          d="M9.2 20.5H22.8L21.4 23.5H10.6L9.2 20.5Z"
          fill={`url(#${gradId})`}
          filter={`url(#${glowId})`}
          fillOpacity="0.95"
        />
        {/* "E" top arm — horizontal bar from the A right leg */}
        <path
          d="M22.5 10H28.5V12H23.8L22.5 10Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.75"
        />
        {/* "E" mid arm */}
        <path
          d="M21.5 16H27V18H22.2L21.5 16Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.65"
        />

        {/* Apex accent dot */}
        <circle cx="16" cy="4.2" r="1.6" fill="var(--aethel-brand-cyan)" opacity="0.9" />
        <circle cx="16" cy="4.2" r="2.8" fill="var(--aethel-brand-cyan)" fillOpacity="0.18" />

        {/* Cyberpunk notch — bottom-right corner cutout */}
        <polygon points="32,26 26,32 32,32" fill="var(--aethel-overlay-ink)" />

        {/* Scan-line sweep — only rendered if animated */}
        {animated && (
          <rect
            x="0" y="-32" width="32" height="32"
            fill={`url(#${scanId})`}
            style={{
              animation: 'aeScanLine 3.6s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
        )}
      </g>

      {animated && (
        <style>{`
          @keyframes aeScanLine {
            0%   { transform: translateY(0px); opacity: 1; }
            70%  { transform: translateY(64px); opacity: 1; }
            71%  { opacity: 0; }
            100% { transform: translateY(0px); opacity: 0; }
          }
        `}</style>
      )}
    </svg>
  );
}

/** Compact version for tight spaces (mobile / status bar) */
export function AethelBrandMarkCompact({ size = 20, className = '' }: AethelBrandMarkProps) {
  return <AethelBrandMark size={size} className={className} animated={false} />;
}

export default AethelBrandMark;
